import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EventDetails } from '@/components/event-details';
import { onDate, parseListingId } from '@/data/recurrence';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { events } = useStore();
  // A link to one date of a repeating event carries that date after the event id.
  const { eventId, date } = parseListingId(id);
  const found = events.find((e) => e.id === eventId);
  const event = found && date ? onDate(found, date) : found;

  if (!event) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.background }]}>
        <AppText>This event is no longer listed.</AppText>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }}>
      <EventDetails event={event} topInset={insets.top} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
