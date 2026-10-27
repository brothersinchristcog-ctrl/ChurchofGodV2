import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { ActivityEvent, Session } from '../lib/activity-data';

export function useRealActivityData(days: number) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        
        const sessionsSnap = await firestore().collection('activity_sessions')
          .where('startedAt', '>=', fromDate)
          .orderBy('startedAt', 'desc')
          .get();
          
        const eventsSnap = await firestore().collection('activity_events')
          .where('timestamp', '>=', fromDate)
          .orderBy('timestamp', 'desc')
          .get();

        const usersSnap = await firestore().collection('users').get();
        const userPhotos: Record<string, string> = {};
        usersSnap.docs.forEach(doc => {
          if (doc.data().photoURL) {
            userPhotos[doc.id] = doc.data().photoURL;
          }
        });
          
        const loadedEvents: ActivityEvent[] = eventsSnap.docs.map(doc => {
          const d = doc.data();
          return {
            activityId: doc.id,
            userId: d.userId,
            eventType: d.eventType,
            feature: d.feature,
            timestamp: d.timestamp?.toDate() || new Date(),
            sessionId: d.sessionId
          };
        });

        const loadedSessions: Session[] = sessionsSnap.docs.map(doc => {
          const d = doc.data();
          const sEvents = loadedEvents.filter(e => e.sessionId === doc.id);
          
          function initialsOf(name: string) {
            if (!name) return '?';
            return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
          }

          return {
            sessionId: doc.id,
            userId: d.userId,
            startedAt: d.startedAt?.toDate() || new Date(),
            endedAt: d.endedAt?.toDate() || new Date(),
            isActive: d.endedAt == null,
            durationSec: d.durationSec || 0,
            deviceType: d.deviceType || 'Android',
            appVersion: d.appVersion || '2.0.0',
            events: sEvents,
            member: {
              userId: d.userId,
              name: d.userName || 'Unknown Member',
              initials: initialsOf(d.userName || 'Unknown Member'),
              role: d.userRole || 'Member',
              deviceType: d.deviceType || 'Android',
              appVersion: d.appVersion || '2.0.0',
              profilePicture: userPhotos[d.userId] || d.profilePicture || d.photoURL || d.avatarUrl
            }
          };
        });

        if (active) {
          setSessions(loadedSessions);
          setEvents(loadedEvents);
        }
      } catch (err) {
        console.error('Failed to load activity data', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => { active = false; };
  }, [days, refreshCounter]);

  const refetch = async () => {
    setRefreshCounter(c => c + 1);
    // Give it a tiny delay to allow React state to trigger the useEffect before returning
    return new Promise(resolve => setTimeout(resolve, 100));
  };

  return { sessions, events, loading, refetch };
}
