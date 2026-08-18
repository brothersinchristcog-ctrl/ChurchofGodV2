import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "./src/meetServiceAccount.json" with { type: "json" };

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection("churches/default/bibleClasses").get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`Class: ${data.title}`);
    console.log(`- StartTimestamp: ${data.startTimestamp}`);
    console.log(`- Date: ${data.date}`);
    console.log(`- StartTime: ${data.startTime}`);
    
    if (data.startTimestamp) {
      const timeLeftMs = data.startTimestamp - Date.now();
      const timeLeftMinutes = Math.floor(timeLeftMs / 1000 / 60);
      console.log(`- Time left (mins): ${timeLeftMinutes}`);
      console.log(`- notified1Hour: ${data.notified1Hour}`);
      console.log(`- notified10Min: ${data.notified10Min}`);
    } else {
      console.log("- NO START TIMESTAMP");
    }
    console.log("-----------------------");
  });
}

run();
