# 🚀 Salesforce Production Migration Guide & Notepad

This document serves as your master checklist for moving and managing the Church of God Mobile App between your Salesforce Sandbox and live Production environments.

---

## 📦 PART 1: Objects & Fields to Migrate (Via Change Sets)

You must include the following Standard and Custom Objects (and their Custom Fields) in your Outbound Change Set from the Sandbox.

### 1. Contact (Standard Object)
*You don't migrate the object itself, but you MUST add these Custom Fields to the Change Set and enable **Visible** Field-Level Security (FLS) for the System Administrator profile:*
- `Active__c`
- `Anniversary_Date__c`
- `Church_Of_Baptism__c`
- `Current_Church__c`
- `Date_of_Baptism__c`
- `Gender__c`
- `Have_You_Baptized__c`
- `Martial_Status__c`
- `Membership_Status__c`
- `Mobile_App_ID__c`
- `Number_Of_Children_s__c`
- `User_Type__c`

### 2. Schedule_Event__c (Custom Object)
*Add the Object and these Custom Fields:*
- `Date__c`
- `Day__c`
- `Time__c`
- `End_Time__c`
- `Location__c`
- `Location_Telugu__c`
- `Description__c`
- `Description_Telugu__c`
- `Event_Mode__c`
- `Event_Type__c`
- `Banner_Color__c`
- `Banner_Image_URL__c`
- `Attendance_Cap__c`
- `RSVP_Enabled__c`
- `Show_RSVP_Count__c`

### 3. Sermon__c (Custom Object)
*Add the Object and these Custom Fields:*
- `Title_Telugu__c`
- `Pastor_Name__c`
- `Sermon_Date__c`
- `Scripture_Reference__c`
- `Description__c`
- `YouTube_ID__c`
- `Duration__c`
- `Status__c`
- `View_Count__c`

### 4. Daily_Promises__c (Custom Object)
- `Promises__c`
- `Promise_text_telugu__c`
- `Date__c`
- `Number__c`
- `Verse_Reference_En__c`
- `Verse_Reference_Te__c`

### 5. Daily_Video__c (Custom Object)
- `Video_Title__c`
- `Pastor_Name__c`
- `Published_Date__c`
- `YouTube_ID__c`
- `Duration__c`

### 6. Worship_Song__c (Custom Object)
- `Song_Title_Telugu__c`
- `Lyrics__c`
- `Artist__c`
- `Key_Signature__c`
- `YouTube_ID__c`
- `Status__c`

### 7. Notification_Broadcast__c (Custom Object)
- `Message_content__c`
- `Broadcast_Type__c`
- `Notify_Members__c`
- `Target_Auidence__c`
- `Sent_Date__c`

### 8. Case (Standard Object used for Prayer Requests)
- `Prayer_Category__c`
- `Detailed_Prayer_Request__c`
- `How_can_we_support_you__c`

### 9. Bible_Plan_Progress__c (Custom Object)
- `Contact__c` (Lookup/Master-Detail to Contact)
- `Plan_ID__c` (Text)
- `Completed_Days__c` (Long Text Area / Rich Text Area)

---

## ⚙️ PART 2: The Production Integration Configuration

Your active, live Salesforce Production Org uses an **External Client App** to handle connections. The credentials have been verified and are completely active.

### Verified Production Credentials:
* **Consumer Key:** `[REDACTED_CONSUMER_KEY]`
* **Consumer Secret:** `[REDACTED_CONSUMER_SECRET]`
* **My Domain URL:** `https://kristhunandusahodarulusahavasam.my.salesforce.com`
* **Username:** `sakibandasunilbabu@bic.com`

---

## 🔄 PART 3: Sandbox Connection Workflow (To Develop/Test)
Follow these steps whenever you need to connect your local app back to the **Sandbox** org to test new features.

### Step 1: Update your local Environment Files (`.env`)
Update all 4 `.env` files (both C: and D: drives) with Sandbox credentials:

#### 1. In `app/.env`:
```env
EXPO_PUBLIC_SALESFORCE_CONSUMER_KEY=[Your Sandbox Consumer Key]
EXPO_PUBLIC_SALESFORCE_CONSUMER_SECRET=[Your Sandbox Consumer Secret]
EXPO_PUBLIC_SALESFORCE_USERNAME=[Your Sandbox Username]
EXPO_PUBLIC_SALESFORCE_LOGIN_URL=https://test.salesforce.com
```

#### 2. In `functions/.env`:
```env
SF_CONSUMER_KEY=[Your Sandbox Consumer Key]
SF_USERNAME=[Your Sandbox Username]
SF_LOGIN_URL=https://test.salesforce.com
```

### Step 2: Publish Sandbox Configuration
1. **Redeploy Sandbox functions:**
   ```powershell
   cd functions
   npm run build
   $env:FUNCTIONS_DISCOVERY_TIMEOUT=60; npx firebase-tools deploy --only "functions"
   ```
2. **Restart Mobile App:**
   ```powershell
   cd app
   npx expo start -c
   ```

---

## 🚀 PART 4: Deploying Changes from Sandbox to Production
When you have created new features (fields, classes, or triggers) in Sandbox and want to move them to Production:

### Step 1: Push Metadata via Change Sets
1. In Sandbox, go to **Setup** -> **Outbound Change Sets** -> click **New** -> add components (fields, objects, classes, triggers).
2. Click **Upload** and select your **Production Org**.
3. In Production, go to **Setup** -> **Inbound Change Sets** -> select your Change Set.
4. Click **Validate** (select *Run Specified Tests* to run only your custom tests, e.g., `FirebaseNotificationServiceTest`).
5. Click **Deploy**.

### Step 2: Switch Workspace back to Production
Swap the environment variables in your local `.env` files back to the **Verified Production Credentials** (listed in PART 2).

Redeploy the functions to point back to the live database:
```powershell
cd functions
npm run build
$env:FUNCTIONS_DISCOVERY_TIMEOUT=60; npx firebase-tools deploy --only "functions"
```

---

## ⏰ PART 5: Automated Daily Schedulers (Firebase-side)
All daily push notifications and record syncs are managed by **Firebase Cloud Functions** schedulers in Production. You do **not** need scheduled jobs active in Salesforce.

* 📖 **Daily Promise Alert (05:00 AM IST):** Automatically fetches today's scripture and devotional note from Salesforce and broadcasts it to all iOS and Android devices.
* 🎂 **Daily Birthdays Greeting (06:00 AM IST):** Sends customized birthday greetings to members celebrating today.
* 💐 **Daily Anniversaries Greeting (06:30 AM IST):** Sends customized wedding anniversary greetings to couples celebrating today.
