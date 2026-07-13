import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, shadow } from '../theme/Theme';

interface Props {
  onDone: () => void;
}

export default function EventSuccessCard({ onDone }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
      </View>
      <Text style={styles.title}>Event Created!</Text>
      <Text style={styles.message}>
        Your event has been successfully scheduled and synced to the dashboard.
      </Text>
      
      <TouchableOpacity style={styles.doneButton} onPress={onDone}>
        <Text style={styles.doneButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    ...shadow.card
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: radius.full,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});
