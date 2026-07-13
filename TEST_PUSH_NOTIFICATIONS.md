# 🧪 How to Test Your Push Notifications

Follow these 3 steps to verify everything is working perfectly.

## Step 1: Verify Device Registration
1.  Open your app on a **physical Android or iOS device** (Push notifications usually don't work on computer emulators).
2.  Log in as a member or guest.
3.  Go to your **Firebase Console > Firestore Database**.
4.  Look for your user document in the `users` collection.
5.  **Requirement**: You must see a field named `fcmToken` with a long string of letters and numbers.
    *   *If you see this, your app is correctly registered and ready to receive messages!*

---

## Step 2: Test the Backend (Manual Trigger)
You can "pretend" to be Salesforce by sending a manual request to your Cloud Function. 

Once you deploy your functions, run this command in your terminal (replace the URL with your live function URL):

```bash
curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/notifyMembers \
-H "Content-Type: application/json" \
-d '{
  "title": "Test Notification 🔔",
  "body": "Hello! This is a test message from the admin console.",
  "type": "test"
}'
```

**What should happen:**
*   Your phone should vibrate/ping.
*   The notification should appear on your lock screen.

---

## Step 3: Test Salesforce Integration
Finally, test the full loop:
1.  Create a new **Daily Promise** record in Salesforce.
2.  Save it.
3.  Wait 1-2 seconds.
4.  **Result**: Your phone should receive the notification automatically!

### 💡 Troubleshooting Tip:
If you don't receive the notification:
1.  Check the **Firebase Functions Logs** in the console. It will show you if it found any tokens or if there was an error sending.
2.  Ensure your phone has **Notifications Enabled** for the "Church of GOD" app.
