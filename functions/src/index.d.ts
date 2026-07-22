import * as functionsCompat from 'firebase-functions/v1';
export declare const debugGetThemes: import("firebase-functions/v2/https").HttpsFunction;
export declare const debugDeliveryStatus: import("firebase-functions/v2/https").HttpsFunction;
/**
 * 🧪 MANUAL TRIGGER - run the daily wishes on demand for testing
 * Call: GET https://us-central1-church-mobile-app-b7e27.cloudfunctions.net/triggerDailyWishes
 */
export declare const triggerDailyWishes: import("firebase-functions/v2/https").HttpsFunction;
/**
 * 📖 GET DAILY PROMISE
 */
export declare const getDailyPromise: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    data: any;
}>, unknown>;
/**
 * 📅 GET UPCOMING EVENTS
 */
export declare const getUpcomingEvents: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    data: any;
}>, unknown>;
/**
 * 🛡️ CHECK CONTACT EXISTS
 */
export declare const checkContactExists: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    exists: boolean;
    member: {
        id: any;
        accountId: any;
        name: string;
        firstName: any;
        lastName: any;
        email: any;
        phone: any;
        userType: any;
        mailingCity: any;
        mailingState: any;
        mailingStreet: any;
        joinDate: any;
    };
    success: boolean;
} | {
    exists: boolean;
    member?: never;
    success: boolean;
}>, unknown>;
/**
 * 🔔 NOTIFY MEMBERS
 */
export declare const notifyMembers: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
    sent?: never;
    failed?: never;
} | {
    success: boolean;
    sent: any;
    failed: any;
    message?: never;
}>, unknown>;
/**
 * ⏰ AUTOMATED DAILY PROMISE SCHEDULER
 * Scheduled to run every day at 07:00 AM IST (01:30 AM UTC)
 */
export declare const automatedDailyPromise: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * ⏰ AUTOMATED DAILY BIRTHDAYS SCHEDULER
 * Scheduled to run every day at 08:00 AM IST (02:30 AM UTC)
 */
export declare const automatedDailyBirthdays: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * ⏰ AUTOMATED DAILY ANNIVERSARIES SCHEDULER
 * Scheduled to run every day at 08:30 AM IST (03:00 AM UTC)
 */
export declare const automatedDailyAnniversaries: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * ⏰ AUTOMATED DAILY WHATSAPP CELEBRATIONS WISHES SCHEDULER
 * Runs every day at 07:00 AM IST
 */
export declare const automatedDailyWhatsAppWishes: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * 📣 ON BROADCAST CREATED TRIGGER (Gen 1 to bypass Eventarc permission issues)
 * Automatically sends push notifications when a new broadcast is added to Firestore (e.g. Emergency Meeting or custom admin updates)
 */
export declare const onBroadcastCreated: functionsCompat.CloudFunction<functionsCompat.firestore.QueryDocumentSnapshot>;
/**
 * 📤 UPLOAD EVENT IMAGE
 */
export declare const uploadEventImage: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    url: string;
}>, unknown>;
/**
 * ⏰ YOUTUBE LIVE CHECK SCHEDULER
 * Runs every 5 minutes to check if YouTube channel is live
 */
export declare const checkYouTubeLive: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * 📢 TRIGGER TEST YOUTUBE LIVE NOTIFICATION
 */
export declare const triggerTestYouTubeLive: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
    sent?: never;
    failed?: never;
    broadcastId?: never;
} | {
    success: boolean;
    sent: any;
    failed: any;
    broadcastId: any;
    message?: never;
}>, unknown>;
export * from './whatsapp.js';
//# sourceMappingURL=index.d.ts.map