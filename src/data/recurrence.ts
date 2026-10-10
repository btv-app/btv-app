import { addDays, parseDate, startOfToday, toIsoDate } from '@/data/dates';
import type { BtvEvent } from '@/data/types';

/**
 * How an event repeats, modeled on Google Calendar's options. The pattern is read relative to the
 * event's first date: "monthly by weekday" on Saturday, October 11 means the second Saturday.
 */
export type Recurrence = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Every N days, weeks, months or years. */
  interval: number;
  /** Weekly only: days of the week, 0 = Sunday. The first date always counts, whatever its weekday. */
  weekdays?: number[];
  /** Monthly only: the same day number, the same nth weekday, or the last such weekday. */
  monthlyBy?: 'day' | 'weekday' | 'lastWeekday';
  /** Last possible date, YYYY-MM-DD, inclusive. */
  until?: string;
  /** Total number of dates, counting the first. */
  count?: number;
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];
const UNIT = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' } as const;

/** Upper bounds so a typo can't create thousands of dates. */
export const MAX_INTERVAL = 99;
export const MAX_COUNT = 200;

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Which Saturday of the month (1–5) a date is, and whether it's the last one. */
export function weekdayPosition(iso: string) {
  const d = parseDate(iso);
  const nth = Math.ceil(d.getDate() / 7);
  const isLast = d.getDate() + 7 > daysInMonth(d.getFullYear(), d.getMonth());
  return { weekday: d.getDay(), nth, isLast };
}

/** "the second Saturday" or "the last Saturday". */
function weekdayPhrase(iso: string, last: boolean) {
  const { weekday, nth } = weekdayPosition(iso);
  return `the ${last ? 'last' : ORDINALS[nth - 1]} ${WEEKDAY_NAMES[weekday]}`;
}

/** The nth (or last) given weekday in a month, or null when that month doesn't have one. */
function nthWeekday(year: number, month: number, weekday: number, nth: number, last: boolean): Date | null {
  if (last) {
    const lastDay = new Date(year, month, daysInMonth(year, month));
    return addDays(lastDay, -((lastDay.getDay() - weekday + 7) % 7));
  }
  const first = new Date(year, month, 1);
  const day = 1 + ((weekday - first.getDay() + 7) % 7) + (nth - 1) * 7;
  return day <= daysInMonth(year, month) ? new Date(year, month, day) : null;
}

/** The options Google Calendar shows for an event on this date, in the same order. */
export function presetRules(startIso: string): { label: string; rule: Recurrence | null }[] {
  const d = parseDate(startIso);
  const { nth, isLast } = weekdayPosition(startIso);
  const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const options: { label: string; rule: Recurrence | null }[] = [
    { label: 'Does not repeat', rule: null },
    { label: 'Daily', rule: { freq: 'daily', interval: 1 } },
    { label: `Weekly on ${WEEKDAY_NAMES[d.getDay()]}`, rule: { freq: 'weekly', interval: 1, weekdays: [d.getDay()] } },
  ];
  // Most months have no fifth Saturday, so like Google, a fifth one is only offered as "the last".
  if (nth < 5) {
    options.push({ label: `Monthly on ${weekdayPhrase(startIso, false)}`, rule: { freq: 'monthly', interval: 1, monthlyBy: 'weekday' } });
  }
  if (isLast) {
    options.push({ label: `Monthly on ${weekdayPhrase(startIso, true)}`, rule: { freq: 'monthly', interval: 1, monthlyBy: 'lastWeekday' } });
  }
  options.push(
    { label: `Annually on ${monthDay}`, rule: { freq: 'yearly', interval: 1 } },
    { label: 'Every weekday (Monday to Friday)', rule: { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] } },
  );
  return options;
}

/** Plain-English summary, e.g. "Every 2 weeks on Tue, Thu, until Dec 20". */
export function describeRule(rule: Recurrence | null | undefined, startIso: string): string {
  if (!rule) return 'Does not repeat';
  const d = parseDate(startIso);
  const unit = UNIT[rule.freq];
  let text = rule.interval === 1 ? { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Annually' }[rule.freq] : `Every ${rule.interval} ${unit}s`;

  if (rule.freq === 'weekly') {
    const days = [...(rule.weekdays ?? [d.getDay()])].sort();
    const weekdaysOnly = days.join() === '1,2,3,4,5';
    if (weekdaysOnly && rule.interval === 1) text = 'Every weekday (Monday to Friday)';
    else text += ` on ${days.length === 1 ? WEEKDAY_NAMES[days[0]] : days.map((n) => WEEKDAY_SHORT[n]).join(', ')}`;
  } else if (rule.freq === 'monthly') {
    text += rule.monthlyBy === 'day' ? ` on day ${d.getDate()}` : ` on ${weekdayPhrase(startIso, rule.monthlyBy === 'lastWeekday')}`;
  } else if (rule.freq === 'yearly') {
    text += ` on ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  }

  if (rule.until) text += `, until ${parseDate(rule.until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  else if (rule.count) text += `, ${rule.count} times`;
  return text;
}

/**
 * The event's dates between `fromIso` and `toIso` (inclusive), starting from its first date.
 * `count` and `until` are counted from the first date, so a "10 times" series ends on its 10th date
 * even when earlier ones are before `fromIso`.
 */
export function occurrenceDates(startIso: string, rule: Recurrence | null | undefined, fromIso: string, toIso: string): string[] {
  if (!rule) return startIso >= fromIso && startIso <= toIso ? [startIso] : [];
  const start = parseDate(startIso);
  const interval = Math.min(Math.max(1, Math.floor(rule.interval) || 1), MAX_INTERVAL);
  const lastIso = rule.until && rule.until < toIso ? rule.until : toIso;
  const maxCount = rule.count ? Math.min(rule.count, MAX_COUNT) : Infinity;
  const { nth } = weekdayPosition(startIso);
  const found: string[] = [];
  let generated = 0;

  // Each step is one period (a day, week, month or year times the interval).
  for (let step = 0; step < 5000; step++) {
    let candidates: Date[];
    if (rule.freq === 'daily') {
      candidates = [addDays(start, step * interval)];
    } else if (rule.freq === 'weekly') {
      const weekStart = addDays(start, -start.getDay() + step * interval * 7);
      const days = [...new Set(rule.weekdays?.length ? rule.weekdays : [start.getDay()])].sort((a, b) => a - b);
      candidates = days.map((wd) => addDays(weekStart, wd)).filter((date) => date > start);
      if (step === 0) candidates.unshift(start);
    } else if (rule.freq === 'monthly') {
      const monthIndex = start.getMonth() + step * interval;
      const year = start.getFullYear() + Math.floor(monthIndex / 12);
      const month = monthIndex % 12;
      const date =
        rule.monthlyBy === 'day'
          ? start.getDate() <= daysInMonth(year, month) ? new Date(year, month, start.getDate()) : null
          : nthWeekday(year, month, start.getDay(), nth, rule.monthlyBy === 'lastWeekday');
      candidates = date ? [date] : [];
    } else {
      const year = start.getFullYear() + step * interval;
      // February 29 only happens in leap years.
      candidates = start.getDate() <= daysInMonth(year, start.getMonth()) ? [new Date(year, start.getMonth(), start.getDate())] : [];
    }

    for (const date of candidates) {
      const iso = toIsoDate(date);
      if (iso > lastIso || generated >= maxCount) return found;
      generated++;
      if (iso >= fromIso) found.push(iso);
    }
  }
  return found;
}

/** Joins an event id and one of its dates into the id of that date's listing. */
const SEPARATOR = '~';

/** The event a listing belongs to: its own id, or the repeating event's id for one of its dates. */
export function seriesKey(event: BtvEvent): string {
  return event.seriesId ?? event.id;
}

/** Splits a listing id from a link back into the event id and, for a repeating event, the date. */
export function parseListingId(id: string): { eventId: string; date?: string } {
  const [eventId, date] = id.split(SEPARATOR);
  return { eventId, date };
}

/** One listing for a given date of an event. */
export function onDate(event: BtvEvent, date: string): BtvEvent {
  return event.recurrence ? { ...event, id: `${event.id}${SEPARATOR}${date}`, seriesId: event.id, date } : event;
}

/**
 * Turns repeating events into one listing per date, from a month back to six months ahead,
 * so they show on each day in the list, calendar and filters.
 */
export function expandSeries(events: BtvEvent[]): BtvEvent[] {
  const today = startOfToday();
  const from = toIsoDate(addDays(today, -31));
  const to = toIsoDate(addDays(today, 183));
  return events.flatMap((e) =>
    e.recurrence ? occurrenceDates(e.date, e.recurrence, e.date > from ? e.date : from, to).map((date) => onDate(e, date)) : [e],
  );
}

/** For lists that should show each event once (saved, map): the next date of each repeating event. */
export function nextOfEach(listings: BtvEvent[]): BtvEvent[] {
  const today = toIsoDate(startOfToday());
  const chosen = new Map<string, BtvEvent>();
  for (const e of listings) {
    const key = seriesKey(e);
    const current = chosen.get(key);
    // Prefer the earliest date from today on; if every date has passed, the latest one.
    const better =
      !current ||
      (e.date >= today && (current.date < today || e.date < current.date)) ||
      (e.date < today && current.date < today && e.date > current.date);
    if (better) chosen.set(key, e);
  }
  return listings.filter((e) => chosen.get(seriesKey(e)) === e);
}
