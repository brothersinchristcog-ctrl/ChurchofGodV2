import React from 'react';
import { View, Text } from 'react-native';
import { colors, radius, typography } from '../theme/Theme';
import { TransportMode } from '../types/event';

export type RouteStop = {
  label: string;
  sublabel: string;
  isHome?: boolean;
};

export type RouteLeg = {
  distKm: number;
  minutes: number;
  mode: TransportMode;
};

const DOT_SIZE = 12;
const LINE_WIDTH = 2;

export const RouteChain = ({ stops, legs }: { stops: RouteStop[]; legs: RouteLeg[] }) => (
  <View>
    {stops.map((stop, i) => (
      <View key={i}>
        {/* Stop row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          {/* Dot + vertical line column */}
          <View style={{ alignItems: 'center', width: DOT_SIZE }}>
            <View style={{
              width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
              backgroundColor: stop.isHome ? colors.primary : colors.success,
              marginTop: 4,
            }} />
            {/* Draw line below except last stop */}
            {i < stops.length - 1 && (
              <View style={{ width: LINE_WIDTH, flex: 1, minHeight: 36,
                             backgroundColor: colors.border, marginTop: 3 }} />
            )}
          </View>
          {/* Stop text */}
          <View style={{ flex: 1, paddingBottom: 8 }}>
            <Text style={typography.body}>{stop.label}</Text>
            <Text style={typography.caption}>{stop.sublabel}</Text>
            {/* Leg badge — shown below each stop except the last */}
            {legs[i] && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                             backgroundColor: colors.bgTertiary, borderRadius: radius.sm,
                             alignSelf: 'flex-start', paddingHorizontal: 8,
                             paddingVertical: 3, marginTop: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
                  {legs[i].distKm.toFixed(1)} km
                </Text>
                <Text style={typography.caption}>
                  · {legs[i].minutes >= 60 ? `${Math.round(legs[i].minutes / 60 * 10) / 10} hours` : `${legs[i].minutes} mins`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    ))}
  </View>
);

export default RouteChain;
