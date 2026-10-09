import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EventCard } from '@/components/event-card';
import { Spacing } from '@/constants/theme';
import { TOWNS, type BtvEvent } from '@/data/types';

/** react-native-maps has no web support; on web the map view falls back to events grouped by town. */
export function EventMap({ events }: { events: BtvEvent[] }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <AppText type="small">The map shows on iPhone and Android. Here are the events by town.</AppText>
      {TOWNS.map((town) => {
        const inTown = events.filter((e) => e.town === town);
        if (!inTown.length) return null;
        return (
          <View key={town} style={{ gap: Spacing.two }}>
            <AppText type="script">{town}</AppText>
            {inTown.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
