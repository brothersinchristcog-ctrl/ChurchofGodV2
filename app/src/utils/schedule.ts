import SalesforceService from '../services/SalesforceService';
import { PastorEvent } from '../types/event';

/**
 * Checks if a proposed time range overlaps with any existing events on the same day.
 * 
 * @param dateStr - The date string, e.g. "2026-06-08" or ISO timestamp
 * @param startMs - The proposed start time in epoch milliseconds
 * @param durationMins - The proposed duration in minutes
 * @param excludeEventId - Optional event ID to exclude from conflict checks (e.g. when editing)
 * @returns Array of overlapping event titles. Empty array if no conflicts.
 */
export const checkScheduleConflicts = async (
  dateStr: string,
  startMs: number,
  durationMins: number,
  excludeEventId?: string,
  preFetchedEvents?: PastorEvent[]
): Promise<string[]> => {
  try {
    const existingEvents = preFetchedEvents || await SalesforceService.getPastorEvents();
    
    // Normalize target date to YYYY-MM-DD
    let targetDateStr = dateStr;
    if (dateStr.includes('T')) {
      targetDateStr = dateStr.split('T')[0];
    }

    const sameDayEvents = existingEvents.filter(e => 
      e.date === targetDateStr && e.id !== excludeEventId
    );

    if (sameDayEvents.length === 0) return [];

    const endMs = startMs + (durationMins * 60000);
    const conflicts: string[] = [];

    for (const evt of sameDayEvents) {
      const evtStartMs = parseTime(evt.startTime, startMs);
      const evtEndMs = evtStartMs + ((evt.durationMins || 60) * 60000); // fallback 1hr

      if (startMs < evtEndMs && evtStartMs < endMs) {
        conflicts.push(`"${evt.title}" on ${evt.date} at ${evt.startTime}`);
      }
    }

    return conflicts;
  } catch (error) {
    console.error('Error checking schedule conflicts:', error);
    return []; // Fail silently so we don't block event creation
  }
};

// Helper to parse the 12-hour AM/PM string into a Date object on the target day
const parseTime = (timeStr: string, baseDateMs: number) => {
  if (!timeStr) return baseDateMs; // fallback
  
  const parts = timeStr.split(' ');
  let hours = 0, minutes = 0;
  
  if (parts.length >= 2) {
    const [time, modifier] = parts;
    const [h, m] = time.split(':');
    hours = parseInt(h, 10);
    if (hours === 12) hours = 0;
    if (modifier.toUpperCase() === 'PM') hours += 12;
    minutes = parseInt(m || '0', 10);
  } else {
    // Fallback for 24hr format
    const [h, m] = timeStr.split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m || '0', 10);
  }
  
  const d = new Date(baseDateMs);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
};

export const checkTravelConflicts = async (
  dateStr: string,
  startMs: number,
  durationMins: number,
  fullLocation: string,
  excludeEventId?: string,
  preFetchedEvents?: PastorEvent[]
): Promise<string[]> => {
  if (!fullLocation || fullLocation.trim() === '') return [];
  
  const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';
  if (!GOOGLE_KEY) return [];

  try {
    const existingEvents = preFetchedEvents || await SalesforceService.getPastorEvents();
    
    let targetDateStr = dateStr;
    if (dateStr.includes('T')) {
      targetDateStr = dateStr.split('T')[0];
    }

    const sameDayEvents = existingEvents.filter(e => 
      e.date === targetDateStr && e.id !== excludeEventId
    );

    if (sameDayEvents.length === 0) return [];

    const endMs = startMs + (durationMins * 60000);

    // Find the adjacent events
    let prevEvent: any = null;
    let nextEvent: any = null;
    
    let prevEventEndMs = 0;
    let nextEventStartMs = Number.MAX_SAFE_INTEGER;

    for (const evt of sameDayEvents) {
      const evtStartMs = parseTime(evt.startTime, startMs);
      const evtEndMs = evtStartMs + ((evt.durationMins || 60) * 60000);

      // We only care about non-overlapping adjacent events
      // Prev event ends before our new event starts
      if (evtEndMs <= startMs && evtEndMs > prevEventEndMs) {
        prevEventEndMs = evtEndMs;
        prevEvent = evt;
      }
      // Next event starts after our new event ends
      if (evtStartMs >= endMs && evtStartMs < nextEventStartMs) {
        nextEventStartMs = evtStartMs;
        nextEvent = evt;
      }
    }

    const conflicts: string[] = [];

    // Geocode the new event's location to get lat/lng
    const geoResp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullLocation)}&key=${GOOGLE_KEY}`);
    const geoData = await geoResp.json();
    let newLat: number | null = null;
    let newLng: number | null = null;
    
    if (geoData.status === 'OK' && geoData.results[0]) {
      newLat = geoData.results[0].geometry.location.lat;
      newLng = geoData.results[0].geometry.location.lng;
    } else {
      return []; // Can't geocode, so can't calculate distance
    }

    const destStr = `${newLat},${newLng}`;

    // Check distance to previous event
    if (prevEvent && prevEvent.lat && prevEvent.lng) {
      const gapMins = (startMs - prevEventEndMs) / 60000;
      const origStr = `${prevEvent.lat},${prevEvent.lng}`;
      
      const distResp = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origStr}&destinations=${destStr}&key=${GOOGLE_KEY}`);
      const distData = await distResp.json();
      
      if (distData.status === 'OK' && distData.rows[0].elements[0].status === 'OK') {
        const driveDurationSecs = distData.rows[0].elements[0].duration.value;
        const driveDurationMins = Math.ceil(driveDurationSecs / 60);
        
        // Add a 10 min buffer
        if (gapMins < driveDurationMins) {
          const prevLocName = prevEvent.city || prevEvent.venue || 'Previous Event';
          const newLocName = fullLocation.split('—')[0].trim();
          conflicts.push(`It takes ~${driveDurationMins} minutes to travel from ${prevLocName} to ${newLocName}, but you only have a ${gapMins} minute gap between events.`);
        }
      }
    }

    // Check distance to next event
    if (nextEvent && nextEvent.lat && nextEvent.lng) {
      const gapMins = (nextEventStartMs - endMs) / 60000;
      const nextOrigStr = destStr;
      const nextDestStr = `${nextEvent.lat},${nextEvent.lng}`;
      
      const distResp = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${nextOrigStr}&destinations=${nextDestStr}&key=${GOOGLE_KEY}`);
      const distData = await distResp.json();
      
      if (distData.status === 'OK' && distData.rows[0].elements[0].status === 'OK') {
        const driveDurationSecs = distData.rows[0].elements[0].duration.value;
        const driveDurationMins = Math.ceil(driveDurationSecs / 60);
        
        if (gapMins < driveDurationMins) {
          const nextLocName = nextEvent.city || nextEvent.venue || 'Next Event';
          const newLocName = fullLocation.split('—')[0].trim();
          conflicts.push(`It takes ~${driveDurationMins} minutes to travel from ${newLocName} to ${nextLocName}, but you only have a ${gapMins} minute gap before the next event starts.`);
        }
      }
    }

    return conflicts;
  } catch (error) {
    console.error('Error checking travel conflicts:', error);
    return [];
  }
};
