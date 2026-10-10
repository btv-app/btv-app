import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EventForm } from '@/components/event-form';
import { Screen } from '@/components/screen';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

/** Owner only: change an event that's already listed. */
export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { role, events } = useStore();
  const event = events.find((e) => e.id === id);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (role !== 'owner' || !event) {
    return (
      <Screen>
        <AppText>{role !== 'owner' ? 'Only the BTV owner can edit events.' : 'This event is no longer listed.'}</AppText>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.background }}>
      <AppText type="strong" themeColor="primary" onPress={close} style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        Cancel
      </AppText>
      <EventForm editing={event} onSaved={close} />
    </View>
  );
}
