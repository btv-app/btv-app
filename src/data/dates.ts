const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Parse YYYY-MM-DD as a local date (not UTC). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysFromToday(iso: string): number {
  return Math.round((parseDate(iso).getTime() - startOfToday().getTime()) / DAY_MS);
}

export function weekdayShort(iso: string) {
  return WEEKDAYS[parseDate(iso).getDay()];
}

export function monthShort(iso: string) {
  return MONTHS[parseDate(iso).getMonth()];
}

export function monthName(month: number) {
  return MONTH_NAMES[month];
}

export function longDate(iso: string) {
  const d = parseDate(iso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/** Group label in BTV's voice, e.g. "this weekend". */
export function groupLabel(iso: string): string {
  const diff = daysFromToday(iso);
  if (diff < 0) return 'earlier';
  if (diff === 0) return 'today';
  const daysToSunday = (7 - startOfToday().getDay()) % 7;
  if (diff <= daysToSunday) {
    const weekday = parseDate(iso).getDay();
    const isWeekend = weekday === 5 || weekday === 6 || weekday === 0;
    return isWeekend ? 'this weekend' : 'this week';
  }
  if (diff <= daysToSunday + 7) return 'next week';
  return `later in ${MONTH_NAMES[parseDate(iso).getMonth()]}`;
}

/** "7 PM" on the hour, otherwise "6:30 PM". */
export function formatTime(date: Date, withMeridiem = true): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const clock = `${hours % 12 || 12}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
  return withMeridiem ? `${clock} ${hours < 12 ? 'AM' : 'PM'}` : clock;
}

/** "7 – 10 PM", "10 AM – 4 PM", or just the start time when there's no end. */
export function timeRange(start: Date, end: Date | null): string {
  if (!end) return formatTime(start);
  const sameHalf = start.getHours() < 12 === end.getHours() < 12;
  return `${formatTime(start, !sameHalf)} – ${formatTime(end)}`;
}

/** 24-hour "HH:MM" for the database. */
export function toClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Reads start and end times out of free text like "7–10 PM", "10 AM – 4 PM" or "8 AM – Noon",
 * for events added before the time pickers. Returns 24-hour "HH:MM" values, or null if unclear.
 */
export function parseTimeText(text: string): { start: string; end: string | null } | null {
  const found = [...text.replace(/noon/gi, '12 PM').matchAll(/(?<![$\d])(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?/gi)]
    .map((m) => ({ hour: Number(m[1]), minute: Number(m[2] ?? 0), half: m[3]?.toLowerCase() }))
    .filter((t) => t.hour >= 1 && t.hour <= 12 && t.minute < 60)
    .slice(0, 2);
  if (!found.length) return null;
  const lastHalf = found[found.length - 1].half;
  if (!lastHalf) return null;
  const toClock = ({ hour, minute, half }: (typeof found)[number]) => {
    const h = (hour % 12) + ((half ?? lastHalf) === 'p' ? 12 : 0);
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  return { start: toClock(found[0]), end: found[1] ? toClock(found[1]) : null };
}
