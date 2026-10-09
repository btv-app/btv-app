import { addDays, startOfToday, toIsoDate } from '@/data/dates';
import { TOWN_COORDS, type BtvEvent, type Category, type EventStatus, type Town } from '@/data/types';

/**
 * Made-up events so every screen has something to show before the backend exists.
 * Dates are relative to today so the list never goes stale.
 */
type Seed = {
  title: string;
  town: Town;
  venue: string;
  inDays: number;
  time: string;
  category: Category;
  description: string;
  status?: EventStatus;
  submittedBy?: string;
};

const SEEDS: Seed[] = [
  { title: 'Friday Night Football: Homecoming', town: 'Ashland City', venue: 'Cheatham County Central High', inDays: 0, time: '7:00 PM', category: 'Sports', description: 'Homecoming game under the lights. Court presentation at halftime, concessions by the band boosters.' },
  { title: 'Fall Fest on Main', town: 'Ashland City', venue: 'Downtown Main Street', inDays: 1, time: '10 AM – 4 PM', category: 'Festival', description: "Craft vendors, food trucks, a kids' zone and live music on the courthouse lawn. Free to attend." },
  { title: 'Saturday Farmers Market', town: 'Kingston Springs', venue: 'City Park pavilion', inDays: 1, time: '8 AM – Noon', category: 'Food', description: 'Late-season produce, honey, baked goods and handmade soap from local growers.' },
  { title: 'Bluegrass on the Porch', town: 'Pegram', venue: 'Pegram Town Hall lawn', inDays: 7, time: '6:00 PM', category: 'Music', description: 'Bring a lawn chair. Open jam after the featured set, all skill levels welcome.' },
  { title: 'Harpeth River Cleanup', town: 'Kingston Springs', venue: 'Harpeth River access', inDays: 8, time: '9:00 AM', category: 'Community', description: 'Gloves and bags provided. Wear shoes that can get wet. Lunch for volunteers afterward.' },
  { title: 'Pumpkin Patch Weekend', town: 'Pleasant View', venue: 'Family farm on Hwy 41A', inDays: 8, time: '10 AM – 6 PM', category: 'Family', description: 'Hayrides, corn maze and pick-your-own pumpkins. Both days, rain or shine.' },
  { title: 'Craft & Vendor Fair', town: 'Chapmansboro', venue: 'Community center', inDays: 15, time: '9 AM – 3 PM', category: 'Shopping', description: 'Forty local makers under one roof, just in time for early holiday shopping.' },
  { title: 'Riverbluff 5K', town: 'Ashland City', venue: 'Bicentennial Trail', inDays: 15, time: '8:00 AM', category: 'Fitness', description: 'Flat, fast course along the river. Walkers and strollers welcome.' },
  { title: 'Library Story Time', town: 'Pleasant View', venue: 'Pleasant View branch library', inDays: 5, time: '10:30 AM', category: 'Family', description: 'Stories, songs and a craft for ages 2–6.', status: 'pending', submittedBy: 'Jessica R.' },
  { title: 'Chili Cook-Off Fundraiser', town: 'Pegram', venue: 'Fire Hall', inDays: 14, time: '5:00 PM', category: 'Food', description: 'Taste a dozen chilis for $10. Proceeds support the volunteer fire department.', status: 'pending', submittedBy: 'Pegram VFD' },
  { title: 'Open Mic Night', town: 'Kingston Springs', venue: 'Coffee shop on Main', inDays: 13, time: '7:00 PM', category: 'Music', description: 'Sign-up starts at 6:30. Acoustic sets, poetry and comedy.', status: 'pending', submittedBy: 'Tyler M.' },
];

export function sampleEvents(): BtvEvent[] {
  const today = startOfToday();
  return SEEDS.map((seed, i) => {
    const center = TOWN_COORDS[seed.town];
    // Spread pins a little so events in the same town don't stack exactly.
    const offset = ((i % 5) - 2) * 0.004;
    return {
      id: `sample-${i + 1}`,
      title: seed.title,
      town: seed.town,
      venue: seed.venue,
      date: toIsoDate(addDays(today, seed.inDays)),
      time: seed.time,
      category: seed.category,
      description: seed.description,
      latitude: center.latitude + offset,
      longitude: center.longitude - offset,
      status: seed.status ?? 'approved',
      submittedBy: seed.submittedBy,
    };
  });
}
