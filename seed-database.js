/**
 * Church of God (COG) - Database Seed Script
 * 
 * This script uploads the contents of seed_data.json to your Firestore database.
 * 
 * Usage:
 * 1. Ensure you have the 'firebase-tools' installed globally: npm install -g firebase-tools
 * 2. Login to your firebase account: firebase login
 * 3. Use your project ID: firebase use <your-project-id>
 * 4. Run: node seed-database.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

// Initialize with Service Account if available
if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Fallback to project ID (requires ADC environment variables)
  admin.initializeApp({
    projectId: 'church-mobile-app-b7e27' 
  });
}

const db = admin.firestore();

async function seed() {
  const seedPath = path.join(__dirname, 'seed_data.json');
  if (!fs.existsSync(seedPath)) {
    console.error('Error: seed_data.json not found!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(seedPath);
  const seedData = JSON.parse(rawData);

  console.log('--- Starting Database Seeding ---');

  for (const item of seedData) {
    const { collection, id, data } = item;
    try {
      // Use set() for consistent IDs
      await db.collection(collection).doc(id).set({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Success: Uploaded ${id} to ${collection}`);
    } catch (error) {
      console.error(`❌ Error uploading ${id}:`, error.message);
    }
  }

  console.log('--- Seeding Completed ---');
}

seed();
