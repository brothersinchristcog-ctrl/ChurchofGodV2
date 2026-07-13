import { firestore, FieldValue } from './firebaseConfig';

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface FirestorePromise {
  id: string;
  date: string; // YYYY-MM-DD
  verse: string;
  reference: string;
  devotionalNote: string;
  pastor: string;
  verseTelugu?: string;
  bgTheme?: string;
  createdAt: any;
}

export interface FirestoreVideo {
  id: string;
  youtubeId: string;
  title: string;
  duration: string;
  publishedAt: string;
  description?: string;
  isLive?: boolean;
}

// ─── Service Layer ────────────────────────────────────────────────────────────

class FirestoreService {
  /**
   * 📖 GET DAILY PROMISES (Archive)
   * Fetches the last 30 promises ordered by date DESC
   */
  async getDailyPromises(limit: number = 30): Promise<FirestorePromise[]> {
    try {
      const snapshot = await firestore()
        .collection('dailyPromises')
        .orderBy('date', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestorePromise[];
    } catch (error) {
      console.error('Error fetching promises archive:', error);
      return [];
    }
  }

  /**
   * 📖 GET SINGLE PROMISE BY DATE
   */
  async getPromiseByDate(date: string): Promise<FirestorePromise | null> {
    try {
      const snapshot = await firestore()
        .collection('dailyPromises')
        .where('date', '==', date)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FirestorePromise;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching promise for ${date}:`, error);
      return null;
    }
  }

  /**
   * 🎬 GET DAILY VIDEOS (Archive)
   * Fetches the latest devotional videos
   */
  async getDailyVideos(limit: number = 30): Promise<FirestoreVideo[]> {
    try {
      const snapshot = await firestore()
        .collection('dailyVideos')
        .orderBy('publishedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreVideo[];
    } catch (error) {
      console.error('Error fetching videos archive:', error);
      return [];
    }
  }

  /**
   * 🎬 GET LATEST VIDEO
   */
  async getLatestVideo(): Promise<FirestoreVideo | null> {
    try {
      const snapshot = await firestore()
        .collection('dailyVideos')
        .orderBy('publishedAt', 'desc')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FirestoreVideo;
      }
      return null;
    } catch (error) {
      console.error('Error fetching latest video:', error);
      return null;
    }
  }

  /**
   * 🔔 GET NOTIFICATION PREFERENCES
   */
  async getNotificationPrefs(userId: string) {
    try {
      const docSnap = await firestore()
        .collection('member_profiles')
        .doc(userId)
        .get();
      
      if (docSnap.exists()) {
        return docSnap.data()?.notifications || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching notification prefs:', error);
      return null;
    }
  }

  /**
   * 🔔 SAVE NOTIFICATION PREFERENCES
   */
  async saveNotificationPrefs(userId: string, prefs: any) {
    try {
      await firestore()
        .collection('member_profiles')
        .doc(userId)
        .set({
          notifications: prefs,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving notification prefs:', error);
      return false;
    }
  }
}

export default new FirestoreService();
