/**
 * Demo activity dataset for the App Activity dashboard.
 */

export type EventType =
  | "APP_OPEN"
  | "APP_CLOSE"
  | "SESSION_START"
  | "SESSION_END"
  | "SCREEN_VIEW"
  | "SERMON_VIEW"
  | "BIBLE_VIEW"
  | "EVENT_VIEW"
  | "PRAYER_VIEW"
  | "SONG_VIEW"
  | "GALLERY_VIEW"
  | "LIVE_CHAT_JOIN"
  | "NOTIFICATION_OPEN"
  | "SUBSCRIPTION_OPEN";

export type Feature =
  | "Sermons"
  | "Bible"
  | "Events"
  | "Prayer Wall"
  | "Songs";

export const FEATURES: Feature[] = [
  "Sermons",
  "Bible",
  "Events",
  "Prayer Wall",
  "Songs",
];

const FEATURE_EVENT: Record<Feature, EventType> = {
  Sermons: "SERMON_VIEW",
  Bible: "BIBLE_VIEW",
  Events: "EVENT_VIEW",
  "Prayer Wall": "PRAYER_VIEW",
  Songs: "SONG_VIEW",
};

export interface Member {
  userId: string;
  name: string;
  initials: string;
  role: string;
  deviceType: "Android" | "iOS" | "Web";
  appVersion: string;
  profilePicture?: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
  isActive?: boolean;
  durationSec: number;
  deviceType: Member["deviceType"];
  appVersion: string;
  events: ActivityEvent[];
  member?: Member; // Added for real data
}

export interface ActivityEvent {
  activityId: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  feature: Feature | null;
  timestamp: Date;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  "John David", "Mary Susan", "David Kumar", "Sarah Raj", "Daniel Prakash",
  "Esther Jacob", "Samuel Thomas", "Ruth Anand", "Peter Joseph", "Hannah Rani",
  "Paul Selvam", "Grace Mathew", "Stephen Babu", "Rebecca Nair", "Timothy Reddy",
  "Lydia George", "Andrew Bose", "Martha Pillai", "Philip Varghese", "Naomi Sharma",
  "Joshua Devan", "Priscilla John", "Barnabas Rao", "Deborah Isaac", "Silas Kurian",
  "Abigail Menon", "Titus Fernandes", "Miriam Das", "Elijah Roy", "Tabitha Singh",
  "Mark Antony", "Joanna Philip", "Levi Chacko", "Salome Thomas", "Cornelius Raj",
  "Dorcas Benny", "Nathan Wilson", "Keziah Paul", "Gideon Alex", "Susanna Mary",
  "Amos Jose", "Rhoda Kiran", "Caleb Mathai", "Eunice Ravi", "Jonah Peter",
  "Phoebe Anil", "Simeon Louis", "Rachel Vincent",
];

const ROLES = [
  "Member", "Youth", "Choir", "Sunday School", "Deacon", "Prayer Team", "Usher", "Media Team",
];

const DEVICES: Member["deviceType"][] = ["Android", "iOS", "Web"];

function initialsOf(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const SURNAMES = [
  "David", "Susan", "Kumar", "Raj", "Prakash", "Jacob", "Thomas", "Anand",
  "Joseph", "Rani", "Selvam", "Mathew", "Babu", "Nair", "Reddy", "George",
  "Bose", "Pillai", "Varghese", "Sharma", "Devan", "John", "Rao", "Isaac",
];

export const MEMBERS: Member[] = (() => {
  const list: Member[] = [];
  let i = 0;
  for (const first of NAMES) {
    const firstName = first.split(" ")[0]!;
    for (const surname of SURNAMES) {
      const rnd = mulberry32(1000 + i * 7);
      const name = `${firstName} ${surname}`;
      list.push({
        userId: `USER-${400 + i}`,
        name,
        initials: initialsOf(name),
        role: ROLES[Math.floor(rnd() * ROLES.length)]!,
        deviceType: DEVICES[Math.floor(rnd() * 3)]!,
        appVersion: rnd() > 0.35 ? "2.4.1" : "2.3.0",
      });
      i++;
    }
  }
  return list;
})();

export const TOTAL_MEMBERS = MEMBERS.length;

const HOUR_WEIGHT = [
  0.02, 0.01, 0.01, 0.01, 0.02, 0.06, 0.14, 0.2, 0.24, 0.26, 0.22, 0.18, 0.2, 0.16, 0.15, 0.18,
  0.24, 0.34, 0.62, 0.78, 0.58, 0.36, 0.16, 0.06,
];
const DAY_WEIGHT = [1, 0.62, 0.55, 0.74, 0.66, 0.6, 0.72];
const DAYS_OF_HISTORY = 92;

export interface ActivityDataset {
  today: Date;
  now: Date;
  sessions: Session[];
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function demoReference(realNow = new Date()) {
  const evening = new Date(realNow);
  evening.setHours(20, 15, 0, 0);
  return realNow > evening ? realNow : evening;
}

export function buildDataset(reference: Date): ActivityDataset {
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const seedBase = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const sessions: Session[] = [];
  let sessionCounter = 8000;
  let activityCounter = 10000;

  for (let dayOffset = DAYS_OF_HISTORY - 1; dayOffset >= 0; dayOffset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - dayOffset);
    const rnd = mulberry32(seedBase + dayOffset * 977);
    const dayWeight = DAY_WEIGHT[day.getDay()]!;
    const trend = 0.82 + ((DAYS_OF_HISTORY - dayOffset) / DAYS_OF_HISTORY) * 0.3;
    const targetSessions = Math.round((300 + rnd() * 90) * dayWeight * trend);

    for (let s = 0; s < targetSessions; s++) {
      let hour = 19;
      const total = HOUR_WEIGHT.reduce((a, b) => a + b, 0);
      let pick = rnd() * total;
      for (let h = 0; h < 24; h++) {
        pick -= HOUR_WEIGHT[h]!;
        if (pick <= 0) {
          hour = h;
          break;
        }
      }
      const minute = Math.floor(rnd() * 60);
      const second = Math.floor(rnd() * 60);
      const startedAt = new Date(day);
      startedAt.setHours(hour, minute, second, 0);
      if (startedAt > reference) continue;

      const ACTIVE_POOL = Math.floor(MEMBERS.length * 0.8);
      const memberIndex = Math.min(
        ACTIVE_POOL - 1,
        Math.floor(Math.pow(rnd(), 2.3) * ACTIVE_POOL),
      );
      const member = MEMBERS[memberIndex]!;

      const durationSec = Math.round(45 + Math.pow(rnd(), 2) * 1500);
      const endedAt = new Date(Math.min(startedAt.getTime() + durationSec * 1000, reference.getTime()));
      const sessionId = `SES-${sessionCounter++}`;

      const events: ActivityEvent[] = [
        {
          activityId: `ACT-${activityCounter++}`,
          userId: member.userId,
          sessionId,
          eventType: "APP_OPEN",
          feature: null,
          timestamp: startedAt,
        },
      ];

      const screenCount = 1 + Math.floor(rnd() * 4);
      for (let e = 0; e < screenCount; e++) {
        const featureIndex = Math.min(
          FEATURES.length - 1,
          Math.floor(Math.pow(rnd(), 1.35) * FEATURES.length),
        );
        const feature = FEATURES[featureIndex]!;
        const at = new Date(
          startedAt.getTime() + Math.round(((e + 1) / (screenCount + 1)) * durationSec * 1000),
        );
        if (at > reference) break;
        events.push({
          activityId: `ACT-${activityCounter++}`,
          userId: member.userId,
          sessionId,
          eventType: FEATURE_EVENT[feature],
          feature,
          timestamp: at,
        });
      }

      if (endedAt < reference) {
        events.push({
          activityId: `ACT-${activityCounter++}`,
          userId: member.userId,
          sessionId,
          eventType: "APP_CLOSE",
          feature: null,
          timestamp: endedAt,
        });
      }

      sessions.push({
        sessionId,
        userId: member.userId,
        startedAt,
        endedAt,
        durationSec: Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
        deviceType: member.deviceType,
        appVersion: member.appVersion,
        events,
      });
    }
  }

  sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { today, now: reference, sessions };
}

export const memberById = new Map(MEMBERS.map((m) => [m.userId, m]));

export function sessionsBetween(ds: ActivityDataset, from: Date, to: Date) {
  return ds.sessions.filter((s) => s.startedAt >= from && s.startedAt < to);
}

export function uniqueMembers(sessions: Session[]) {
  return new Set(sessions.map((s) => s.userId)).size;
}

export interface MemberActivitySummary {
  member: Member;
  sessions: number;
  lastActive: Date;
  totalDurationSec: number;
}

export function memberBreakdown(sessions: Session[]): MemberActivitySummary[] {
  const map = new Map<string, MemberActivitySummary>();
  for (const s of sessions) {
    const member = s.member || memberById.get(s.userId)!;
    const existing = map.get(s.userId);
    if (existing) {
      existing.sessions += 1;
      existing.totalDurationSec += s.durationSec;
      if (s.startedAt > existing.lastActive) existing.lastActive = s.startedAt;
    } else {
      map.set(s.userId, {
        member,
        sessions: 1,
        lastActive: s.startedAt,
        totalDurationSec: s.durationSec,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export interface HourBucket {
  hour: number;
  label: string;
  members: number;
  sessions: number;
  sessionList: Session[];
}

export function hourlyBuckets(ds: ActivityDataset, day: Date): HourBucket[] {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  const inRange = sessionsBetween(ds, from, to);
  const buckets: HourBucket[] = [];
  for (let h = 0; h < 24; h++) {
    const list = inRange.filter((s) => {
      // Include session if it started in this hour
      if (s.startedAt.getHours() === h) return true;
      // Include if it ended in this hour
      if (s.endedAt && s.endedAt.getHours() === h) return true;
      // Include if any events occurred during this hour
      if (s.events && s.events.some(e => e.timestamp.getHours() === h)) return true;
      return false;
    });
    buckets.push({
      hour: h,
      label: formatHourLabel(h),
      members: uniqueMembers(list),
      sessions: list.length,
      sessionList: list,
    });
  }
  return buckets;
}

export interface DayBucket {
  date: Date;
  key: string;
  label: string;
  members: number;
  sessions: number;
  sessionList: Session[];
}

export function dailyBuckets(ds: ActivityDataset, days: number): DayBucket[] {
  const buckets: DayBucket[] = [];
  const startOfToday = startOfDay(ds.today);
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(startOfToday, -i);
    const list = sessionsBetween(ds, date, addDays(date, 1));
    buckets.push({
      date,
      key: dateKey(date),
      label:
        days <= 7
          ? date.toLocaleDateString("en-US", { weekday: "short" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      members: uniqueMembers(list),
      sessions: list.length,
      sessionList: list,
    });
  }
  return buckets;
}

export function thisWeekBuckets(ds: ActivityDataset): DayBucket[] {
  const now = startOfDay(ds.today);
  const dayOfWeek = now.getDay();
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addDays(now, distanceToMonday);
  
  const buckets: DayBucket[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    const list = sessionsBetween(ds, date, addDays(date, 1));
    buckets.push({
      date,
      key: dateKey(date),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      members: uniqueMembers(list),
      sessions: list.length,
      sessionList: list,
    });
  }
  return buckets;
}

export interface HeatCell {
  weekday: number;
  hourBand: number;
  members: number;
}

export const HOUR_BANDS = [6, 9, 12, 15, 18, 21];

export function heatmap(ds: ActivityDataset, days = 28): HeatCell[] {
  const from = addDays(ds.today, -(days - 1));
  const inRange = sessionsBetween(ds, from, addDays(ds.today, 1));
  const cells: HeatCell[] = [];
  for (const band of HOUR_BANDS) {
    for (let wd = 1; wd <= 7; wd++) {
      const weekday = wd % 7;
      const list = inRange.filter(
        (s) => s.startedAt.getDay() === weekday && Math.floor(s.startedAt.getHours() / 3) * 3 === band,
      );
      cells.push({ weekday, hourBand: band, members: uniqueMembers(list) });
    }
  }
  return cells;
}

export interface FeatureUsage {
  feature: Feature;
  members: number;
  views: number;
  share: number;
}

export function featureUsage(sessions: Session[]): FeatureUsage[] {
  const activeMembers = Math.max(uniqueMembers(sessions), 1);
  const usage = FEATURES.map((feature) => {
    let trackedNames: string[] = [feature];
    if (feature === 'Prayer Wall') trackedNames = ['PrayerWall', 'Prayer'];
    if (feature === 'Bible') trackedNames = ['Bible', 'BibleReader', 'BibleChapters', 'BibleSearch', 'BiblePlans'];
    if (feature === 'Sermons') trackedNames = ['Sermons', 'SermonVideo'];
    if (feature === 'Events') trackedNames = ['Events', 'EventDetails'];

    const events = sessions.flatMap((s) => s.events.filter((e) => e.feature && trackedNames.includes(e.feature)));
    const members = new Set(events.map((e) => e.userId)).size;
    return {
      feature,
      members,
      views: events.length,
      share: Math.round((members / activeMembers) * 100),
    };
  });
  return usage.sort((a, b) => b.members - a.members);
}

export interface MemberProfile {
  member: Member;
  lastActive: Date | null;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  avgSessionSec: number;
  activeDaysLast30: number;
  timeline: { day: Date; events: ActivityEvent[] }[];
}

export function memberProfile(ds: ActivityDataset, userId: string): MemberProfile {
  let mine = ds.sessions.filter((s) => s.userId === userId);
  mine = mine.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  const member = mine.length > 0 && mine[0].member ? mine[0].member : memberById.get(userId)!;
  const weekFrom = addDays(ds.today, -6);
  const monthFrom = addDays(ds.today, -29);
  const week = mine.filter((s) => s.startedAt >= weekFrom);
  const month = mine.filter((s) => s.startedAt >= monthFrom);
  const activeDays = new Set(month.map((s) => dateKey(s.startedAt))).size;
  const avg = month.length
    ? Math.round(month.reduce((a, s) => a + s.durationSec, 0) / month.length)
    : 0;

  const byDay = new Map<string, { day: Date; events: ActivityEvent[] }>();
  for (const s of mine.slice(0, 60)) {
    const key = dateKey(s.startedAt);
    const entry = byDay.get(key) ?? { day: startOfDay(s.startedAt), events: [] };
    entry.events.push(...s.events);
    byDay.set(key, entry);
  }
  const timeline = [...byDay.values()]
    .sort((a, b) => b.day.getTime() - a.day.getTime())
    .slice(0, 6)
    .map((e) => ({
      day: e.day,
      events: e.events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 100),
    }));

  return {
    member,
    lastActive: mine.length ? mine[0]!.startedAt : null,
    sessionsThisWeek: week.length,
    sessionsThisMonth: month.length,
    avgSessionSec: avg,
    activeDaysLast30: activeDays,
    timeline,
  };
}

export function formatHourLabel(h: number) {
  const suffix = h < 12 ? "AM" : "PM";
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}${suffix}`;
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatExact(d: Date) {
  return `${d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
}

export function formatRelative(d: Date, today: Date) {
  const day = startOfDay(d);
  if (day.getTime() === today.getTime()) return `Today, ${formatTime(d)}`;
  if (day.getTime() === addDays(today, -1).getTime()) return `Yesterday, ${formatTime(d)}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${formatTime(d)}`;
}

export function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${pad(s)}s`;
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}
