# 🔔 Push Notification Implementation Guide

To enable automated push notifications when you create **Daily Promises**, **Sermons**, or **Events** in Salesforce, follow these steps:

## 1. Client Side (Mobile App)
I have already implemented the device registration logic.
*   **FCM Token**: Every time a member logs in, their device token is saved to Firestore at `users/{uid}/fcmToken`.
*   **Service**: [NotificationService.ts](file:///c:/Users/sunil/COG_MOBILE/app/src/services/NotificationService.ts)

## 2. Backend (Firebase Cloud Functions)
You need a function that Salesforce can call. Add this to your `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const sendPushNotification = functions.https.onRequest(async (req, res) => {
  const { title, body, target } = req.body; // target can be 'all', 'youth', 'leaders' etc.

  if (!title || !body) {
    res.status(400).send('Missing title or body');
    return;
  }

  // 1. Get member tokens from Firestore
  let query: any = admin.firestore().collection('users');
  
  // Optional: Filter by cell group or role if 'target' is provided
  if (target && target !== 'all') {
    query = query.where('cellGroup', '==', target);
  }

  const usersSnapshot = await query.get();
  const tokens: string[] = [];
  
  usersSnapshot.forEach((doc: any) => {
    const data = doc.data();
    if (data.fcmToken) tokens.push(data.fcmToken);
  });

  if (tokens.length === 0) {
    res.send('No tokens found');
    return;
  }

  // 2. Send via FCM
  const message = {
    notification: { title, body },
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    res.status(200).send(`Successfully sent ${response.successCount} messages`);
  } catch (error) {
    res.status(500).send(error);
  }
});
```

## 3. Salesforce Integration (The Trigger)
To "connect" Salesforce to Firebase, you need to tell Salesforce to call the URL of the function above whenever a record is created.

### Option A: Salesforce Flow (Recommended)
1.  Go to **Salesforce Setup > Flows > New Flow**.
2.  Select **Record-Triggered Flow**.
3.  Object: Choose `Daily_Promises__c`, `Sermon__c`, or **`Schedule_Event__c`**.
4.  Trigger: **A record is created** (or Status changes to 'Published').
5.  Add an **Action** element to call the Firebase URL.

### Object-Specific Payload Examples:
*   **Daily Promise**: `{"title": "Today's Promise 🙏", "body": "{!$Record.Promises__c}"}`
*   **New Sermon**: `{"title": "New Sermon Published 🎙️", "body": "{!$Record.Name}"}`
*   **New Event**: `{"title": "Upcoming Event 🗓️", "body": "{!$Record.Name} starts at {!$Record.Time__c}"}`

### Option B: Apex Trigger (For developers)
Create an Apex trigger that calls the Firebase URL:

```java
public class NotificationCallout {
    @future(callout=true)
    public static void sendToFirebase(String title, String body) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('YOUR_FIREBASE_FUNCTION_URL');
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/json');
        request.setBody('{"title":"' + title + '", "body":"' + body + '"}');
        http.send(request);
    }
}
```

## Summary of Flow
1.  **Pastor** saves a "Daily Promise" in Salesforce.
2.  **Salesforce** automatically triggers an HTTP POST request to your Firebase Cloud Function.
3.  **Firebase Function** queries Firestore for all member `fcmTokens`.
4.  **Firebase Messaging (FCM)** sends the push notification to every phone.
5.  **Member** sees "Daily Promise 🙏" alert on their phone screen.
