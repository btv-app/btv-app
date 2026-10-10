import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { CategoryTag } from '@/components/category-tag';
import { DateBadge } from '@/components/date-badge';
import { Radius, Spacing } from '@/constants/theme';
import type { BtvEvent } from '@/data/types';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

/** `preview` shows the card as it will look, without opening or saving it. */
export function EventCard({ event, preview }: { event: BtvEvent; preview?: boolean }) {
  const theme = useTheme();
  const { savedIds, toggleSaved } = useStore();
  const saved = savedIds.has(event.id);

  return (
    <Pressable
      onPress={preview ? undefined : () => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button">
      <DateBadge date={event.date} />
      <View style={styles.body}>
        <View style={styles.tags}>
          {event.categories.map((c) => (
            <CategoryTag key={c} category={c} />
          ))}
          {event.isFree && (
            <AppText type="label" style={[styles.free, { color: theme.primary }]}>
              Free
            </AppText>
          )}
        </View>
        <AppText type="cardTitle" numberOfLines={2}>
          {event.title}
        </AppText>
        <AppText type="small" numberOfLines={1}>
          {event.time} · {event.town}
        </AppText>
      </View>
      <Pressable
        disabled={preview}
        onPress={() => toggleSaved(event.id)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved' : 'Save event'}
        accessibilityState={{ selected: saved }}>
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? theme.accent : theme.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: 10,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, gap: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  free: { fontSize: 10 },
});
