export const TOWNS = [
  'Ashland City',
  'Kingston Springs',
  'Pegram',
  'Pleasant View',
  'Chapmansboro',
] as const;

export type Town = (typeof TOWNS)[number];

export const CATEGORIES = [
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

export type Category = (typeof CATEGORIES)[number];

export type EventStatus = 'pending' | 'approved' | 'declined';

export type BtvEvent = {
  id: string;
  title: string;
  town: Town;
  venue: string;
  /** Local date, YYYY-MM-DD */
  date: string;
  /** Free text as the organizer wrote it, e.g. "7-10 PM" */
  time: string;
  category: Category;
  description: string;
  isFree: boolean;
  latitude: number;
  longitude: number;
  status: EventStatus;
  submittedBy?: string;
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
