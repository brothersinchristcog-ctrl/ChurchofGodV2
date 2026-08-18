import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();
initializeApp({ projectId: 'church-mobile-app-b7e27' });

async function run() {
  const db = getFirestore();
  const doc = await db.collection('settings').doc('celebration_themes').get();
  if (doc.exists) {
    console.log("Celebration Themes Document Data:", JSON.stringify(doc.data(), null, 2));
  } else {
    console.log("Document settings/celebration_themes does not exist.");
  }
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
