import firestore from '@react-native-firebase/firestore';

export interface AttendanceRecord {
  id?: string;
  eventId: string;
  eventName: string;
  memberId: string;
  memberName: string;
  locationName?: string;
  timestamp: Date;
}

class AttendanceService {
  private collection = firestore().collection('attendance');

  /**
   * Log attendance for a member at a specific event.
   */
  async logAttendance(eventId: string, eventName: string, memberId: string, memberName: string, locationName?: string): Promise<boolean> {
    try {
      // Check if attendance already logged to avoid duplicates
      const existing = await this.collection
        .where('eventId', '==', eventId)
        .where('memberId', '==', memberId)
        .get();

      if (!existing.empty) {
        console.log('Attendance already logged for this user and event.');
        return true; // Return true as they are already marked as attended
      }

      await this.collection.add({
        eventId,
        eventName,
        memberId,
        memberName,
        locationName: locationName || 'Unspecified',
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Attendance logged successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to log attendance:', error);
      throw error;
    }
  }

  /**
   * Retrieve all attendees for a specific event.
   */
  async getEventAttendees(eventId: string): Promise<AttendanceRecord[]> {
    try {
      const snapshot = await this.collection
        .where('eventId', '==', eventId)
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<AttendanceRecord, 'id'>),
      }));
    } catch (error) {
      console.error('❌ Failed to get event attendees:', error);
      return [];
    }
  }
  
  /**
   * Check if a specific member has already logged attendance for an event
   */
  async hasAttended(eventId: string, memberId: string): Promise<boolean> {
    try {
      const existing = await this.collection
        .where('eventId', '==', eventId)
        .where('memberId', '==', memberId)
        .get();
      return !existing.empty;
    } catch (error) {
      console.error('❌ Failed to check attendance status:', error);
      return false;
    }
  }
  /**
   * Get the number of events a member has attended this month.
   */
  async getMonthlyAttendanceCount(memberId: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const snapshot = await this.collection
        .where('memberId', '==', memberId)
        .where('timestamp', '>=', startOfMonth)
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('❌ Failed to get monthly attendance count:', error);
      return 0;
    }
  }

  /**
   * Get all attendance records for a member since a start date.
   */
  async getMemberAttendanceHistory(memberId: string, startDate?: Date): Promise<AttendanceRecord[]> {
    try {
      let query = this.collection.where('memberId', '==', memberId) as any;
      
      if (startDate) {
         query = query.where('timestamp', '>=', startDate);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Failed to get member attendance history:', error);
      return [];
    }
  }

  /**
   * Get total attendees for an event.
   */
  async getEventAttendeeCount(eventId: string): Promise<number> {
    try {
      const snapshot = await this.collection.where('eventId', '==', eventId).get();
      return snapshot.size;
    } catch (error) {
      console.error('❌ Failed to get event attendee count:', error);
      return 0;
    }
  }
}

export default new AttendanceService();
