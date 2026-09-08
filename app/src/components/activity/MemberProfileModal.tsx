import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { X } from 'lucide-react-native';
import { MemberAvatar } from './MemberAvatar';
import { MemberProfile, ActivityEvent, formatDuration, formatRelative, formatTime, formatExact } from '../../lib/activity-data';

const EVENT_LABEL: Record<string, string> = {
  APP_OPEN: 'Opened app',
  APP_CLOSE: 'Closed app',
  SESSION_START: 'Session started',
  SESSION_END: 'Session ended',
  SCREEN_VIEW: 'Viewed Celebrations',
  SERMON_VIEW: 'Viewed Sermons',
  BIBLE_VIEW: 'Read Bible',
  EVENT_VIEW: 'Viewed Events',
  PRAYER_VIEW: 'Opened Prayer Wall',
  SONG_VIEW: 'Played Songs',
  GALLERY_VIEW: 'Browsed Gallery',
  LIVE_CHAT_JOIN: 'Joined live chat',
  NOTIFICATION_OPEN: 'Opened notification',
  SUBSCRIPTION_OPEN: 'Opened subscription',
};

function getEventLabel(event: ActivityEvent): string | null {
  if (event.eventType !== 'SCREEN_VIEW' || !event.feature) return null;

  const f: string = event.feature;
  if (f.includes('Sermon')) return 'Sermons';
  if (f === 'PrayerWall' || f === 'Prayer') return 'Prayer Wall';
  if (f === 'Events' || f === 'EventDetails') return 'Events';
  if (f.includes('Bible')) return 'Bible';
  if (f === 'Songs') return 'Songs';

  return null;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

interface Props {
  profile: MemberProfile | null;
  today: Date;
  onClose: () => void;
}

export function MemberProfileModal({ profile, today, onClose }: Props) {
  if (!profile) return null;

  return (
    <Modal
      visible={profile !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <MemberAvatar member={profile.member} size="lg" online={Boolean(profile.lastActive)} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{profile.member.name}</Text>
              <Text style={styles.subtitle}>
                {profile.member.role} · {profile.member.deviceType} v{profile.member.appVersion}
              </Text>
              {profile.lastActive && (
                <Text style={styles.activeText}>
                  Last active {formatRelative(profile.lastActive, today)}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#64748b" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea}>
          <View style={styles.statsGrid}>
            <Stat label="This week" value={`${profile.sessionsThisWeek}`} hint="sessions" />
            <Stat label="This month" value={`${profile.sessionsThisMonth}`} hint="sessions" />
            <Stat label="Avg session" value={formatDuration(profile.avgSessionSec)} />
            <Stat label="Last 30 days" value={`${profile.activeDaysLast30}`} hint="active days" />
          </View>

          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>Activity timeline</Text>
            
            {profile.timeline
              .map((day) => ({
                ...day,
                events: day.events
                  .map((event) => ({ event, label: getEventLabel(event) }))
                  .filter((item) => item.label !== null)
              }))
              .filter(day => day.events.length > 0)
              .map((day) => (
              <View key={day.day.toISOString()} style={styles.timelineDayBlock}>
                <Text style={styles.timelineDayText}>
                  {day.day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                
                <View style={styles.eventsList}>
                  {(day.events as any[]).map(({ event, label }) => (
                    <View key={event.activityId} style={styles.eventRow}>
                      <View style={styles.timelineLine} />
                      <View style={styles.timelineDot} />
                      <Text style={styles.eventTimeText}>{formatTime(event.timestamp)}</Text>
                      <Text style={styles.eventLabelText}>
                        Viewed {label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#22c55e',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 4,
  },
  statHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  timelineContainer: {
    padding: 16,
    paddingTop: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  timelineDayBlock: {
    marginBottom: 20,
  },
  timelineDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  eventsList: {
    marginLeft: 8,
    paddingLeft: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: -12,
    top: -16,
    bottom: -8,
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  timelineDot: {
    position: 'absolute',
    left: -14.5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  eventTimeText: {
    width: 64,
    fontSize: 12,
    color: '#64748b',
  },
  eventLabelText: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
});
