import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FeatureUsage, formatNumber } from '../../lib/activity-data';

interface Props {
  usage: FeatureUsage[];
  periodLabel: string;
}

export function FeatureUsagePanel({ usage, periodLabel }: Props) {
  return (
    <View style={styles.container}>
      {usage.map((row) => (
        <View key={row.feature} style={styles.row}>
          <View style={styles.headerRow}>
            <Text style={styles.featureName}>{row.feature}</Text>
            <Text style={styles.statsText}>
              {formatNumber(row.members)} members · {row.share}%
            </Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={['#1e3a8a', '#3b82f6']} // Example brand gradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                { width: `${Math.min(row.share, 100)}%` }
              ]}
            />
          </View>
          
          <Text style={styles.subtext}>
            {formatNumber(row.views)} views {periodLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  featureName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#0f172a',
  },
  statsText: {
    fontSize: 14,
    color: '#64748b',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
  subtext: {
    fontSize: 12,
    color: '#64748b',
  },
});
