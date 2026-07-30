import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import axios from 'axios';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

setGlobalOptions({ region: 'asia-south1' });

export const sendWhatsAppWish = onCall({ invoker: 'public' }, async (request) => {
  try {
    const { phoneNumber, messageBody, verse } = request.data || {};

    if (!phoneNumber || !messageBody) {
      throw new HttpsError('invalid-argument', 'Phone number and message body are required.');
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      throw new HttpsError('internal', 'WhatsApp credentials are not configured on the server.');
    }

    let fullText = messageBody;
    if (verse) {
      fullText += `\n\n"${verse.text}"\n- ${verse.ref}`;
    }

    const imageBase64 = request.data?.imageBase64;
    let messagePayload: any = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
    };

    if (imageBase64) {
      // Convert base64 to Blob/Buffer
      const buffer = Buffer.from(imageBase64, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', blob, 'image.jpg');

      // Upload Media
      const uploadUrl = `https://graph.facebook.com/v19.0/${phoneId}/media`;
      const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const mediaId = uploadResponse.data.id;
      
      const cleanParam = (str: string | undefined): string => {
        if (!str) return ' ';
        return str.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || ' ';
      };

      const cleanMsg = cleanParam(messageBody);
      const cleanVerseStr = verse ? cleanParam(`"${verse.text}" - ${verse.ref}`) : ' ';

      messagePayload.type = 'template';
      messagePayload.template = {
        name: 'cod_card',
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  id: mediaId
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: cleanMsg
              },
              {
                type: 'text',
                text: cleanVerseStr
              }
            ]
          }
        ]
      };
    } else {
      messagePayload.type = 'text';
      messagePayload.text = { body: fullText };
    }

    // Send Message
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const response = await axios.post(url, messagePayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return { success: true, messageId: response.data?.messages?.[0]?.id };
  } catch (error: any) {
    console.error('sendWhatsAppWish Error:', error.response?.data || error.message);
    throw new HttpsError('internal', error.response?.data?.error?.message || error.message);
  }
});

export const whatsappWebhook = onRequest({ invoker: 'public' }, (request, response) => {
  if (request.method === 'GET') {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'churchofgod_secret_token';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      response.status(200).send(challenge);
      return;
    } else {
      response.sendStatus(403);
      return;
    }
  }

  if (request.method === 'POST') {
    const body = request.body;
    console.log('Incoming webhook message:', JSON.stringify(body, null, 2));
    
    if (body.object === 'whatsapp_business_account' && body.entry) {
      const db = getFirestore();
      const promises: Promise<void>[] = [];
      
      body.entry.forEach((entry: any) => {
        entry.changes.forEach((change: any) => {
          const value = change.value;
          
          // Handle incoming messages
          if (value.messages) {
            value.messages.forEach((msg: any) => {
              promises.push((async () => {
                try {
                  const contact = value.contacts?.find((c: any) => c.wa_id === msg.from);
                  const name = contact?.profile?.name || 'Unknown';
                  
                  let messageText = '';
                  if (msg.type === 'text') {
                    messageText = msg.text.body;
                  } else if (msg.type === 'button') {
                    messageText = msg.button.text;
                  } else {
                    messageText = `[${msg.type} message]`;
                  }
                  
                  const recentMsgSnap = await db.collection('whatsapp_messages')
                    .where('fromPhone', '==', msg.from)
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();
                  
                  let adminId = 'unassigned';
                  let adminName = 'Unassigned';
                  
                  if (!recentMsgSnap.empty) {
                    const recentMsgDoc = recentMsgSnap.docs[0];
                    if (recentMsgDoc) {
                      const recentMsg = recentMsgDoc.data() as any;
                      if (recentMsg && recentMsg.adminId) {
                        adminId = recentMsg.adminId;
                        adminName = recentMsg.adminName || 'Admin';
                      }
                    }
                  }
                  
                  await db.collection('whatsapp_messages').add({
                    fromPhone: msg.from,
                    fromName: name,
                    messageId: msg.id,
                    text: messageText,
                    timestamp: new Date(msg.timestamp * 1000),
                    type: 'incoming',
                    rawType: msg.type,
                    adminId: adminId,
                    adminName: adminName,
                    conversationOwner: adminId,
                    createdAt: FieldValue.serverTimestamp()
                  });

                  // --- ADMIN NOTIFICATION CARD LOGIC ---
                  try {
                    let finalName = name;
                    try {
                      // Attempt to lookup user by phone in 'users' collection
                      const p1 = `+${msg.from}`;
                      const p2 = msg.from;
                      const userQuery = await db.collection('users').where('phoneNumber', 'in', [p1, p2]).get();
                      
                      if (!userQuery.empty) {
                        const uDoc = userQuery.docs[0]?.data();
                        if (uDoc && uDoc.displayName) {
                          finalName = uDoc.displayName;
                        }
                      }
                    } catch (e) {
                      console.error('Error looking up full name:', e);
                    }

                    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                    await db.collection('broadcasts').add({
                      title: `New Reply from ${finalName}`,
                      content: messageText,
                      date: dateStr,
                      type: 'whatsapp_reply',
                      targetRole: 'admin', // This tells the Updates screen to only show it to Admins/Pastors
                      silent: true, // Prevents a push notification from firing
                      createdAt: FieldValue.serverTimestamp()
                    });
                    console.log(`Created in-app notification card for WhatsApp reply from ${finalName}`);
                  } catch (err) {
                    console.error('Error creating admin notification card:', err);
                  }
                  // --- END ADMIN NOTIFICATION CARD LOGIC ---

                } catch (err) {
                  console.error('Error saving message:', err);
                }
              })());
            });
          }
          
          // Handle delivery statuses (sent, delivered, read, failed)
          if (value.statuses) {
            value.statuses.forEach((status: any) => {
               promises.push(
                 db.collection('whatsapp_delivery_status').add({
                  recipientPhone: status.recipient_id,
                  messageId: status.id,
                  status: status.status,
                  errors: status.errors || null,
                  timestamp: new Date(status.timestamp * 1000),
                  createdAt: FieldValue.serverTimestamp()
                 }).then(() => {}).catch(err => console.error('Error saving status:', err))
               );
            });
          }
        });
      });
      
      // Wait for all database operations to finish before responding
      Promise.all(promises)
        .then(() => {
          response.status(200).send('EVENT_RECEIVED');
        })
        .catch(err => {
          console.error('Error in webhook promises:', err);
          response.status(200).send('EVENT_RECEIVED'); // Still return 200 to acknowledge receipt
        });
        
      return;
    }

    response.status(200).send('EVENT_RECEIVED');
    return;
  }

  response.sendStatus(405);
});
