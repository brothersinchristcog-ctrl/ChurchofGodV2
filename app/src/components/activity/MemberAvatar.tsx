import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Member } from '../../lib/activity-data';

const TONES = [
  { bg: '#3b82f6', text: '#ffffff' }, // chart-1
  { bg: '#a855f7', text: '#ffffff' }, // chart-2
  { bg: '#22c55e', text: '#ffffff' }, // chart-3
  { bg: '#eab308', text: '#ffffff' }, // chart-4
  { bg: '#f97316', text: '#ffffff' }, // chart-5
];

function toneFor(userId: string) {
  let sum = 0;
  for (let i = 0; i < userId.length; i++) sum += userId.charCodeAt(i);
  return TONES[sum % TONES.length]!;
}

interface Props {
  member: Member;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

export function MemberAvatar({ member, size = 'md', online = false }: Props) {
  const tone = toneFor(member.userId);
  
  const dimStyles = {
    sm: { size: 32, fontSize: 11, dotSize: 10, dotBorder: 2 },
    md: { size: 40, fontSize: 12, dotSize: 12, dotBorder: 2 },
    lg: { size: 56, fontSize: 16, dotSize: 14, dotBorder: 3 },
  }[size];

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.avatar, 
          { 
            width: dimStyles.size, 
            height: dimStyles.size, 
            borderRadius: dimStyles.size / 2,
            backgroundColor: tone.bg,
            overflow: 'hidden'
          }
        ]}
      >
        {member.profilePicture ? (
          <Image 
            source={{ uri: member.profilePicture }} 
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover" 
          />
        ) : (
          <Text style={[styles.initials, { fontSize: dimStyles.fontSize, color: tone.text }]}>
            {member.initials}
          </Text>
        )}
      </View>
      
      <View 
        style={[
          styles.onlineDot, 
          { 
            width: dimStyles.dotSize, 
            height: dimStyles.dotSize, 
            borderRadius: dimStyles.dotSize / 2,
            borderWidth: dimStyles.dotBorder,
            backgroundColor: online ? '#22c55e' : '#94a3b8', // Green for online, ash/gray for offline
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  initials: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderColor: '#ffffff',
  },
});
