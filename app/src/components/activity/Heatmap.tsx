import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HOUR_BANDS, formatHourLabel, HeatCell } from '../../lib/activity-data';

const WEEKDAYS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

function level(value: number, max: number) {
  if (max === 0 || value === 0) return 0;
  const ratio = value / max;
  if (ratio > 0.8) return 4;
  if (ratio > 0.58) return 3;
  if (ratio > 0.36) return 2;
  if (ratio > 0.14) return 1;
  return 0;
}

const HEAT_COLORS = [
  '#f1f5f9', // Level 0 (Empty)
  '#bae6fd', // Level 1 (Lightest)
  '#7dd3fc', // Level 2
  '#38bdf8', // Level 3
  '#0284c7', // Level 4 (Darkest)
];

export function Heatmap({ cells }: { cells: HeatCell[] }) {
  const max = Math.max(...cells.map((c) => c.members), 1);
  const peak = cells.reduce((best, c) => (c.members > best.members ? c : best), cells[0]!);
  const peakDay = WEEKDAYS.find((w) => w.day === peak.weekday)?.label ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.timeLabelSpacer} />
        {WEEKDAYS.map((w) => (
          <Text key={w.label} style={styles.dayLabel}>
            {w.label}
          </Text>
        ))}
      </View>

      {HOUR_BANDS.map((band) => (
        <View key={band} style={styles.gridRow}>
          <Text style={styles.timeLabel}>
            {formatHourLabel(band)}
          </Text>
          {WEEKDAYS.map((w) => {
            const cell = cells.find((c) => c.weekday === w.day && c.hourBand === band);
            const lvl = level(cell?.members ?? 0, max);
            return (
              <View
                key={`${band}-${w.day}`}
                style={[
                  styles.cell,
                  { backgroundColor: HEAT_COLORS[lvl] },
                ]}
              />
            );
          })}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.peakText}>
          Peak window:{' '}
          <Text style={styles.peakHighlight}>
            {peakDay} {formatHourLabel(peak.hourBand)} – {formatHourLabel(peak.hourBand + 3)}
          </Text>
        </Text>
        
        <View style={styles.legendContainer}>
          <Text style={styles.legendText}>Less</Text>
          {[0, 1, 2, 3, 4].map((l) => (
            <View
              key={l}
              style={[
                styles.legendDot,
                { backgroundColor: HEAT_COLORS[l] },
              ]}
            />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLabelSpacer: {
    width: 45,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    width: 45,
    textAlign: 'right',
    fontSize: 11,
    color: '#64748b',
  },
  cell: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  peakText: {
    fontSize: 12,
    color: '#64748b',
  },
  peakHighlight: {
    fontWeight: '600',
    color: '#0f172a',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
});
