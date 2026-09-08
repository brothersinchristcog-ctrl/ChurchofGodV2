import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

export interface ChartPoint {
  id: string;
  label: string;
  members: number;
  sessions: number;
}

interface Props {
  points: ChartPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  mode: 'hourly' | 'daily';
}

function PointerUpdater({ id, onSelect }: { id: string; onSelect: (id: string) => void }) {
  React.useEffect(() => {
    onSelect(id);
  }, [id, onSelect]);
  return null;
}

export function ActivityChart({ points, selectedId, onSelect, mode }: Props) {
  const scrollRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    if (points.length > 7 && selectedId) {
      setTimeout(() => {
        const index = points.findIndex(p => p.id === selectedId);
        if (index >= 0) {
          const screenWidth = Dimensions.get('window').width;
          const exactContainerWidth = screenWidth - 64;
          const dynamicSpacing = 45; // When scrollable, spacing is 45
          // Calculate x position to center the selected point
          const x = Math.max(0, index * dynamicSpacing - exactContainerWidth / 2 + 50);
          scrollRef.current?.scrollTo({ x, y: 0, animated: false });
        }
      }, 300);
    }
  }, [mode, points.length, selectedId]);
  const data = points.map((p, index) => ({
    value: p.members,
    label: p.label,
    dataPointText: '',
    customDataPoint: () => {
      const isSelected = p.id === selectedId;
      return (
        <View
          style={{
            width: isSelected ? 12 : 8,
            height: isSelected ? 12 : 8,
            borderRadius: isSelected ? 6 : 4,
            backgroundColor: isSelected ? '#1e293b' : '#334155',
            borderWidth: 2,
            borderColor: '#fffdfa',
          }}
        />
      );
    },
    onPress: () => onSelect(p.id),
  }));

  const screenWidth = Dimensions.get('window').width;
  const exactContainerWidth = screenWidth - 64; // assuming 32px margin + 32px padding on parent
  const isScrollable = points.length > 7;
  
  const dynamicSpacing = isScrollable 
    ? 45 
    : (exactContainerWidth - 80) / Math.max(points.length - 1, 1);

  return (
    <View style={styles.container}>
      <LineChart
        key={`${mode}-${points.length}`}
        data={data}
        areaChart={mode === 'hourly'}
        hideDataPoints={false}
        color="#334155"
        thickness={2.5}
        width={exactContainerWidth}
        startFillColor="#94a3b8"
        endFillColor="#e2e8f0"
        startOpacity={0.4}
        endOpacity={0.05}
        initialSpacing={20}
        endSpacing={30}
        spacing={dynamicSpacing}
        scrollRef={scrollRef}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
        xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
        hideRules={false}
        rulesColor="#e2e8f0"
        rulesType="solid"
        pointerConfig={{
          pointerStripHeight: 160,
          pointerStripColor: 'rgba(0,0,0,0.1)',
          pointerStripWidth: 2,
          pointerColor: '#334155',
          radius: 6,
          pointerLabelWidth: 100,
          pointerLabelHeight: 90,
          activatePointersDelay: 150,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: any) => {
            const item = items[0];
            const p = points.find((pt) => pt.label === item.label);
            if (!p) return null;
            return (
              <View style={styles.tooltip}>
                <PointerUpdater id={p.id} onSelect={onSelect} />
                <Text style={styles.tooltipTitle}>{p.label}</Text>
                <Text style={styles.tooltipText}>{p.members} members</Text>
                <Text style={styles.tooltipText}>{p.sessions} sessions</Text>
              </View>
            );
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    width: '100%',
    backgroundColor: 'transparent',
  },
  tooltip: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 4,
  },
  tooltipText: {
    fontSize: 11,
    color: '#64748b',
  },
});
