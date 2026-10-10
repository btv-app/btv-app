export const TOWNS = [
  'Ashland City',
  'Kingston Springs',
  'Pegram',
  'Pleasant View',
  'Chapmansboro',
] as const;

export type Town = (typeof TOWNS)[number];

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
  latitude: number;
  longitude: number;
  status: EventStatus;
  /** Display name of whoever submitted it, for the owner's review queue. */
  submittedBy?: string;
  submittedById?: string;
};

export type Role = 'guest' | 'resident' | 'owner';

/** Approximate town centers, used to place pins until venues are geocoded. */
export const TOWN_COORDS: Record<Town, { latitude: number; longitude: number }> = {
  'Ashland City': { latitude: 36.2742, longitude: -87.0642 },
  'Kingston Springs': { latitude: 36.0995, longitude: -87.1153 },
  Pegram: { latitude: 36.1006, longitude: -87.0517 },
  'Pleasant View': { latitude: 36.3945, longitude: -87.0367 },
  Chapmansboro: { latitude: 36.3742, longitude: -87.1253 },
};
