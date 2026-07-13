import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Ensure we initialize
initializeApp();

async function run() {
  const db = getFirestore();
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  const tokenCounts = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.fcmToken) {
      tokenCounts[data.fcmToken] = (tokenCounts[data.fcmToken] || 0) + 1;
    }
  });

  console.log("Tokens and their document counts:");
  for (const [token, count] of Object.entries(tokenCounts)) {
    if (count > 1) {
      console.log(`Duplicate found: ${token} appears ${count} times.`);
    }
  }
  console.log("Total unique tokens:", Object.keys(tokenCounts).length);
  console.log("Total user docs with tokens:", snapshot.docs.filter(d => d.data().fcmToken).length);
}

run().catch(console.error);
