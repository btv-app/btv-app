import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { AppText } from '@/components/app-text';
import { EventCard } from '@/components/event-card';
import { Radius, Spacing } from '@/constants/theme';
import { nextOfEach } from '@/data/recurrence';
import type { BtvEvent } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

/** Cheatham County, roughly centered on Ashland City. */
const COUNTY_REGION = {
  latitude: 36.25,
  longitude: -87.08,
  latitudeDelta: 0.42,
  longitudeDelta: 0.32,
};

export function EventMap({ events: listings }: { events: BtvEvent[] }) {
  const theme = useTheme();
  // One pin per event: a repeating event is pinned at its next date.
  const events = nextOfEach(listings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = events.find((e) => e.id === selectedId);

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={[styles.mapFrame, { borderColor: theme.border }]}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={COUNTY_REGION}>
          {events.map((e) => (
            <Marker
              key={e.id}
              coordinate={{ latitude: e.latitude, longitude: e.longitude }}
              title={e.title}
              description={`${e.time} · ${e.venue}`}
              pinColor={e.id === selectedId ? theme.accent : theme.primary}
              onPress={() => setSelectedId(e.id)}
            />
          ))}
        </MapView>
      </View>
      {selected ? <EventCard event={selected} /> : <AppText type="small">Tap a pin to see what&apos;s on there.</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  mapFrame: { height: 360, borderRadius: Radius.large, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
