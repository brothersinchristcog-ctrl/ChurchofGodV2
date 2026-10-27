import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MemberAvatar } from './MemberAvatar';
import { MemberActivitySummary, formatDuration, formatRelative } from '../../lib/activity-data';

interface Props {
  entry: MemberActivitySummary;
  today: Date;
  online?: boolean;
  onSelect?: (userId: string) => void;
  showSessions?: boolean;
}

export function MemberRow({ entry, today, online, onSelect, showSessions = true }: Props) {
  return (
    <TouchableOpacity 
      onPress={() => onSelect?.(entry.member.userId)}
      style={styles.container}
    >
      <MemberAvatar member={entry.member} online={online ?? false} size="md" />
      <View style={styles.infoContainer}>
        <Text style={styles.nameText} numberOfLines={1}>{entry.member.name}</Text>
        <Text style={styles.subText} numberOfLines={1}>
          {entry.member.role}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  subText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sessionsText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
  },
});
