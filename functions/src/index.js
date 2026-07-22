import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as functionsCompat from 'firebase-functions/v1';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { SalesforceBackend } from './services/SalesforceBackend.js';
import axios from 'axios';
import sharp from 'sharp';
// Initialize Firebase Admin once at top level
initializeApp();
// Set global region to Mumbai (asia-south1) to bypass us-central1 quota issues
setGlobalOptions({ region: 'asia-south1' });
export const debugGetThemes = onRequest({ invoker: 'public' }, async (req, res) => {
    try {
        const doc = await getFirestore().collection('settings').doc('celebration_themes').get();
        res.status(200).json(doc.exists ? doc.data() : { error: 'Not found' });
    }
    catch (err) {
        res.status(500).send(err.message);
    }
});
export const debugDeliveryStatus = onRequest({ invoker: 'public' }, async (req, res) => {
    try {
        const snap = await getFirestore().collection('whatsapp_delivery_status')
            .orderBy('createdAt', 'desc')
            .limit(30)
            .get();
        const statuses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.status(200).json(statuses);
    }
    catch (err) {
        res.status(500).send(err.message);
    }
});
/**
 * 🧪 MANUAL TRIGGER - run the daily wishes on demand for testing
 * Call: GET https://us-central1-church-mobile-app-b7e27.cloudfunctions.net/triggerDailyWishes
 */
export const triggerDailyWishes = onRequest({ invoker: 'public', timeoutSeconds: 300 }, async (req, res) => {
    try {
        await runDailyWishes();
        res.status(200).json({ success: true, message: 'Daily wishes triggered successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Lazy initialization helpers
let _db;
let _messaging;
let _sfBackend;
const getDb = () => _db || (_db = getFirestore());
const getMsg = () => _messaging || (_messaging = getMessaging());
const getSf = () => {
    if (!_sfBackend) {
        _sfBackend = new SalesforceBackend({
            consumerKey: process.env.SF_CONSUMER_KEY || '',
            username: process.env.SF_USERNAME || '',
            loginUrl: process.env.SF_LOGIN_URL || 'https://test.salesforce.com',
            privateKey: (process.env.SF_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        });
    }
    return _sfBackend;
};
/**
 * 📖 GET DAILY PROMISE
 */
export const getDailyPromise = onCall({ invoker: 'public' }, async (request) => {
    try {
        const promise = await getSf().getDailyPromise();
        return { success: true, data: promise };
    }
    catch (error) {
        console.error('getDailyPromise Error:', error);
        throw new HttpsError('internal', error.message);
    }
});
/**
 * 📅 GET UPCOMING EVENTS
 */
export const getUpcomingEvents = onCall({ invoker: 'public' }, async (request) => {
    try {
        const limit = request.data?.limit || 5;
        const events = await getSf().getUpcomingEvents(limit);
        return { success: true, data: events };
    }
    catch (error) {
        console.error('getUpcomingEvents Error:', error);
        throw new HttpsError('internal', error.message);
    }
});
/**
 * 🛡️ CHECK CONTACT EXISTS
 */
export const checkContactExists = onCall({ invoker: 'public' }, async (request) => {
    try {
        const phone = request.data?.phone;
        if (!phone) {
            throw new HttpsError('invalid-argument', 'Phone number is required');
        }
        const result = await getSf().checkContact(phone);
        return { success: true, ...result };
    }
    catch (error) {
        console.error('checkContactExists Error:', error);
        throw new HttpsError('internal', error.message);
    }
});
/**
 * 🔔 NOTIFY MEMBERS
 */
export const notifyMembers = onCall({ invoker: 'public' }, async (request) => {
    const { title, body, target, type, targetPhone } = request.data || {};
    if (!title || !body) {
        throw new HttpsError('invalid-argument', 'Missing title or body');
    }
    try {
        console.log(`🔔 Sending Notification: [${title}] to [${targetPhone || target || 'All'}]`);
        let tokens = [];
        if (targetPhone) {
            const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
            const snapshot = await getDb().collection('users').get();
            const tokenSet = new Set();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.fcmToken && data.phone) {
                    const userPhone = data.phone.replace(/[^0-9]/g, '');
                    if (userPhone.slice(-10) === cleanPhone.slice(-10)) {
                        tokenSet.add(data.fcmToken);
                    }
                }
            });
            tokens = Array.from(tokenSet);
        }
        else {
            let query = getDb().collection('users');
            if (target && target !== 'all') {
                query = query.where('cellGroup', '==', target);
            }
            const snapshot = await query.get();
            const tokenSet = new Set();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.fcmToken)
                    tokenSet.add(data.fcmToken);
            });
            tokens = Array.from(tokenSet);
        }
        if (tokens.length === 0) {
            return { success: true, message: 'No registered tokens found' };
        }
        const message = {
            notification: { title, body },
            data: { type: type || 'general' },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'max',
                    channelId: 'church_alerts'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            },
            tokens: tokens
        };
        const fcmResponse = await getMsg().sendEachForMulticast(message);
        console.log(`✅ Push Sent: ${fcmResponse.successCount} success, ${fcmResponse.failureCount} failed`);
        return { success: true, sent: fcmResponse.successCount, failed: fcmResponse.failureCount };
    }
    catch (error) {
        console.error('notifyMembers Error:', error);
        throw new HttpsError('internal', error.message);
    }
});
/**
 * ⏰ AUTOMATED DAILY PROMISE SCHEDULER
 * Scheduled to run every day at 07:00 AM IST (01:30 AM UTC)
 */
export const automatedDailyPromise = onSchedule({ schedule: '0 5 * * *', timeZone: 'Asia/Kolkata' }, async (event) => {
    try {
        console.log('⏰ Running automatedDailyPromise scheduler...');
        const db = getDb();
        // Check if enabled
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        const settings = settingsDoc.data();
        if (settings && settings.dailyPromise && settings.dailyPromise.enabled === false) {
            console.log('🛑 Daily Promise automation is disabled.');
            return;
        }
        const promise = await getSf().getDailyPromise();
        if (!promise) {
            console.log('⚠️ No daily promise found in Salesforce.');
            return;
        }
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const content = promise.Promises__c || promise.Promise_text_telugu__c || 'Grace and Peace be multiplied to you today.';
        // Pushed to broadcasts collection
        await db.collection('broadcasts').add({
            title: '📖 Today\'s Promise · ఈ రోజు వాగ్దానం',
            content: content,
            date: dateStr,
            type: 'announcement',
            silent: true,
            createdAt: FieldValue.serverTimestamp()
        });
        // Send push notification
        const snapshot = await db.collection('users').get();
        const tokenSet = new Set();
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken)
                tokenSet.add(data.fcmToken);
        });
        const tokens = Array.from(tokenSet);
        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: '📖 Daily Promise · ఈ రోజు వాగ్దానం',
                    body: content.slice(0, 100) + '...'
                },
                data: { type: 'general' },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        priority: 'max',
                        channelId: 'default'
                    }
                },
                apns: {
                    headers: {
                        'apns-priority': '10'
                    },
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                },
                tokens: tokens
            };
            await getMsg().sendEachForMulticast(message);
            console.log(`✅ Automated Daily Promise sent to ${tokens.length} members`);
        }
    }
    catch (error) {
        console.error('Error in automatedDailyPromise scheduler:', error);
    }
});
/**
 * ⏰ AUTOMATED DAILY BIRTHDAYS SCHEDULER
 * Scheduled to run every day at 08:00 AM IST (02:30 AM UTC)
 */
export const automatedDailyBirthdays = onSchedule({ schedule: '0 6 * * *', timeZone: 'Asia/Kolkata' }, async (event) => {
    try {
        console.log('⏰ Skipping automatedDailyBirthdays scheduler (delegated to 7 AM runDailyWishes)...');
        return;
        const db = getDb();
        // Check if enabled
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        const settings = settingsDoc.data();
        if (settings && settings.birthdayNotif && settings.birthdayNotif.enabled === false) {
            console.log('🛑 Birthday greetings automation is disabled.');
            return;
        }
        const bdays = await getSf().getTodayBirthdays();
        if (bdays.length === 0) {
            console.log('ℹ️ No birthdays celebrating today.');
            return;
        }
        const greetingTemplate = settings?.birthdayNotif?.greeting || 'Wishing you a very Happy Birthday! May God bless you abundantly and fulfill all your prayers today. 🎂🙏';
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        // Send push notifications
        const snapshot = await db.collection('users').get();
        const userMap = new Map(); // name/phone -> fcmToken
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken) {
                if (data.name)
                    userMap.set(data.name.toLowerCase(), data.fcmToken);
                if (data.phone)
                    userMap.set(data.phone.slice(-10), data.fcmToken);
            }
        });
        for (const member of bdays) {
            const personalGreeting = `Dear ${member.name}, ${greetingTemplate}`;
            // Save to broadcasts
            const docRef = await db.collection('broadcasts').add({
                title: `🎂 Happy Birthday, ${member.name}!`,
                content: personalGreeting,
                date: dateStr,
                type: 'birthday',
                silent: true,
                createdAt: FieldValue.serverTimestamp()
            });
            // Target individual user token if matches
            const token = userMap.get(member.name.toLowerCase()) || (member.phone ? userMap.get(member.phone.slice(-10)) : null);
            if (token) {
                const message = {
                    notification: {
                        title: `🎂 Happy Birthday, ${member.name}!`,
                        body: greetingTemplate
                    },
                    data: {
                        type: 'birthday',
                        id: docRef.id
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            sound: 'default',
                            priority: 'max',
                            channelId: 'default'
                        }
                    },
                    apns: {
                        headers: {
                            'apns-priority': '10'
                        },
                        payload: {
                            aps: {
                                sound: 'default',
                                badge: 1
                            }
                        }
                    },
                    token: token
                };
                await getMsg().send(message);
                console.log(`✅ Individual Birthday FCM sent to ${member.name}`);
            }
        }
    }
    catch (error) {
        console.error('Error in automatedDailyBirthdays scheduler:', error);
    }
});
/**
 * ⏰ AUTOMATED DAILY ANNIVERSARIES SCHEDULER
 * Scheduled to run every day at 08:30 AM IST (03:00 AM UTC)
 */
export const automatedDailyAnniversaries = onSchedule({ schedule: '30 6 * * *', timeZone: 'Asia/Kolkata' }, async (event) => {
    try {
        console.log('⏰ Skipping automatedDailyAnniversaries scheduler (delegated to 7 AM runDailyWishes)...');
        return;
        const db = getDb();
        // Check if enabled
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        const settings = settingsDoc.data();
        if (settings && settings.anniversaryNotif && settings.anniversaryNotif.enabled === false) {
            console.log('🛑 Anniversary greetings automation is disabled.');
            return;
        }
        const annivs = await getSf().getTodayAnniversaries();
        if (annivs.length === 0) {
            console.log('ℹ️ No wedding anniversaries celebrating today.');
            return;
        }
        const greetingTemplate = settings?.anniversaryNotif?.greeting || 'Wishing you a wonderful wedding anniversary! May God bless your home with love, joy, and peace. 💐💒';
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        // Send push notifications
        const snapshot = await db.collection('users').get();
        const userMap = new Map();
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken) {
                if (data.name)
                    userMap.set(data.name.toLowerCase(), data.fcmToken);
            }
        });
        for (const ann of annivs) {
            const coupleNames = `${ann.husband} & ${ann.wife}`;
            const personalGreeting = `Wishing Brother ${ann.husband} & Sister ${ann.wife} a wonderful ${ann.years}th Wedding Anniversary! ${greetingTemplate}`;
            // Save to broadcasts
            const docRef = await db.collection('broadcasts').add({
                title: `💐 Happy Wedding Anniversary!`,
                content: personalGreeting,
                date: dateStr,
                type: 'anniversary',
                silent: true,
                createdAt: FieldValue.serverTimestamp()
            });
            // Target spouses
            const husbandToken = userMap.get(ann.husband.toLowerCase());
            const wifeToken = userMap.get(ann.wife.toLowerCase());
            const targetTokens = [husbandToken, wifeToken].filter(Boolean);
            if (targetTokens.length > 0) {
                const message = {
                    notification: {
                        title: `💐 Happy Wedding Anniversary!`,
                        body: `Wishing you a wonderful anniversary! ${greetingTemplate}`
                    },
                    data: {
                        type: 'anniversary',
                        id: docRef.id
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            sound: 'default',
                            priority: 'max',
                            channelId: 'default'
                        }
                    },
                    apns: {
                        headers: {
                            'apns-priority': '10'
                        },
                        payload: {
                            aps: {
                                sound: 'default',
                                badge: 1
                            }
                        }
                    },
                    tokens: targetTokens
                };
                await getMsg().sendEachForMulticast(message);
                console.log(`✅ Anniversary FCM sent to ${coupleNames}`);
            }
        }
    }
    catch (error) {
        console.error('Error in automatedDailyAnniversaries scheduler:', error);
    }
});
// ─── Default monthly theme gradient colors (matches app's DEFAULT_MONTHLY_THEMES) ───
const DEFAULT_MONTHLY_THEME_COLORS = [
    ['#1E3A8A', '#3B82F6'], // Jan
    ['#BE185D', '#F472B6'], // Feb
    ['#047857', '#34D399'], // Mar
    ['#7C3AED', '#A78BFA'], // Apr
    ['#B45309', '#F59E0B'], // May
    ['#0369A1', '#38BDF8'], // Jun
    ['#0F766E', '#2DD4BF'], // Jul
    ['#854D0E', '#FACC15'], // Aug
    ['#374151', '#9CA3AF'], // Sep
    ['#BE9A3A', '#E7C767'], // Oct
    ['#C2410C', '#FB923C'], // Nov
    ['#991B1B', '#F87171'], // Dec
];
/**
 * Build the SVG icon path for the category (matches the app's getPreviewIcon exactly).
 * birthday  → Lucide Cake path
 * wedding   → Two interlocking circles (SVG rings)
 * baptism   → Orthodox cross (♰)
 */
function categoryIconSvg(category, cx, cy) {
    const ic = '#FDF1D6'; // icon color matches app's iconColor = "#FDF1D6"
    if (category === 'birthday') {
        // Lucide Cake icon paths (simplified), centered at (cx, cy)
        const tx = cx - 12;
        const ty = cy - 12;
        return `<g transform="translate(${tx},${ty}) scale(1.8)" fill="none" stroke="${ic}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <!-- base rectangle -->
      <rect x="2" y="11" width="20" height="10" rx="2" />
      <!-- candles -->
      <path d="M7 11V8" />
      <path d="M12 11V8" />
      <path d="M17 11V8" />
      <!-- flames -->
      <path d="M7 8 C7 6 9 6 9 8" />
      <path d="M12 8 C12 6 14 6 14 8" />
      <path d="M17 8 C17 6 19 6 19 8" />
      <!-- wave top of cake -->
      <path d="M2 15 Q5 13 8 15 Q11 17 14 15 Q17 13 20 15" stroke-width="1.2" />
    </g>`;
    }
    if (category === 'wedding') {
        // Two interlocking circles matching app's SVG rings
        return `<g fill="none" stroke="${ic}" stroke-width="3">
      <circle cx="${cx - 14}" cy="${cy}" r="18" />
      <circle cx="${cx + 14}" cy="${cy}" r="18" />
    </g>`;
    }
    // Baptism: standard cross ♰
    const x = cx;
    const y = cy;
    return `<g fill="none" stroke="${ic}" stroke-width="3.5" stroke-linecap="round">
    <!-- vertical bar -->
    <line x1="${x}" y1="${y - 22}" x2="${x}" y2="${y + 22}" />
    <!-- main crossbar -->
    <line x1="${x - 14}" y1="${y - 4}" x2="${x + 14}" y2="${y - 4}" />
  </g>`;
}
/**
 * Generate a greeting card matching the app's Preview Greeting design exactly.
 * Uses SVG path icons (no emoji), exact blessing text per category,
 * and solid month-theme background color.
 */
async function generateThemeCard(memberName, category, topColor, _bottomColor) {
    const W = 900;
    const H = 900;
    const R = 48;
    const subtitle = category === 'baptism' ? 'CELEBRATING YOUR' : 'WISHING YOU A';
    const title = category === 'birthday' ? 'HAPPY BIRTHDAY'
        : category === 'wedding' ? 'HAPPY ANNIVERSARY'
            : 'BAPTISM ANNIVERSARY';
    // Exact blessing text from app's renderPreview() — lines 925-936 of AdminCODCelebs.tsx
    const blessing = category === 'birthday'
        ? "May God's grace and blessings\nbe with you today and always!"
        : category === 'wedding'
            ? "Wishing you a lifetime of love,\njoy, and covenant peace!"
            : "Celebrating your walk in the\nlight and grace of Christ!";
    // Escape XML entities in member name
    const safeName = memberName
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    // Split blessing into two lines for tspan
    const blessingLines = blessing.split('\n');
    const blessingTspan = blessingLines
        .map((line, i) => `<tspan x="450" dy="${i === 0 ? '0' : '44'}" text-anchor="middle">${line.replace(/'/g, '&apos;')}</tspan>`)
        .join('');
    // Icon SVG centered at top of card
    const iconSvg = categoryIconSvg(category, 450, 130);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Card background with rounded corners -->
  <rect x="0" y="0" width="${W}" height="${H}" rx="${R}" ry="${R}" fill="${topColor}" />

  <!-- Inner border ring matching app -->
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="${R - 6}" ry="${R - 6}"
        fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1" />

  <!-- Category icon (SVG paths, no emoji) -->
  ${iconSvg}

  <!-- Subtitle: WISHING YOU A / CELEBRATING YOUR -->
  <text x="450" y="200"
        font-family="Helvetica Neue, Arial, sans-serif"
        font-size="26" font-weight="400" letter-spacing="6"
        fill="rgba(255,255,255,0.85)" text-anchor="middle">${subtitle}</text>

  <!-- Bold category title -->
  <text x="450" y="296"
        font-family="Helvetica Neue, Arial Black, sans-serif"
        font-size="68" font-weight="900" letter-spacing="2"
        fill="#E8D5A3" text-anchor="middle">${title}</text>

  <!-- Member name -->
  <text x="450" y="388"
        font-family="Helvetica Neue, Arial, sans-serif"
        font-size="46" font-weight="700"
        fill="#FFFFFF" text-anchor="middle">${safeName}</text>

  <!-- Divider line -->
  <line x1="300" y1="424" x2="600" y2="424" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />

  <!-- Blessing text (italic, matching app's gBlessing style) -->
  <text x="450" y="500"
        font-family="Georgia, Times New Roman, serif"
        font-size="32" font-style="italic" font-weight="400"
        fill="rgba(255,255,255,0.92)" text-anchor="middle">
    ${blessingTspan}
  </text>

  <!-- Divider line 2 -->
  <line x1="240" y1="600" x2="660" y2="600" stroke="rgba(255,255,255,0.22)" stroke-width="1" />

  <!-- Footer: Sent with love, CHURCH OF GOD -->
  <text x="450" y="652"
        font-family="Helvetica Neue, Arial, sans-serif"
        font-size="20" font-weight="400" letter-spacing="4"
        fill="rgba(255,255,255,0.65)" text-anchor="middle">SENT WITH LOVE, CHURCH OF GOD</text>
</svg>`;
    return sharp(Buffer.from(svg))
        .jpeg({ quality: 92 })
        .toBuffer();
}
/**
 * ⏰ AUTOMATED DAILY WHATSAPP CELEBRATIONS WISHES SCHEDULER
 * Runs every day at 08:00 PM IST (14:30 UTC)
 */
/**
 * Core logic: fetch today's celebrations and send WhatsApp wishes to each member.
 * Called by both the scheduler and the manual trigger HTTP endpoint.
 */
async function runDailyWishes() {
    try {
        console.log('⏰ Running runDailyWishes...');
        const token = process.env.WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_ID;
        if (!token || !phoneId) {
            console.error('🛑 WhatsApp credentials are not configured on the server.');
            return;
        }
        const sf = getSf();
        const birthdays = await sf.getTodayBirthdays().catch(() => []);
        const anniversaries = await sf.getTodayAnniversaries().catch(() => []);
        const baptisms = await sf.getTodayBaptisms().catch(() => []);
        console.log(`📊 Today's Celebrations - Birthdays: ${birthdays.length}, Anniversaries: ${anniversaries.length}, Baptisms: ${baptisms.length}`);
        if (birthdays.length === 0 && anniversaries.length === 0 && baptisms.length === 0) {
            console.log('ℹ️ No celebrations to wish today.');
            return;
        }
        const db = getDb();
        // Pre-load user FCM tokens for push notifications
        const snapshot = await db.collection('users').get();
        const userMap = new Map();
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken) {
                if (data.name)
                    userMap.set(data.name.toLowerCase(), data.fcmToken);
                if (data.phone)
                    userMap.set(data.phone.replace(/[^0-9]/g, '').slice(-10), data.fcmToken);
            }
        });
        // Load the current month's gradient colors from Firestore (with app defaults as fallback)
        const currentMonthIndex = new Date().getMonth(); // 0-11
        let themeTopColor = DEFAULT_MONTHLY_THEME_COLORS[currentMonthIndex][0];
        let themeBotColor = DEFAULT_MONTHLY_THEME_COLORS[currentMonthIndex][1];
        try {
            const themesDoc = await db.collection('settings').doc('celebration_themes').get();
            if (themesDoc.exists) {
                const themesData = themesDoc.data();
                const themeObj = themesData?.monthly?.[currentMonthIndex];
                if (themeObj?.colors?.[0])
                    themeTopColor = themeObj.colors[0];
                if (themeObj?.colors?.[1])
                    themeBotColor = themeObj.colors[1];
                // Also try 'c' key (same as app uses)
                if (themeObj?.c?.[0])
                    themeTopColor = themeObj.c[0];
                if (themeObj?.c?.[1])
                    themeBotColor = themeObj.c[1];
            }
        }
        catch (err) {
            console.error('Error loading current monthly theme, using defaults:', err);
        }
        console.log(`🎨 Using theme colors for month ${currentMonthIndex + 1}: ${themeTopColor} → ${themeBotColor}`);
        // Helper: upload a JPEG Buffer to WhatsApp media and return mediaId
        const uploadCardBuffer = async (buffer) => {
            try {
                const blob = new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' });
                const formData = new FormData();
                formData.append('messaging_product', 'whatsapp');
                formData.append('file', blob, 'card.jpg');
                const uploadUrl = `https://graph.facebook.com/v19.0/${phoneId}/media`;
                const uploadResponse = await axios.post(uploadUrl, formData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return uploadResponse.data.id;
            }
            catch (err) {
                console.error('Failed to upload card buffer:', err.response?.data || err.message);
                return null;
            }
        };
        // Helper: upload a Buffer to Firebase Storage and return public URL
        const uploadToFirebaseStorage = async (buffer, name) => {
            try {
                const bucket = getStorage().bucket('church-mobile-app-b7e27.appspot.com');
                const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_');
                const fileName = `whatsapp_media/auto_${Date.now()}_${cleanName}.jpg`;
                const file = bucket.file(fileName);
                await file.save(buffer, {
                    metadata: { contentType: 'image/jpeg' }
                });
                await file.makePublic();
                return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            }
            catch (err) {
                console.error('Failed to upload to Firebase Storage:', err.message);
                return null;
            }
        };
        // Helper to format phone number → WhatsApp-ready string (e.g. 91XXXXXXXXXX)
        const formatPhone = (phoneStr) => {
            if (!phoneStr)
                return null;
            const clean = phoneStr.replace(/\D/g, '');
            if (clean.length === 10)
                return '91' + clean;
            if (clean.length === 12 && clean.startsWith('91'))
                return clean;
            if (clean.length > 10)
                return clean;
            return null;
        };
        // Helper to send template wish using a pre-uploaded mediaId
        const sendWish = async (toPhone, mediaId, greeting, verseParam, memberName, imageUrl, category) => {
            try {
                const cleanParam = (str) => {
                    if (!str)
                        return ' ';
                    return str.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || ' ';
                };
                const cleanMsg = cleanParam(greeting);
                const cleanVerse = cleanParam(verseParam);
                const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
                const payload = {
                    messaging_product: 'whatsapp',
                    to: toPhone,
                    type: 'template',
                    template: {
                        name: 'cod_card',
                        language: { code: 'en' },
                        components: [
                            {
                                type: 'header',
                                parameters: [{ type: 'image', image: { id: mediaId } }]
                            },
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: cleanMsg.slice(0, 1024) },
                                    { type: 'text', text: cleanVerse.slice(0, 1024) }
                                ]
                            }
                        ]
                    }
                };
                const response = await axios.post(url, payload, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`✅ Automated WhatsApp wish sent to ${toPhone}:`, response.data?.messages?.[0]?.id);
                await db.collection('whatsapp_messages').add({
                    fromPhone: toPhone,
                    fromName: memberName,
                    text: `[Auto Template] ${cleanMsg}\n\n${cleanVerse}`,
                    timestamp: new Date(),
                    type: 'outgoing',
                    adminId: 'system',
                    adminName: 'Automated System',
                    conversationOwner: 'system',
                    sendMethod: 'Auto Sent',
                    imageUrl: imageUrl || null,
                    createdAt: FieldValue.serverTimestamp()
                });
                let broadcastTitle = `🎉 Happy ${category}!`;
                if (category === 'birthday')
                    broadcastTitle = `🎂 Happy Birthday, ${memberName}!`;
                if (category === 'anniversary')
                    broadcastTitle = `💐 Happy Wedding Anniversary!`;
                if (category === 'baptism')
                    broadcastTitle = `✝️ Happy Baptism Anniversary, ${memberName}!`;
                await db.collection('broadcasts').add({
                    title: broadcastTitle,
                    content: `${cleanMsg}\n\n${cleanVerse}`,
                    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                    type: category,
                    targetPhone: toPhone,
                    silent: true, // Prevent double-notification from onBroadcastCreated
                    createdAt: FieldValue.serverTimestamp()
                });
                // Target individual user token if matches
                const searchPhone = toPhone ? toPhone.replace(/[^0-9]/g, '').slice(-10) : '';
                const pushToken = userMap.get(memberName.toLowerCase()) || (searchPhone ? userMap.get(searchPhone) : null);
                if (pushToken) {
                    try {
                        await getMsg().send({
                            notification: {
                                title: broadcastTitle,
                                body: "Wishing you God's abundant blessings today! Tap to view your greeting."
                            },
                            data: { type: category },
                            android: {
                                priority: 'high',
                                notification: {
                                    sound: 'default',
                                    priority: 'max',
                                    channelId: 'church_alerts'
                                }
                            },
                            apns: {
                                headers: { 'apns-priority': '10' },
                                payload: { aps: { sound: 'default', badge: 1 } }
                            },
                            token: pushToken
                        });
                        console.log(`✅ Push banner sent for ${category} to ${memberName}`);
                    }
                    catch (e) {
                        console.warn(`⚠️ Failed to send push banner to ${memberName}:`, e.message);
                    }
                }
            }
            catch (error) {
                console.error(`❌ Failed to send automated WhatsApp wish to ${toPhone}:`, error.response?.data || error.message);
            }
        };
        // 📖 30 Tailored Telugu Scriptures for Birthday, Wedding, and Baptism rotations
        // Each member gets a UNIQUE verse — tracked with per-category counters
        const VERSES_TELUGU = {
            birthday: [
                { ref: 'సంఖ్యాకాండము 6:24', text: 'యెహోవా నిన్ను ఆశీర్వదించి నిన్ను కాపాడును.' },
                { ref: 'సంఖ్యాకాండము 6:25', text: 'యెహోవా తన ముఖకాంతిని నీ మీద ప్రకాశింపజేసి నీ మీద కృప చూపును.' },
                { ref: 'కీర్తన 118:24', text: 'ఈ దినము యెహోవా ఏర్పరచినది; దీనియందు మనము సంతోషించి ఆనందింతుము.' },
                { ref: 'సామెతలు 3:5', text: 'నీ పూర్ణహృదయముతో యెహోవాను నమ్ముకొనుము.' },
                { ref: 'సామెతలు 3:6', text: 'నీ మార్గములన్నిటిలో ఆయనను స్మరించుము; అప్పుడు ఆయన నీ త్రోవలను సరిచేయును.' },
                { ref: 'కీర్తన 37:4', text: 'యెహోవాలో ఆనందించుము; ఆయన నీ హృదయ వాంఛలను నెరవేర్చును.' },
                { ref: 'కీర్తన 37:5', text: 'నీ కార్యములన్నియు యెహోవాకు అప్పగించుము.' },
                { ref: 'కీర్తన 20:4', text: 'ఆయన నీ హృదయ కోరికలను నెరవేర్చును.' },
                { ref: 'కీర్తన 23:1', text: 'యెహోవా నా కాపరి; నాకు కొదువలేదు.' },
                { ref: 'కీర్తన 34:8', text: 'యెహోవా మేలైనవాడు; ఆయనను ఆశ్రయించువాడుధన్యుడు.' },
                { ref: 'నెహెమ్యా 8:10', text: 'యెహోవానందమే మీ బలము.' },
                { ref: 'యెషయా 41:10', text: 'భయపడకుము, నేను నీకు తోడై యున్నాను.' },
                { ref: 'యెషయా 41:10', text: 'నేను నిన్ను బలపరచెదను; నీకు సహాయము చేసెదను.' },
                { ref: 'ఫిలిప్పీయులకు 4:13', text: 'క్రీస్తు నన్ను బలపరచుచున్నందున నేను సమస్తమును చేయగలను.' },
                { ref: 'ఫిలిప్పీయులకు 4:19', text: 'నా దేవుడు మీ ప్రతి అవసరమును తీర్చును.' },
                { ref: 'యాకోబు 1:17', text: 'ప్రతి మంచి వరమును, ప్రతి పరిపూర్ణమైన దానమును పైనుండి వచ్చును.' },
                { ref: 'రోమీయులకు 15:13', text: 'ఆశ కలిగించు దేవుడు మిమ్మును సమస్త సంతోషముతోను సమాధానముతోను నింపును.' },
                { ref: 'యెహోషువ 1:9', text: 'ధైర్యముగా నుండుము; భయపడకుము.' },
                { ref: 'కీర్తన 145:13', text: 'యెహోవా తన వాగ్దానములన్నిటిలో నమ్మదగినవాడు.' },
                { ref: 'కీర్తన 103:5', text: 'ఆయన నీ యౌవనమును గ్రద్దవలె నూతనపరచును.' },
                { ref: '3 యోహాను 1:2', text: 'నీకు సమస్తమును క్షేమముగా ఉండునట్లు నేను ప్రార్థించుచున్నాను.' },
                { ref: 'నహూము 1:7', text: 'యెహోవా శరణాగతులకు ఆశ్రయము.' },
                { ref: '1 పేతురు 5:7', text: 'మీ చింతలన్నిటిని ఆయన మీద వేయుడి; ఆయన మీ సంగతి చింతించుచున్నాడు.' },
                { ref: 'కీర్తన 16:11', text: 'నీ సన్నిధిలో సంపూర్ణ సంతోషము కలదు.' },
                { ref: 'కీర్తన 121:8', text: 'యెహోవా నీ వెళ్లుటను రాకడను కాపాడును.' },
                { ref: 'కీర్తన 90:17', text: 'మన దేవుని దయ మన మీద ఉండును గాక.' },
                { ref: 'కీర్తన 27:1', text: 'యెహోవా నా వెలుగును నా రక్షణయు.' },
                { ref: 'విలాపవాక్యములు 3:22–23', text: 'యెహోవా కృపలు అంతము లేనివి; ఆయన కనికరములు ప్రతి ఉదయము నూతనములు.' },
                { ref: 'విలాపవాక్యములు 3:22', text: 'యెహోవా ప్రేమ ఎన్నటికీ నిలిచియుండును.' },
                { ref: 'ఎఫెసీయులకు 3:20', text: 'మనము అడుగుదానికంటెను ఊహించుదానికంటెను అత్యధికముగా చేయగలవాడు దేవుడు.' },
            ],
            wedding: [
                { ref: 'ఆదికాండము 2:24', text: 'కాబట్టి పురుషుడు తన తండ్రిని తన తల్లిని విడిచిపెట్టి తన భార్యను హత్తుకొనును; వారు ఒక శరీరముగా ఉండుదురు.' },
                { ref: 'ప్రసంగి 4:9', text: 'ఇద్దరు ఒక్కనికంటె మేలు; వారు తమ పరిశ్రమకు మంచి ఫలము పొందుదురు.' },
                { ref: 'ప్రసంగి 4:12', text: 'ముగ్గురితో పేనిన త్రాడు త్వరగా తెగిపోదు.' },
                { ref: 'మార్కు 10:9', text: 'దేవుడు జతపరచిన వారిని మనుష్యుడు వేరు చేయకూడదు.' },
                { ref: 'మత్తయి 19:6', text: 'వారు ఇక ఇద్దరు కాదు, ఒక శరీరము; కాబట్టి దేవుడు జతపరచిన వారిని మనుష్యుడు వేరు చేయకూడదు.' },
                { ref: 'ఎఫెసీయులకు 5:2', text: 'క్రీస్తు మిమ్మును ప్రేమించినట్లు ప్రేమలో నడుచుకొనుడి.' },
                { ref: 'ఎఫెసీయులకు 5:25', text: 'భర్తలారా, క్రీస్తు సంఘమును ప్రేమించినట్లు మీ భార్యలను ప్రేమించుడి.' },
                { ref: 'ఎఫెసీయులకు 5:33', text: 'మీలో ప్రతి వాడు తన భార్యను తనను ప్రేమించినట్లు ప్రేమించవలెను; భార్య తన భర్తను గౌరవించవలెను.' },
                { ref: 'కొలస్సయులకు 3:14', text: 'వీటన్నిటికంటె ప్రేమను ధరించుకొనుడి; అది పరిపూర్ణతకు బంధము.' },
                { ref: 'కొలస్సయులకు 3:15', text: 'క్రీస్తు సమాధానము మీ హృదయములలో ఏలుచుండనియ్యుడి.' },
                { ref: '1 కొరింథీయులకు 13:4', text: 'ప్రేమ దీర్ఘశాంతము కలిగి దయగలదై యుండును.' },
                { ref: '1 కొరింథీయులకు 13:7', text: 'ప్రేమ అన్నిటిని భరించును, అన్నిటిని నమ్మును, అన్నిటిని నిరీక్షించును, అన్నిటిని సహించును.' },
                { ref: '1 కొరింథీయులకు 13:8', text: 'ప్రేమ ఎన్నటికిని తరుగదు.' },
                { ref: '1 పేతురు 4:8', text: 'ప్రేమ అనేక పాపములను కప్పివేయును.' },
                { ref: '1 యోహాను 4:7', text: 'ప్రియులారా, మనము ఒకరినొకరు ప్రేమించుకొందము; ప్రేమ దేవునివలన కలుగును.' },
                { ref: '1 యోహాను 4:12', text: 'మనము ఒకరినొకరు ప్రేమించుకొనినయెడల దేవుడు మనలో నివసించును.' },
                { ref: 'రోమీయులకు 12:10', text: 'సహోదర ప్రేమలో ఒకరియెడల ఒకరు అనురాగము కలిగి ఉండుడి.' },
                { ref: 'రోమీయులకు 15:5', text: 'దేవుడు మీకు ఒకే మనస్సును అనుగ్రహించును గాక.' },
                { ref: 'ఫిలిప్పీయులకు 2:2', text: 'ఒకే ప్రేమగలవారై, ఒకే మనస్సుతో ఉండుడి.' },
                { ref: 'ఫిలిప్పీయులకు 4:7', text: 'దేవుని సమాధానము మీ హృదయములను కాపాడును.' },
                { ref: 'గలతీయులకు 5:22–23', text: 'ఆత్మ ఫలము ప్రేమ, సంతోషము, సమాధానము, దీర్ఘశాంతము, దయ, మంచితనము, విశ్వాసము, సాత్వికము, ఆశానిగ్రహము.' },
                { ref: 'సామెతలు 3:3', text: 'కృపాసత్యములు నిన్ను విడువకుండునట్లు వాటిని నీ హృదయముమీద వ్రాసికొనుము.' },
                { ref: 'సామెతలు 17:17', text: 'స్నేహితుడు అన్ని కాలములందును ప్రేమించును.' },
                { ref: 'సామెతలు 18:22', text: 'భార్యను పొందినవాడు మేలైనదానిని పొందెను; యెహోవా అనుగ్రహము పొందెను.' },
                { ref: 'సామెతలు 31:10', text: 'గుణవతియైన భార్య అమూల్యమైనది.' },
                { ref: 'కీర్తనలు 127:1', text: 'యెహోవా ఇల్లు కట్టకపోతే కట్టువారి శ్రమ వ్యర్థము.' },
                { ref: 'కీర్తనలు 128:1', text: 'యెహోవాయందు భయభక్తులు కలిగి ఆయన మార్గములందు నడుచువారందరు ధన్యులు.' },
                { ref: 'కీర్తనలు 133:1', text: 'సహోదరులు ఐక్యముగా నివసించుట ఎంత మేలైనది!' },
                { ref: 'సంఖ్యాకాండము 6:24–26', text: 'యెహోవా నిన్ను ఆశీర్వదించి నిన్ను కాపాడును గాక... తన సమాధానమును నీకు అనుగ్రహించును గాక.' },
                { ref: 'యోహాను 15:12', text: 'నేను మిమ్మును ప్రేమించినట్లు మీరు ఒకరినొకరు ప్రేమించుకొనుడి.' },
            ],
            baptism: [
                { ref: 'మత్తయి 28:19', text: 'కాబట్టి మీరు వెళ్లి సమస్త జనులను శిష్యులనుగా చేయుడి; వారికి తండ్రి, కుమారుడు, పరిశుద్ధాత్మ నామమున బాప్తిస్మమిచ్చుడి.' },
                { ref: 'మార్కు 16:16', text: 'విశ్వసించి బాప్తిస్మము పొందినవాడు రక్షింపబడును; విశ్వసింపనివాడు శిక్షింపబడును.' },
                { ref: 'అపొస్తలుల కార్యములు 2:38', text: 'మీరు మనస్సు మార్చుకొని, మీ పాపముల క్షమాపణ కొరకు యేసుక్రీస్తు నామమున బాప్తిస్మము పొందుడి; అప్పుడు పరిశుద్ధాత్మ వరమును పొందుదురు.' },
                { ref: 'అపొస్తలుల కార్యములు 2:41', text: 'ఆయన మాటను ఆనందముగా అంగీకరించినవారు బాప్తిస్మము పొందిరి.' },
                { ref: 'అపొస్తలుల కార్యములు 8:36', text: 'ఇదిగో నీరు ఉంది; నేను బాప్తిస్మము పొందుటకు ఏమి ఆటంకము?' },
                { ref: 'అపొస్తలుల కార్యములు 8:38', text: 'వారు నీళ్లలోకి దిగిరి; ఫిలిప్పు అతనికి బాప్తిస్మము ఇచ్చెను.' },
                { ref: 'అపొస్తలుల కార్యములు 10:47', text: 'పరిశుద్ధాత్మను పొందిన వీరికి బాప్తిస్మము ఇవ్వకుండా ఎవడు అడ్డగించగలడు?' },
                { ref: 'అపొస్తలుల కార్యములు 22:16', text: 'లేచి బాప్తిస్మము పొంది, ఆయన నామమును ప్రార్థించుచు నీ పాపములను కడుగుకొనుము.' },
                { ref: 'రోమీయులకు 6:3', text: 'క్రీస్తుయేసునందు బాప్తిస్మము పొందిన మనమందరము ఆయన మరణములో బాప్తిస్మము పొందినవారమని మీకు తెలియదా?' },
                { ref: 'రోమీయులకు 6:4', text: 'క్రీస్తు లేపబడినట్లే మనమును నూతన జీవితములో నడుచుకొనుటకై బాప్తిస్మము ద్వారా ఆయనతో కూడ సమాధి చేయబడితిమి.' },
                { ref: 'రోమీయులకు 6:11', text: 'మీరు పాపమునకు చనిపోయినవారై, క్రీస్తుయేసునందు దేవునికి బ్రతికియున్నవారమని ఎంచుకొనుడి.' },
                { ref: '2 కొరింథీయులకు 5:17', text: 'ఎవడైనను క్రీస్తునందు ఉన్నయెడల అతడు నూతన సృష్టి; పాతవి గతించెను, ఇదిగో సమస్తము క్రొత్తవాయెను.' },
                { ref: 'గలతీయులకు 3:26', text: 'మీరు అందరూ క్రీస్తుయేసునందు విశ్వాసమువలన దేవుని కుమారులై యున్నారు.' },
                { ref: 'గలతీయులకు 3:27', text: 'క్రీస్తునందు బాప్తిస్మము పొందిన మీరందరూ క్రీస్తునుధరించుకొనియున్నారు.' },
                { ref: 'ఎఫెసీయులకు 4:5', text: 'ఒక ప్రభువు, ఒక విశ్వాసము, ఒక బాప్తిస్మము.' },
                { ref: 'కొలస్సయులకు 2:12', text: 'బాప్తిస్మములో ఆయనతో కూడ సమాధి చేయబడి, దేవుని శక్తిని విశ్వసించినందున ఆయనతో కూడ లేపబడితిరి.' },
                { ref: 'తీతుకు 3:5', text: 'ఆయన తన కృపచేత పునర్జన్మస్నానమువలనను పరిశుద్ధాత్మ నూతనీకరణమువలనను మనలను రక్షించెను.' },
                { ref: '1 పేతురు 3:21', text: 'బాప్తిస్మము ఇప్పుడు మిమ్మును రక్షించుచున్నది.' },
                { ref: 'యోహాను 3:5', text: 'నీరు మరియు ఆత్మవలన జన్మించని వాడు దేవుని రాజ్యములో ప్రవేశింపలేడు.' },
                { ref: 'యోహాను 3:16', text: 'దేవుడు లోకమును ఎంతో ప్రేమజేశాడు గనుక తన అద్వితీయ కుమారుని అనుగ్రహించెను.' },
                { ref: 'యోహాను 1:12', text: 'ఆయనను అంగీకరించిన వారికి దేవుని పిల్లలగుటకు అధికారము ఇచ్చెను.' },
                { ref: '1 యోహాను 1:7', text: 'ఆయన కుమారుడైన యేసు రక్తము మనలను సమస్త పాపములనుండి శుద్ధి చేయును.' },
                { ref: 'హెబ్రీయులకు 10:22', text: 'శుద్ధమైన హృదయముతో విశ్వాసపూర్ణత కలిగి దేవుని సమీపించుదము.' },
                { ref: 'ఫిలిప్పీయులకు 1:6', text: 'మీలో మంచి కార్యమును ప్రారంభించినవాడు దానిని సంపూర్ణము చేయును.' },
                { ref: 'ఫిలిప్పీయులకు 3:14', text: 'దేవుని ఉన్నతమైన పిలుపు బహుమానము కొరకు లక్ష్యమువైపు పరుగెత్తుచున్నాను.' },
                { ref: 'యాకోబు 1:22', text: 'వాక్యము వినుвариగానే కాక దాని ప్రకారము చేయువారుగా ఉండుడి.' },
                { ref: 'కీర్తనలు 119:105', text: 'నీ వాక్యము నా పాదములకు దీపమును, నా మార్గమునకు వెలుగును.' },
                { ref: 'యెహెజ్కేలు 36:26', text: 'మీకు క్రొత్త హృదయమును ఇచ్చి, క్రొత్త ఆత్మను మీలో ఉంచెదను.' },
                { ref: 'యెషయా 43:1', text: 'నేను నిన్ను విమోచించితిని; పేరుపెట్టి నిన్ను పిలిచితిని; నీవు నావాడవు.' },
                { ref: '2 తిమోతికి 1:9', text: 'ఆయన మనలను రక్షించి పరిశుద్ధమైన పిలుపుతో పిలిచెను.' },
            ]
        };
        // Verse counters — use day of the year so verses rotate globally every day
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        let bdayVerseIdx = dayOfYear;
        let weddingVerseIdx = dayOfYear;
        let baptismVerseIdx = dayOfYear;
        // --- 1. BIRTHDAYS ---
        console.log(`🎂 Processing ${birthdays.length} birthday(s)...`);
        for (let i = 0; i < birthdays.length; i++) {
            const member = birthdays[i];
            const phone = formatPhone(member.phone);
            if (!phone) {
                console.warn(`⚠️ Birthday: No valid phone for ${member.name} (raw: ${member.phone}), skipping.`);
                continue;
            }
            // Generate personalized theme card for this member
            const cardBuffer = await generateThemeCard(member.name, 'birthday', themeTopColor, themeBotColor);
            const mediaId = await uploadCardBuffer(cardBuffer);
            if (!mediaId) {
                console.warn(`⚠️ Birthday: Could not upload card for ${member.name}, skipping.`);
                continue;
            }
            const greeting = `Dear ${member.name},\n\n🎉 *జన్మదిన శుభాకాంక్షలు!* 🎂\n\nఈ ప్రత్యేకమైన రోజున దేవుని అపారమైన ప్రేమ, కృప, ఆశీర్వాదాలు మీ జీవితమంతా నింపుగాక. ఆయనే మీకు మంచి ఆరోగ్యం, ఆనందం, సమాధానం, దీర్ఘాయుష్షు అనుగ్రహించి, ప్రతి అడుగులోను తన చిత్తానుసారంగా నడిపించుగాక.\n\n*మీకు హృదయపూర్వక జన్మదిన శుభాకాంక్షలు!* 🎉🎂💐`;
            const verseObj = VERSES_TELUGU.birthday[bdayVerseIdx % VERSES_TELUGU.birthday.length];
            bdayVerseIdx++;
            const verseStr = `"${verseObj.text}" - ${verseObj.ref}`;
            const fbImageUrl = await uploadToFirebaseStorage(cardBuffer, member.name);
            console.log(`📤 Sending birthday wish to ${member.name} (${phone})...`);
            await sendWish(phone, mediaId, greeting, verseStr, member.name, fbImageUrl, 'birthday');
        }
        // --- 2. WEDDING ANNIVERSARIES ---
        console.log(`💍 Processing ${anniversaries.length} wedding anniversary(ies)...`);
        for (let i = 0; i < anniversaries.length; i++) {
            const ann = anniversaries[i];
            let greetingName = '';
            let cardName = '';
            if (ann.husband && ann.wife && ann.husband !== 'Spouse' && ann.wife !== 'Spouse') {
                greetingName = `Brother ${ann.husband} & Sister ${ann.wife}`;
                cardName = `${ann.husband} & ${ann.wife}`;
            }
            else if (ann.husband && ann.husband !== 'Spouse') {
                greetingName = `Brother ${ann.husband}`;
                cardName = `${ann.husband}`;
            }
            else if (ann.wife && ann.wife !== 'Spouse') {
                greetingName = `Sister ${ann.wife}`;
                cardName = `${ann.wife}`;
            }
            const greeting = `Dear ${greetingName},\n\n💍 *వివాహ వార్షికోత్సవ శుభాకాంక్షలు!* 💐\n\nదేవుడు మిమ్మల్ని ప్రేమ, ఆనందం, సమాధానం మరియు ఐక్యతతో ఎల్లప్పుడూ ఆశీర్వదించుగాక. మీ దాంపత్య జీవితం ఆయన కృపతో మరింత బలపడి, సంతోషం, ఆరోగ్యం, సమృద్ధితో నిండియుండుగాక.\n\n*మీ ఇద్దరికీ హృదయపూర్వక వివాహ వార్షికోత్సవ శుభాకాంక్షలు!* ❤️🎉`;
            const verseObj = VERSES_TELUGU.wedding[weddingVerseIdx % VERSES_TELUGU.wedding.length];
            weddingVerseIdx++;
            const verseStr = `"${verseObj.text}" - ${verseObj.ref}`;
            // Generate a shared card for this couple (using formatted name as title)
            const coupleCardBuffer = await generateThemeCard(cardName, 'wedding', themeTopColor, themeBotColor);
            const coupleMediaId = await uploadCardBuffer(coupleCardBuffer);
            const fbImageUrl = await uploadToFirebaseStorage(coupleCardBuffer, cardName);
            // Send to husband using phone from Salesforce directly
            const husbandPhone = formatPhone(ann.husbandPhone);
            if (husbandPhone && coupleMediaId) {
                console.log(`📤 Sending anniversary wish to ${ann.husband} (${husbandPhone})...`);
                await sendWish(husbandPhone, coupleMediaId, greeting, verseStr, ann.husband, fbImageUrl, 'anniversary');
            }
            else {
                console.warn(`⚠️ Anniversary: No valid phone for husband ${ann.husband} (raw: ${ann.husbandPhone})`);
            }
            // Send to wife using phone from Salesforce directly
            const wifePhone = formatPhone(ann.wifePhone);
            if (wifePhone && coupleMediaId) {
                console.log(`📤 Sending anniversary wish to ${ann.wife} (${wifePhone})...`);
                await sendWish(wifePhone, coupleMediaId, greeting, verseStr, ann.wife, fbImageUrl, 'anniversary');
            }
            else {
                console.warn(`⚠️ Anniversary: No valid phone for wife ${ann.wife} (raw: ${ann.wifePhone})`);
            }
        }
        // --- 3. BAPTISM ANNIVERSARIES ---
        console.log(`✝️ Processing ${baptisms.length} baptism anniversary(ies)...`);
        for (let i = 0; i < baptisms.length; i++) {
            const member = baptisms[i];
            const phone = formatPhone(member.phone);
            if (!phone) {
                console.warn(`⚠️ Baptism: No valid phone for ${member.name} (raw: ${member.phone}), skipping.`);
                continue;
            }
            let years = 1;
            if (member.baptismDate) {
                const parts = member.baptismDate.split('-');
                if (parts.length > 0) {
                    const bapYear = parseInt(parts[0], 10);
                    years = new Date().getFullYear() - bapYear;
                }
            }
            if (isNaN(years) || years <= 0)
                years = 1;
            // Generate personalized theme card for this member
            const cardBuffer = await generateThemeCard(member.name, 'baptism', themeTopColor, themeBotColor);
            const mediaId = await uploadCardBuffer(cardBuffer);
            if (!mediaId) {
                console.warn(`⚠️ Baptism: Could not upload card for ${member.name}, skipping.`);
                continue;
            }
            const greeting = `Dear ${member.name},\n\n💧 *బాప్తిస్మ వార్షికోత్సవ శుభాకాంక్షలు!* ✝️\n\nప్రభువైన యేసుక్రీస్తునందు మీరు తీసుకున్న విశ్వాస నిర్ణయాన్ని ఈ ప్రత్యేకమైన రోజున ఆనందంతో జ్ఞాపకం చేసుకుంటూ, దేవుని కృప, ప్రేమ, సమాధానం మీ జీవితంలో సమృద్ధిగా ఉండుగాక. ఆయన మిమ్మల్ని తన చిత్తానుసారంగా నడిపించి, ఆత్మీయంగా మరింత వృద్ధి చెందేలా ఆశీర్వదించుగాక.\n\n*మీకు హృదయపూర్వక బాప్తిస్మ వార్షికోత్సవ శుభాకాంక్షలు!* 💙🙏`;
            const verseObj = VERSES_TELUGU.baptism[baptismVerseIdx % VERSES_TELUGU.baptism.length];
            baptismVerseIdx++;
            const verseStr = `"${verseObj.text}" - ${verseObj.ref}`;
            const fbImageUrl = await uploadToFirebaseStorage(cardBuffer, member.name);
            console.log(`📤 Sending baptism wish to ${member.name} (${phone})...`);
            await sendWish(phone, mediaId, greeting, verseStr, member.name, fbImageUrl, 'baptism');
        }
    }
    catch (error) {
        console.error('Error in runDailyWishes:', error);
    }
}
/**
 * ⏰ AUTOMATED DAILY WHATSAPP CELEBRATIONS WISHES SCHEDULER
 * Runs every day at 07:00 AM IST
 */
export const automatedDailyWhatsAppWishes = onSchedule({ schedule: '0 7 * * *', timeZone: 'Asia/Kolkata' }, async (event) => {
    await runDailyWishes();
});
/**
 * 📣 ON BROADCAST CREATED TRIGGER (Gen 1 to bypass Eventarc permission issues)
 * Automatically sends push notifications when a new broadcast is added to Firestore (e.g. Emergency Meeting or custom admin updates)
 */
export const onBroadcastCreated = functionsCompat.firestore
    .document('broadcasts/{broadcastId}')
    .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    if (!data) {
        console.log('No data associated with the event');
        return;
    }
    // Skip if silent/already handled by scheduler
    if (data.silent === true) {
        console.log(`🛑 Skipping broadcast push for silent document: ${context.params.broadcastId}`);
        return;
    }
    const title = data.title || 'Church Update';
    const body = data.content || '';
    const type = data.type || 'general';
    console.log(`🔔 onBroadcastCreated (Gen 1) fired for: [${title}] type: [${type}]`);
    try {
        const db = getDb();
        let query = db.collection('users');
        // Filter by target phone number if provided (for individual greetings)
        if (data.targetPhone) {
            const rawDigits = data.targetPhone.replace(/\D/g, '');
            const last10 = rawDigits.slice(-10);
            query = query.where('phone', '>=', last10).where('phone', '<=', last10 + '\uf8ff');
        }
        const snapshotUsers = await query.get();
        const tokenSet = new Set();
        snapshotUsers.forEach((doc) => {
            const uData = doc.data();
            // If targetPhone is provided, we do a stricter match since Firestore where clauses on strings can be imprecise
            if (data.targetPhone && uData.phone) {
                const rawDigits = data.targetPhone.replace(/\D/g, '');
                const last10 = rawDigits.slice(-10);
                if (!uData.phone.includes(last10))
                    return;
            }
            if (uData.fcmToken)
                tokenSet.add(uData.fcmToken);
        });
        const tokens = Array.from(tokenSet);
        if (tokens.length === 0) {
            console.log('🛑 No registered FCM tokens found.');
            return;
        }
        const message = {
            notification: {
                title,
                body: body.length > 200 ? body.substring(0, 197) + '...' : body
            },
            data: {
                type,
                id: context.params.broadcastId
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'max',
                    channelId: 'default'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            },
            tokens: tokens
        };
        const response = await getMsg().sendEachForMulticast(message);
        console.log(`✅ Broadcast push delivered: ${response.successCount} success, ${response.failureCount} failed.`);
    }
    catch (error) {
        console.error('Error sending broadcast push:', error);
    }
});
/**
 * 📤 UPLOAD EVENT IMAGE
 */
export const uploadEventImage = onCall({ invoker: 'public' }, async (request) => {
    try {
        const base64Data = request.data?.image;
        const fileName = request.data?.fileName || `img_${Date.now()}.jpg`;
        if (!base64Data) {
            throw new HttpsError('invalid-argument', 'Image data is required');
        }
        const bucket = getStorage().bucket('church-mobile-app-b7e27-event-banners');
        const file = bucket.file(`events/${fileName}`);
        await file.save(Buffer.from(base64Data, 'base64'), {
            metadata: {
                contentType: 'image/jpeg',
            }
        });
        // Make the file publicly accessible
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        return { success: true, url: publicUrl };
    }
    catch (error) {
        console.error('uploadEventImage Error:', error);
        throw new HttpsError('internal', error.message);
    }
});
/**
 * Helper to fetch a URL using global fetch (Node 18+)
 */
async function fetchPage(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    });
    return res.text();
}
/**
 * ⏰ YOUTUBE LIVE CHECK SCHEDULER
 * Runs every 5 minutes to check if YouTube channel is live
 */
export const checkYouTubeLive = onSchedule('*/5 * * * *', async (event) => {
    try {
        console.log('⏰ Checking YouTube Live status...');
        const url = 'https://www.youtube.com/@Brothersinchristfellowship/live';
        const html = await fetchPage(url).catch(() => '');
        // Check if the stream is live
        const isLive = html.includes('"isLive":true') || html.includes('LIVE_STREAM') || html.includes('"style":"LIVE"');
        // Try to find the videoId
        let videoId;
        const match = html.match(/"liveStreamability".*?"videoId":"([^"]+)"/) || html.match(/"videoRenderer".*?"videoId":"([^"]+)"/);
        if (match && match[1]) {
            videoId = match[1];
        }
        const liveUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
        const db = getDb();
        const liveRef = db.collection('settings').doc('youtube_live');
        const liveSnap = await liveRef.get();
        const prevState = liveSnap.exists ? liveSnap.data() : { isLive: false };
        // Save new state
        await liveRef.set({
            isLive,
            url: liveUrl,
            videoId: videoId || '',
            lastChecked: FieldValue.serverTimestamp()
        }, { merge: true });
        // State transition: was offline, now live!
        if (isLive && !prevState?.isLive) {
            console.log('🚨 YouTube Live Stream detected! Sending notifications...');
            // 1. Add to broadcasts
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
            const docRef = await db.collection('broadcasts').add({
                title: '🎥 YouTube Live Stream Started!',
                content: 'Brothers in Christ Fellowship is now LIVE on YouTube. Click to join the stream and worship with us! 🎥🙏',
                date: dateStr,
                type: 'youtube_live',
                url: liveUrl,
                silent: true, // skip standard Gen1 trigger so we can send customized push
                createdAt: FieldValue.serverTimestamp()
            });
            // 2. Fetch all user tokens
            const snapshotUsers = await db.collection('users').get();
            const tokenSet = new Set();
            snapshotUsers.forEach((doc) => {
                const uData = doc.data();
                if (uData.fcmToken)
                    tokenSet.add(uData.fcmToken);
            });
            const tokens = Array.from(tokenSet);
            if (tokens.length > 0) {
                const message = {
                    notification: {
                        title: '🚨 We are Live on YouTube!',
                        body: 'Join the Brothers in Christ Fellowship live stream now! 🎥🙏'
                    },
                    data: {
                        type: 'youtube_live',
                        url: liveUrl,
                        id: docRef.id
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            sound: 'default',
                            priority: 'max',
                            channelId: 'default'
                        }
                    },
                    apns: {
                        headers: {
                            'apns-priority': '10'
                        },
                        payload: {
                            aps: {
                                sound: 'default',
                                badge: 1
                            }
                        }
                    },
                    tokens: tokens
                };
                const response = await getMsg().sendEachForMulticast(message);
                console.log(`✅ YouTube Live push delivered: ${response.successCount} success, ${response.failureCount} failed.`);
            }
        }
    }
    catch (error) {
        console.error('Error in checkYouTubeLive scheduler:', error);
    }
});
/**
 * 📢 TRIGGER TEST YOUTUBE LIVE NOTIFICATION
 */
export const triggerTestYouTubeLive = onCall({ invoker: 'public' }, async (request) => {
    try {
        const liveUrl = request.data?.url || 'https://www.youtube.com/@Brothersinchristfellowship/live';
        const db = getDb();
        // Save to Firestore first
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const docRef = await db.collection('broadcasts').add({
            title: '🎥 YouTube Live Stream Started!',
            content: 'Brothers in Christ Fellowship is now LIVE on YouTube. Click to join the stream and worship with us! 🎥🙏',
            date: dateStr,
            type: 'youtube_live',
            url: liveUrl,
            silent: true,
            createdAt: FieldValue.serverTimestamp()
        });
        const snapshotUsers = await db.collection('users').get();
        const tokenSet = new Set();
        snapshotUsers.forEach((doc) => {
            const uData = doc.data();
            if (uData.fcmToken)
                tokenSet.add(uData.fcmToken);
        });
        const tokens = Array.from(tokenSet);
        if (tokens.length === 0) {
            return { success: false, message: 'No registered user tokens found' };
        }
        const message = {
            notification: {
                title: '🚨 We are Live on YouTube!',
                body: 'Join the Brothers in Christ Fellowship live stream now! 🎥🙏'
            },
            data: {
                type: 'youtube_live',
                url: liveUrl,
                id: docRef.id
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'max',
                    channelId: 'church_alerts'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            },
            tokens: tokens
        };
        const response = await getMsg().sendEachForMulticast(message);
        return { success: true, sent: response.successCount, failed: response.failureCount, broadcastId: docRef.id };
    }
    catch (error) {
        console.error('triggerTestYouTubeLive Error:', error);
        throw new HttpsError('internal', error.message);
    }
});
export * from './whatsapp.js';
//# sourceMappingURL=index.js.map