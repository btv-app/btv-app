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
  isFree?: boolean;
  status?: EventStatus;
  submittedBy?: string;
};

const SEEDS: Seed[] = [
  { title: 'Live Music on the Patio', town: 'Ashland City', venue: 'Riverside grill patio', inDays: 0, time: '7–10 PM', category: 'Music', isFree: true, description: 'Local acoustic duo playing country and classic rock covers. No cover charge.' },
  { title: 'Fall Fest on Main', town: 'Ashland City', venue: 'Downtown Main Street', inDays: 1, time: '10 AM – 4 PM', category: 'Festival', isFree: true, description: "Craft vendors, food trucks, a kids' zone and live music on the courthouse lawn. Free to attend." },
  { title: 'Saturday Farmers Market', town: 'Kingston Springs', venue: 'City Park pavilion', inDays: 1, time: '8 AM – Noon', category: 'Food', isFree: true, description: 'Late-season produce, honey, baked goods and handmade soap from local growers.' },
  { title: 'Coffeehouse Songwriter Night', town: 'Pleasant View', venue: 'Coffee shop on Hwy 41A', inDays: 2, time: '6 PM ($5 cover)', category: 'Music', description: 'Three local songwriters trade songs in the round. $5 at the door.' },
  { title: 'Community Blood Drive', town: 'Ashland City', venue: 'First Baptist fellowship hall', inDays: 4, time: '11 AM – 5 PM', category: 'Support a Cause', isFree: true, description: 'Walk-ins welcome. Bring a photo ID. Every donor gets a T-shirt.' },
  { title: 'Free Flu Shot Clinic', town: 'Kingston Springs', venue: 'County health department', inDays: 5, time: '9 AM – 3 PM', category: 'Community Resources', isFree: true, description: 'Free flu shots for ages 6 months and up while supplies last. No appointment needed.' },
  { title: 'Bluegrass on the Porch', town: 'Pegram', venue: 'Pegram Town Hall lawn', inDays: 7, time: '6:00 PM', category: 'Music', isFree: true, description: 'Bring a lawn chair. Open jam after the featured set, all skill levels welcome.' },
  { title: 'Harpeth River Cleanup', town: 'Kingston Springs', venue: 'Harpeth River access', inDays: 8, time: '9:00 AM', category: 'Community', isFree: true, description: 'Gloves and bags provided. Wear shoes that can get wet. Lunch for volunteers afterward.' },
  { title: 'Pumpkin Patch Weekend', town: 'Pleasant View', venue: 'Family farm on Hwy 41A', inDays: 8, time: '10 AM – 6 PM', category: 'Family', description: 'Hayrides, corn maze and pick-your-own pumpkins. $8 per person, under 3 free.' },
  { title: 'Food Pantry Distribution', town: 'Pegram', venue: 'Pegram community church', inDays: 10, time: '4 – 6 PM', category: 'Community Resources', isFree: true, description: 'Drive-through grocery boxes for any Cheatham County family. No paperwork required.' },
  { title: 'Craft & Vendor Fair', town: 'Chapmansboro', venue: 'Community center', inDays: 15, time: '9 AM – 3 PM', category: 'Shopping', isFree: true, description: 'Forty local makers under one roof, just in time for early holiday shopping.' },
  { title: 'Riverbluff 5K', town: 'Ashland City', venue: 'Bicentennial Trail', inDays: 15, time: '8:00 AM', category: 'Fitness', description: '$25 entry. Flat, fast course along the river. Proceeds go to the county food bank.' },
  { title: 'Library Story Time', town: 'Pleasant View', venue: 'Pleasant View branch library', inDays: 5, time: '10:30 AM', category: 'Family', isFree: true, description: 'Stories, songs and a craft for ages 2–6.', status: 'pending', submittedBy: 'Jessica R.' },
  { title: 'Chili Cook-Off Fundraiser', town: 'Pegram', venue: 'Fire Hall', inDays: 14, time: '5:00 PM', category: 'Support a Cause', description: 'Taste a dozen chilis for $10. Proceeds support the volunteer fire department.', status: 'pending', submittedBy: 'Pegram VFD' },
  { title: 'Open Mic Night', town: 'Kingston Springs', venue: 'Coffee shop on Main', inDays: 13, time: '7:00 PM', category: 'Music', isFree: true, description: 'Sign-up starts at 6:30. Acoustic sets, poetry and comedy.', status: 'pending', submittedBy: 'Tyler M.' },
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
      isFree: seed.isFree ?? false,
      latitude: center.latitude + offset,
      longitude: center.longitude - offset,
      status: seed.status ?? 'approved',
      submittedBy: seed.submittedBy,
    };
  });
}
