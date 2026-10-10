import { daysFromToday, parseDate } from '@/data/dates';
import type { BtvEvent, Category, Town } from '@/data/types';

export type When = 'any' | 'today' | 'weekend' | 'week' | 'date';

export type EventFilters = {
  search: string;
  when: When;
  /** YYYY-MM-DD, used when `when` is 'date' */
  date: string | null;
  /** Empty means every category. */
  categories: Category[];
  town: Town | 'All';
  freeOnly: boolean;
};

export const DEFAULT_FILTERS: EventFilters = {
  search: '',
  when: 'any',
  date: null,
  categories: [],
  town: 'All',
  freeOnly: false,
};

export const WHEN_LABELS: Record<Exclude<When, 'date'>, string> = {
  any: 'Any time',
  today: 'Today',
  weekend: 'This weekend',
  week: 'Next 7 days',
};

/**
 * Days from today that make up "this weekend": the coming Friday through Sunday,
 * or what's left of it when today is already Friday, Saturday or Sunday.
 */
function weekendRange(): [number, number] {
  const weekday = new Date().getDay();
  if (weekday === 0) return [0, 0];
  const toFriday = Math.max(5 - weekday, 0);
  const toSunday = 7 - weekday;
  return [toFriday, toSunday];
}

function matchesWhen(event: BtvEvent, filters: EventFilters) {
  const diff = daysFromToday(event.date);
  switch (filters.when) {
    case 'any':
      return true;
    case 'today':
      return diff === 0;
    case 'weekend': {
      const [start, end] = weekendRange();
      return diff >= start && diff <= end;
    }
    case 'week':
      return diff >= 0 && diff <= 6;
    case 'date':
      return filters.date === null || event.date === filters.date;
  }
}

export function applyFilters(events: BtvEvent[], filters: EventFilters): BtvEvent[] {
  const query = filters.search.trim().toLowerCase();
  return events.filter(
    (e) =>
      matchesWhen(e, filters) &&
      (filters.categories.length === 0 || e.categories.some((c) => filters.categories.includes(c))) &&
      (filters.town === 'All' || e.town === filters.town) &&
      (!filters.freeOnly || e.isFree) &&
      (!query || [e.title, e.venue, e.town].some((field) => field.toLowerCase().includes(query))),
  );
}

/** How many filters differ from the defaults, for the badge on the Filters button. Search isn't counted. */
export function activeFilterCount(filters: EventFilters) {
  return (
    (filters.when !== 'any' ? 1 : 0) +
    filters.categories.length +
    (filters.town !== 'All' ? 1 : 0) +
    (filters.freeOnly ? 1 : 0)
  );
}

export function shortDateLabel(iso: string) {
  return parseDate(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
