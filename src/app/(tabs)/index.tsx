import { Fragment, useState } from 'react';

import { AdSlot } from '@/components/ad-slot';
import { AppText } from '@/components/app-text';
import { Chips, Segmented } from '@/components/controls';
import { EventCalendar } from '@/components/event-calendar';
import { EventCard } from '@/components/event-card';
import { EventMap } from '@/components/event-map';
import { Screen } from '@/components/screen';
import { groupLabel } from '@/data/dates';
import { useStore } from '@/data/store';
import { TOWNS, type BtvEvent } from '@/data/types';

type View = 'list' | 'map' | 'calendar';
const TOWN_FILTERS = ['All', ...TOWNS] as const;

/** A sponsored card appears after this many events in the list. */
const AD_EVERY = 3;

export default function EventsScreen() {
  const { approved } = useStore();
  const [view, setView] = useState<View>('list');
  const [town, setTown] = useState<(typeof TOWN_FILTERS)[number]>('All');

  const events = approved.filter((e) => town === 'All' || e.town === town);

  return (
    <Screen>
      <Segmented
        options={[
          { value: 'list', label: 'List' },
          { value: 'map', label: 'Map' },
          { value: 'calendar', label: 'Calendar' },
        ]}
        value={view}
        onChange={setView}
      />
      <Chips options={TOWN_FILTERS} value={town} onChange={setTown} />
      {view === 'list' && <EventList events={events} />}
      {view === 'map' && <EventMap events={events} />}
      {view === 'calendar' && <EventCalendar events={events} />}
    </Screen>
  );
}

function EventList({ events }: { events: BtvEvent[] }) {
  if (!events.length) {
    return <AppText type="small">Nothing listed here yet. Know of something? Tap Submit to add it.</AppText>;
  }
  let lastGroup = '';
  return events.map((event, i) => {
    const group = groupLabel(event.date);
    const header = group !== lastGroup ? <AppText type="script">{group}</AppText> : null;
    lastGroup = group;
    return (
      <Fragment key={event.id}>
        {header}
        <EventCard event={event} />
        {(i + 1) % AD_EVERY === 0 && i < events.length - 1 && <AdSlot kind="native" />}
      </Fragment>
    );
  });
}
