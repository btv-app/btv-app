import type { Recurrence } from '@/data/recurrence';

/** Town names. The owner can add and remove towns in the app, so screens read the list from the store. */
export type Town = string;

/** A town and roughly where its center is, for map pins on events without an exact address. */
export type TownInfo = { name: Town; latitude: number; longitude: number };

/** The towns a new project starts with. */
export const DEFAULT_TOWNS: TownInfo[] = [
  { name: 'Ashland City', latitude: 36.2742, longitude: -87.0642 },
  { name: 'Kingston Springs', latitude: 36.0995, longitude: -87.1153 },
  { name: 'Pegram', latitude: 36.1006, longitude: -87.0517 },
  { name: 'Pleasant View', latitude: 36.3945, longitude: -87.0367 },
  { name: 'Chapmansboro', latitude: 36.3742, longitude: -87.1253 },
];

/** Roughly the middle of Cheatham County. */
export const COUNTY_CENTER = { latitude: 36.26, longitude: -87.09 };

/**
 * The categories a new project starts with. The owner can add and remove categories in the app,
 * so screens read the live list from the store, not this constant.
 */
export const DEFAULT_CATEGORIES = [
  'Music',
  'Family',
  'Food',
  'Festival',
  'Community',
  'Support a Cause',
  'Community Resources',
  'Fitness',
  'Shopping',
] as const;

export type Category = string;

/** Most categories one event can have. */
export const MAX_EVENT_CATEGORIES = 3;

export type EventStatus = 'pending' | 'approved' | 'declined';

export type BtvEvent = {
  id: string;
  title: string;
  town: Town;
  venue: string;
  /** Local date, YYYY-MM-DD */
  date: string;
  /** Display text, e.g. "7 – 10 PM" */
  time: string;
  /** One to three, the first is the main one. */
  categories: Category[];
  description: string;
  isFree: boolean;
  /** As the organizer wrote it, e.g. "$10, kids free". Empty for free events. */
  price?: string;
  /** Tickets, Facebook event or website. */
  link?: string;
  /** Street address; the venue name is in `venue`. */
  address?: string;
  /** Public URL of the flyer image. */
  flyerUrl?: string;
  /** Where the flyer is stored, so an edit can keep it. */
  flyerPath?: string;
  /** 24-hour "HH:MM" when known (events added before the time pickers only have `time`). */
  startTime?: string;
  endTime?: string;
  /** Still listed, marked as cancelled, so people who saved it find out. */
  cancelled: boolean;
  /** How the event repeats; each date then shows in the list and calendar. */
  recurrence?: Recurrence;
  /**
   * Set on one date of a repeating event: the id of the event it belongs to. Saving, editing and
   * cancelling use that id, so they apply to every date.
   */
  seriesId?: string;
  latitude: number;
  longitude: number;
  status: EventStatus;
  /** Display name of whoever submitted it, for the owner's review queue. */
  submittedBy?: string;
  submittedById?: string;
};

export type Role = 'guest' | 'resident' | 'owner';
