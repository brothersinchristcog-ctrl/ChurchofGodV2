const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const uid = 'lW9OMoDRS0Vd1KERi6VrRb8cWmu1';

async function fix() {
  console.log('Fixing subscription for', uid);
  await db.collection('users').doc(uid).collection('subscription').doc('current').set({
    status: 'ACTIVE',
    startDate: admin.firestore.FieldValue.serverTimestamp(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    lastPaymentId: 'pay_test_manual',
    plan: 'monthly',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Fixed subscription for ' + uid);
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
