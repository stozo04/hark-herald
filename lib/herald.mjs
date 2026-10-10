// Pure logic for the Hark tracker. Everything here is tested; keep DOM code in app.mjs.
// Brett posted the promise on Saturday Oct 10. Day 1 is Monday Oct 12 (a weekend's grace),
// but features shipped from Oct 10 on still count.
export const PROMISE_DATE = '2026-10-10';
export const START = '2026-10-12';
export const END = '2026-12-10';
export const TOTAL_DAYS = 60;
export const PROMISED = 12;
const DAY_MS = 86_400_000;
const START_MS = Date.parse(`${START}T00:00:00.000Z`);

/** Calendar date only: avoids timezone drift and rejects impossible dates. */
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) return null;
  return ms;
}

/** Day 1 is Oct 12, day 60 is Dec 10. Anything outside the window is null. */
export function dayNumber(date) {
  const ms = parseDate(date);
  if (ms === null) return null;
  const day = (ms - START_MS) / DAY_MS + 1;
  return day >= 1 && day <= TOTAL_DAYS ? day : null;
}

/** The calendar date for a challenge day number. */
export function dateForDay(day) {
  return new Date(START_MS + (day - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** All 60 days as {day, date}. */
export function allDays() {
  return Array.from({ length: TOTAL_DAYS }, (_, i) => ({ day: i + 1, date: dateForDay(i + 1) }));
}

/** Returns a canonical X post URL or null. External redirects are never accepted. */
export function normalizeSourceUrl(value) {
  if (typeof value !== 'string') return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname)) return null;
  const match = url.pathname.match(/^\/(?:([A-Za-z0-9_]{1,15})\/status|i\/status)\/(\d{1,20})\/?$/);
  if (!match) return null;
  return `https://x.com/${match[1] || 'i'}/status/${match[2]}`;
}

/** Features in the order they shipped. Ties on a date keep id order so seals never shuffle. */
export function ordered(features) {
  return [...features].sort((a, b) => a.shipped_on.localeCompare(b.shipped_on) || a.id.localeCompare(b.id));
}

/**
 * The twelve seals. The first twelve features shipped inside the window fill them in order.
 * Extra features inside the window are bonus; anything after Dec 10 is late and fills nothing.
 */
export function seals(features) {
  const inWindow = ordered(features).filter(f => f.shipped_on >= PROMISE_DATE && f.shipped_on <= END);
  const late = ordered(features).filter(f => f.shipped_on > END);
  return {
    slots: Array.from({ length: PROMISED }, (_, i) => ({ number: i + 1, feature: inWindow[i] ?? null })),
    bonus: inWindow.slice(PROMISED),
    late,
  };
}

/**
 * Pace for "12 features in 60 days" is one feature every five days.
 * On pace means delivered is between floor(day/5) and ceil(day/5), counting today.
 */
export function pace(features, today) {
  const delivered = features.filter(f => f.shipped_on >= PROMISE_DATE && f.shipped_on <= END && (!today || f.shipped_on <= today)).length;
  const counted = Math.min(delivered, PROMISED);
  const base = { delivered, counted, bonus: Math.max(0, delivered - PROMISED), left: Math.max(0, PROMISED - delivered) };
  if (typeof today !== 'string' || today < START) {
    return { ...base, phase: 'upcoming', day: 0, daysLeft: TOTAL_DAYS, expected: 0, status: 'upcoming', nextDue: delivered >= PROMISED ? null : dateForDay(Math.min(TOTAL_DAYS, (delivered + 1) * (TOTAL_DAYS / PROMISED))) };
  }
  if (today > END) {
    return { ...base, phase: 'complete', day: TOTAL_DAYS, daysLeft: 0, expected: PROMISED, status: delivered >= PROMISED ? 'kept' : 'short', nextDue: null };
  }
  const day = dayNumber(today);
  const expected = Math.round((day * PROMISED / TOTAL_DAYS) * 10) / 10;
  const low = Math.floor(expected), high = Math.ceil(expected);
  const status = delivered >= PROMISED ? 'kept' : delivered > high ? 'ahead' : delivered < low ? 'behind' : 'on-pace';
  const nextDueDay = Math.min(TOTAL_DAYS, (delivered + 1) * (TOTAL_DAYS / PROMISED));
  return { ...base, phase: 'live', day, daysLeft: TOTAL_DAYS - day, expected, status, nextDue: delivered >= PROMISED ? null : dateForDay(nextDueDay) };
}

/** Latest public user count, and how much it grew since the first record. */
export function userTally(counts) {
  if (!Array.isArray(counts) || !counts.length) return null;
  const sorted = [...counts].sort((a, b) => a.as_of.localeCompare(b.as_of));
  const first = sorted[0], latest = sorted.at(-1);
  return { users: latest.users, as_of: latest.as_of, source_url: latest.source_url, growth: latest.users - first.users, since: first.as_of, points: sorted.length };
}

/** Compact user count: 562000 -> "562K", 1250000 -> "1.25M". */
export function compact(n) {
  if (n >= 1_000_000) return `${Math.round(n / 10_000) / 100}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/** Route map geometry, in a 1200×240 viewBox. Day 1 sits at x=40, day 60 at x=1160. */
export const ROUTE = { width: 1200, height: 240 };
export function routeX(day) {
  return 40 + (day - 1) * 1120 / (TOTAL_DAYS - 1);
}
export function routeY(x) {
  return 140 + 26 * Math.sin((x - 40) / 1120 * Math.PI * 3);
}
/** The road as an SVG path, sampled every 20px. */
export function roadPath() {
  const pts = [];
  for (let x = 20; x <= 1180; x += 20) pts.push(`${x},${Math.round(routeY(x))}`);
  return `M${pts.join(' L')}`;
}
/** Pace signs: stop n is due on day 5n. */
export function paceSigns(delivered) {
  return Array.from({ length: PROMISED }, (_, i) => {
    const n = i + 1, day = n * (TOTAL_DAYS / PROMISED), x = routeX(day);
    return { n, day, date: dateForDay(day), x: Math.round(x), y: Math.round(routeY(x)), reached: n <= delivered };
  });
}
