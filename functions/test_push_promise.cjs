const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
require('dotenv').config();

admin.initializeApp({ projectId: 'church-mobile-app-b7e27' });

const { SalesforceBackend } = require('./src/services/SalesforceBackend.js');

async function testPromise() {
  try {
    console.log('Initializing SalesforceBackend...');
    const sf = new SalesforceBackend({
      consumerKey: process.env.SF_CONSUMER_KEY,
      username: process.env.SF_USERNAME,
      loginUrl: process.env.SF_LOGIN_URL,
      privateKey: (process.env.SF_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    });

    console.log('Fetching promise from Salesforce...');
    const promise = await sf.getDailyPromise();
    if (!promise) {
      console.log('No daily promise found in Salesforce.');
      return;
    }

    const enContent = promise.Promises__c ? promise.Promises__c.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim() : '';
    const teContent = promise.Promise_text_telugu__c ? promise.Promise_text_telugu__c.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim() : '';
    let content = '';
    if (enContent && teContent) {
      content = `📖 ${enContent}\n\nదువా / వాగ్దానం:\n📖 ${teContent}`;
    } else {
      content = enContent || teContent || 'Grace and Peace be multiplied to you today.';
    }

    const notifBody = enContent && teContent 
      ? `✝️ ${enContent.slice(0, 70)}...\n📖 ${teContent.slice(0, 70)}...`
      : content.slice(0, 120);

    const title = '📖 Today\'s Promise · ఈ రోజు వాగ్దానం';

    console.log('Fetching user tokens...');
    const db = getFirestore();
    const snapshot = await db.collection('users').get();
    const tokenSet = new Set();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken) tokenSet.add(data.fcmToken);
    });

    const tokens = Array.from(tokenSet);
    console.log(`Found ${tokens.length} tokens.`);

    if (tokens.length === 0) return;

    const messagePayload = {
      notification: { title, body: notifBody },
      data: { type: 'promise' },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'max',
          channelId: 'default'
        }
      },
      tokens: tokens
    };

    console.log('Sending FCM...');
    const fcmResponse = await getMessaging().sendEachForMulticast(messagePayload);
    console.log(`Push Sent: ${fcmResponse.successCount} success, ${fcmResponse.failureCount} failed`);

  } catch (err) {
    console.error('Error:', err);
  }
}

testPromise();
