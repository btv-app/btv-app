import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdSlot } from '@/components/ad-slot';
import { AppText } from '@/components/app-text';
import { CategoryTag } from '@/components/category-tag';
import { Brand, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { longDate } from '@/data/dates';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { events, savedIds, toggleSaved } = useStore();
  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.background }]}>
        <AppText>This event is no longer listed.</AppText>
      </View>
    );
  }

  const saved = savedIds.has(event.id);

  return (
    <ScrollView style={{ backgroundColor: theme.background }}>
      <View style={[styles.hero, { backgroundColor: theme.header, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back} accessibilityRole="button">
          <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
          <AppText style={styles.backText}>Events</AppText>
        </Pressable>
        <CategoryTag category={event.category} inverse />
        <AppText style={styles.heroTitle}>{event.title}</AppText>
      </View>
      <View style={styles.band}>
        <AppText style={styles.bandText}>
          {longDate(event.date)} · {event.time}
        </AppText>
      </View>

      <View style={styles.body}>
        <View style={styles.actions}>
          <Action icon={saved ? 'heart' : 'heart-outline'} label={saved ? 'Saved' : 'Save'} onPress={() => toggleSaved(event.id)} active={saved} />
          {/* Calendar, directions and share are wired up in the next pass (expo-calendar, maps links, Share API). */}
          <Action icon="calendar-outline" label="Calendar" />
          <Action icon="navigate-outline" label="Directions" />
          <Action icon="share-outline" label="Share" />
        </View>

        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <InfoRow icon="time-outline" title={event.time} detail={longDate(event.date)} />
          <InfoRow icon="location-outline" title={event.venue} detail={`${event.town}, TN`} />
        </View>

        {!!event.description && <AppText>{event.description}</AppText>}
        <AdSlot kind="banner" />
      </View>
    </ScrollView>
  );
}

function Action({
  icon,
  label,
  onPress,
  active,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  active?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.action,
        { backgroundColor: active ? theme.backgroundElement : theme.card, borderColor: active ? theme.primary : theme.border },
      ]}>
      <Ionicons name={icon} size={20} color={active ? theme.primary : theme.text} />
      <AppText type="small" style={{ color: active ? theme.primary : theme.text }}>{label}</AppText>
    </Pressable>
  );
}

function InfoRow({ icon, title, detail }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; detail: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.primary} />
      <View style={{ flex: 1 }}>
        <AppText type="strong">{title}</AppText>
        <AppText type="small">{detail}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: 12 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: Radius.pill,
  },
  backText: { color: '#FFFFFF', fontFamily: Fonts.bodySemiBold, fontSize: 13 },
  heroTitle: { color: '#FFFFFF', fontFamily: Fonts.display, fontSize: 30, lineHeight: 33, textTransform: 'uppercase' },
  band: { backgroundColor: Brand.royal, paddingVertical: 11, paddingHorizontal: Spacing.three },
  bandText: { color: '#FFFFFF', textAlign: 'center', letterSpacing: 1, fontFamily: Fonts.bodyMedium, fontSize: 13.5 },
  body: { padding: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  actions: { flexDirection: 'row', gap: 6 },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 9, borderRadius: Radius.medium, borderWidth: 1 },
  panel: { borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  infoRow: { flexDirection: 'row', gap: 10, paddingVertical: 11 },
});
