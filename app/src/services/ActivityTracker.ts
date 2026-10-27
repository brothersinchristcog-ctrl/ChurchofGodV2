import firestore from '@react-native-firebase/firestore';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';
import { SalesforceMember } from './SalesforceService';

export type EventType =
  | "APP_OPEN"
  | "APP_CLOSE"
  | "SESSION_START"
  | "SESSION_END"
  | "SCREEN_VIEW"
  | "SERMON_VIEW"
  | "BIBLE_VIEW"
  | "EVENT_VIEW"
  | "PRAYER_VIEW"
  | "SONG_VIEW"
  | "GALLERY_VIEW"
  | "LIVE_CHAT_JOIN"
  | "NOTIFICATION_OPEN"
  | "SUBSCRIPTION_OPEN";

class ActivityTracker {
  private currentSessionId: string | null = null;
  private sessionStartTime: number = 0;
  private userId: string | null = null;
  private userRole: string = 'Member';
  private userName: string = 'Unknown';
  
  public setUser(uid: string, name: string, role: string) {
    this.userId = uid;
    this.userName = name;
    this.userRole = role;
  }

  public clearUser() {
    this.userId = null;
    this.userName = 'Unknown';
    this.userRole = 'Member';
  }

  public async startSession() {
    if (!this.userId) return;
    
    // Generate a consistent session ID for the member for the current day
    const today = new Date().toISOString().split('T')[0];
    const expectedSessionId = `${this.userId}_${today}`;
    
    // If it's a new day or coming from background (where ID was cleared), set it up
    if (this.currentSessionId !== expectedSessionId) {
      this.currentSessionId = expectedSessionId;
      this.sessionStartTime = Date.now();
      await this.logEvent("SESSION_START", "App");
    }

    // Always ensure the session document exists (in case it was just deleted by a Reset)
    const sessionRef = firestore().collection('activity_sessions').doc(this.currentSessionId);
    try {
      const doc = await sessionRef.get();
      const data = doc.data();
      
      // If the document doesn't exist, OR it exists but is corrupted (e.g. only has endedAt from an orphaned endSession call)
      if (!doc.exists || !data?.startedAt || !data?.userId) {
        await sessionRef.set({
          sessionId: this.currentSessionId,
          userId: this.userId,
          userName: this.userName,
          userRole: this.userRole,
          deviceType: Platform.OS,
          appVersion: DeviceInfo.getVersion(),
          startedAt: data?.startedAt || firestore.FieldValue.serverTimestamp(),
          endedAt: null, // Always active when starting
          durationSec: data?.durationSec || 0
        }, { merge: true }); // Use merge so we don't destroy any accumulated durationSec
      } else {
        // The document exists and is valid, but we need to mark it as active again
        if (data?.endedAt !== null) {
          await sessionRef.set({
            endedAt: null
          }, { merge: true });
        }
      }
    } catch (e) {
      console.error("Error starting session", e);
    }
  }

  public async endSession() {
    if (!this.userId || !this.currentSessionId) return;

    const durationSec = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const sessionId = this.currentSessionId;
    
    this.currentSessionId = null; // Clear it early to avoid double ending
    await this.logEvent("SESSION_END", "App");

    const sessionRef = firestore().collection('activity_sessions').doc(sessionId);
    await sessionRef.set({
      endedAt: firestore.FieldValue.serverTimestamp(),
      // Accumulate the duration over the course of the day
      durationSec: firestore.FieldValue.increment(durationSec)
    }, { merge: true }).catch(e => console.error("Error ending session", e));
  }

  private isAllowedScreen(screen: string): boolean {
    const allowed = [
      'Sermons', 'SermonVideo',
      'PrayerWall', 'Prayer',
      'Events', 'EventDetails',
      'Bible', 'BibleReader', 'BibleChapters', 'BibleSearch', 'BiblePlans',
      'Songs'
    ];
    if (allowed.includes(screen)) return true;
    return false;
  }

  public async logEvent(eventType: EventType, featureName: string) {
    if (!this.userId) return;
    
    if (eventType === 'SCREEN_VIEW' && !this.isAllowedScreen(featureName)) {
      return;
    }
    
    const eventRef = firestore().collection('activity_events').doc();
    await eventRef.set({
      activityId: eventRef.id,
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      sessionId: this.currentSessionId || 'none',
      eventType: eventType,
      feature: featureName,
      deviceType: Platform.OS,
      appVersion: DeviceInfo.getVersion(),
      timestamp: firestore.FieldValue.serverTimestamp()
    }).catch(e => console.error("Error logging event", e));
  }
}

export default new ActivityTracker();
