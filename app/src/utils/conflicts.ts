import dayjs from 'dayjs';
import { PastorEvent } from '../types/event';

export interface RouteLeg {
  distKm: number;
  minutes: number;
  mode: string;
}

export const detectConflicts = (events: PastorEvent[], legs: RouteLeg[]) => {
  const conflicts = [];
  for (let i = 0; i < events.length - 1; i++) {
    const current = events[i];
    const next = events[i + 1];
    
    // Leg corresponding to travel between current and next event
    // legs[0]: Home -> Event 0
    // legs[1]: Event 0 -> Event 1
    // So leg index is i + 1.
    const travelMin = legs[i + 1]?.minutes ?? 0;
    
    const currentStart = dayjs(`${current.date}T${current.startTime}`);
    const currentEnd = currentStart.add(current.durationMins, 'minute');
    const nextStart = dayjs(`${next.date}T${next.startTime}`);
    
    const gapMins = nextStart.diff(currentEnd, 'minute');
    
    if (gapMins < travelMin + 15) { // 15-min buffer
      conflicts.push({
        message: `⚠ Only ${gapMins} min gap between "${current.title}" and "${next.title}". Travel takes ~${travelMin} min.`,
      });
    }
  }
  return conflicts;
};
