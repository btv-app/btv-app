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
