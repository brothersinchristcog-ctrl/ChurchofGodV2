import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functionsCompat from 'firebase-functions/v1';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { SalesforceBackend } from './services/SalesforceBackend.js';


// Initialize Firebase Admin once at top level
initializeApp();

// Lazy initialization helpers
let _db: any;
let _messaging: any;
let _sfBackend: SalesforceBackend;

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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('checkContactExists Error:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * 🔔 NOTIFY MEMBERS
 */
export const notifyMembers = onRequest(async (request, response) => {
  const { title, body, target, type } = request.body;
  if (!title || !body) {
    response.status(400).send({ success: false, error: 'Missing title or body' });
    return;
  }

  try {
    console.log(`🔔 Sending Notification: [${title}] to [${target || 'All'}]`);
    let query: any = getDb().collection('users');
    if (target && target !== 'all') {
      query = query.where('cellGroup', '==', target);
    }

    const snapshot = await query.get();
    const tokenSet = new Set<string>();
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.fcmToken) tokenSet.add(data.fcmToken);
    });

    const tokens = Array.from(tokenSet);
    if (tokens.length === 0) {
      response.status(200).send({ success: true, message: 'No registered tokens found' });
      return;
    }

    const message = {
      notification: { title, body },
      data: { type: type || 'general' },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          priority: 'max' as const,
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
    response.status(200).send({ 
      success: true, sent: fcmResponse.successCount, failed: fcmResponse.failureCount 
    });
  } catch (error: any) {
    console.error('notifyMembers Error:', error);
    response.status(500).send({ success: false, error: error.message });
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
    const tokenSet = new Set<string>();
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.fcmToken) tokenSet.add(data.fcmToken);
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
          priority: 'high' as const,
          notification: {
            sound: 'default',
            priority: 'max' as const,
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
      await getMsg().sendEachForMulticast(message);
      console.log(`✅ Automated Daily Promise sent to ${tokens.length} members`);
    }
  } catch (error) {
    console.error('Error in automatedDailyPromise scheduler:', error);
  }
});

/**
 * ⏰ AUTOMATED DAILY BIRTHDAYS SCHEDULER
 * Scheduled to run every day at 08:00 AM IST (02:30 AM UTC)
 */
export const automatedDailyBirthdays = onSchedule({ schedule: '0 6 * * *', timeZone: 'Asia/Kolkata' }, async (event) => {
  try {
    console.log('⏰ Running automatedDailyBirthdays scheduler...');
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
    const userMap = new Map<string, string>(); // name/phone -> fcmToken
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.fcmToken) {
        if (data.name) userMap.set(data.name.toLowerCase(), data.fcmToken);
        if (data.phone) userMap.set(data.phone.slice(-10), data.fcmToken);
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
            priority: 'high' as const,
            notification: {
              sound: 'default',
              priority: 'max' as const,
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
          token: token
        };
        await getMsg().send(message);
        console.log(`✅ Individual Birthday FCM sent to ${member.name}`);
      }
    }
  } catch (error) {
    console.error('Error in automatedDailyBirthdays scheduler:', error);
  }
});

/**
 * ⏰ AUTOMATED DAILY ANNIVERSARIES SCHEDULER
 * Scheduled to run every day at 08:30 AM IST (03:00 AM UTC)
 */
export const automatedDailyAnniversaries = onSchedule({ schedule: '30 6 * * *', timeZone: 'Asia/Kolkata' }, async (event) => {
  try {
    console.log('⏰ Running automatedDailyAnniversaries scheduler...');
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
    const userMap = new Map<string, string>();
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.fcmToken) {
        if (data.name) userMap.set(data.name.toLowerCase(), data.fcmToken);
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
      const targetTokens = [husbandToken, wifeToken].filter(Boolean) as string[];

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
            priority: 'high' as const,
            notification: {
              sound: 'default',
              priority: 'max' as const,
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
          tokens: targetTokens
        };
        await getMsg().sendEachForMulticast(message);
        console.log(`✅ Anniversary FCM sent to ${coupleNames}`);
      }
    }
  } catch (error) {
    console.error('Error in automatedDailyAnniversaries scheduler:', error);
  }
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
      let query: any = db.collection('users');
      
      // Filter by target phone number if provided (for individual greetings)
      if (data.targetPhone) {
        const rawDigits = data.targetPhone.replace(/\D/g, '');
        const last10 = rawDigits.slice(-10);
        query = query.where('phone', '>=', last10).where('phone', '<=', last10 + '\uf8ff');
      }

      const snapshotUsers = await query.get();
      const tokenSet = new Set<string>();
      
      snapshotUsers.forEach((doc: any) => {
        const uData = doc.data();
        
        // If targetPhone is provided, we do a stricter match since Firestore where clauses on strings can be imprecise
        if (data.targetPhone && uData.phone) {
          const rawDigits = data.targetPhone.replace(/\D/g, '');
          const last10 = rawDigits.slice(-10);
          if (!uData.phone.includes(last10)) return;
        }

        if (uData.fcmToken) tokenSet.add(uData.fcmToken);
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
          priority: 'high' as const,
          notification: {
            sound: 'default',
            priority: 'max' as const,
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
      console.log(`✅ Broadcast push delivered: ${response.successCount} success, ${response.failureCount} failed.`);
    } catch (error) {
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
  } catch (error: any) {
    console.error('uploadEventImage Error:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Helper to fetch a URL using global fetch (Node 18+)
 */
async function fetchPage(url: string): Promise<string> {
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
    let videoId: string | undefined;
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
      const tokenSet = new Set<string>();
      snapshotUsers.forEach((doc: any) => {
        const uData = doc.data();
        if (uData.fcmToken) tokenSet.add(uData.fcmToken);
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
            priority: 'high' as const,
            notification: {
              sound: 'default',
              priority: 'max' as const,
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
        console.log(`✅ YouTube Live push delivered: ${response.successCount} success, ${response.failureCount} failed.`);
      }
    }
  } catch (error) {
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
    const tokenSet = new Set<string>();
    snapshotUsers.forEach((doc: any) => {
      const uData = doc.data();
      if (uData.fcmToken) tokenSet.add(uData.fcmToken);
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
        priority: 'high' as const,
        notification: {
          sound: 'default',
          priority: 'max' as const,
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
  } catch (error: any) {
    console.error('triggerTestYouTubeLive Error:', error);
    throw new HttpsError('internal', error.message);
  }
});

export * from './whatsapp.js';

