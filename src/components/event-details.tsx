import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdSlot } from '@/components/ad-slot';
import { AppText } from '@/components/app-text';
import { CategoryTag } from '@/components/category-tag';
import { Brand, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { longDate } from '@/data/dates';
import { useStore } from '@/data/store';
import type { BtvEvent } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

/** Adds https:// when someone types "facebook.com/events/…". */
export function normalizeLink(link: string) {
  const trimmed = link.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Everything on an event's page. The event screen shows it for listed events; the submit form
 * shows it with `preview` so people see their event the way everyone else will.
 */
export function EventDetails({ event, preview, topInset = 0 }: { event: BtvEvent; preview?: boolean; topInset?: number }) {
  const theme = useTheme();
  const { savedIds, toggleSaved } = useStore();
  const saved = savedIds.has(event.id);
  const place = event.address ? `${event.address}, ${event.town}, TN` : `${event.town}, TN`;

  return (
    <View>
      <View style={[styles.hero, { backgroundColor: theme.header, paddingTop: topInset + 12 }]}>
        {!preview && (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back} accessibilityRole="button">
            <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
            <AppText style={styles.backText}>Events</AppText>
          </Pressable>
        )}
        <View style={styles.tags}>
          {event.categories.map((c) => (
            <CategoryTag key={c} category={c} inverse />
          ))}
        </View>
        <AppText style={styles.heroTitle}>{event.title}</AppText>
      </View>
      <View style={styles.band}>
        <AppText style={styles.bandText}>
          {longDate(event.date)} · {event.time}
        </AppText>
      </View>

      <View style={styles.body}>
        {!preview && (
          <View style={styles.actions}>
            <Action icon={saved ? 'heart' : 'heart-outline'} label={saved ? 'Saved' : 'Save'} onPress={() => toggleSaved(event.id)} active={saved} />
            {/* Calendar, directions and share are wired up in a later pass (expo-calendar, maps links, Share API). */}
            <Action icon="calendar-outline" label="Calendar" />
            <Action icon="navigate-outline" label="Directions" />
            <Action icon="share-outline" label="Share" />
          </View>
        )}

        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <InfoRow icon="time-outline" title={event.time} detail={longDate(event.date)} />
          <InfoRow icon="location-outline" title={event.venue} detail={place} />
          <InfoRow
            icon="pricetag-outline"
            title={event.isFree ? 'Free to attend' : event.price || 'Admission charged'}
            detail={event.isFree ? 'No ticket or cover charge' : 'Price'}
          />
          {!!event.link && (
            <Pressable onPress={() => WebBrowser.openBrowserAsync(normalizeLink(event.link!))} accessibilityRole="link">
              <InfoRow icon="link-outline" title="Tickets and info" detail={event.link.replace(/^https?:\/\//i, '')} chevron />
            </Pressable>
          )}
        </View>

        {!!event.description && <AppText>{event.description}</AppText>}
        {!preview && <AdSlot kind="banner" />}
        {!!event.flyerUrl && <Flyer uri={event.flyerUrl} />}
      </View>
    </View>
  );
}

/** The flyer at its own shape, full width. */
function Flyer({ uri }: { uri: string }) {
  const theme = useTheme();
  const [aspectRatio, setAspectRatio] = useState(3 / 4);
  return (
    <Image
      source={{ uri }}
      contentFit="contain"
      accessibilityLabel="Event flyer"
      onLoad={({ source }) => source.width && source.height && setAspectRatio(source.width / source.height)}
      style={[styles.flyer, { aspectRatio, borderColor: theme.border }]}
    />
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

function InfoRow({
  icon,
  title,
  detail,
  chevron,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  chevron?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.primary} />
      <View style={{ flex: 1 }}>
        <AppText type="strong">{title}</AppText>
        <AppText type="small" numberOfLines={2}>{detail}</AppText>
      </View>
      {chevron && <Ionicons name="open-outline" size={16} color={theme.textSecondary} />}
    </View>
  );
}

const styles = StyleSheet.create({
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
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroTitle: { color: '#FFFFFF', fontFamily: Fonts.display, fontSize: 30, lineHeight: 33, textTransform: 'uppercase' },
  band: { backgroundColor: Brand.royal, paddingVertical: 11, paddingHorizontal: Spacing.three },
  bandText: { color: '#FFFFFF', textAlign: 'center', letterSpacing: 1, fontFamily: Fonts.bodyMedium, fontSize: 13.5 },
  body: { padding: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  actions: { flexDirection: 'row', gap: 6 },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 9, borderRadius: Radius.medium, borderWidth: 1 },
  panel: { borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  flyer: { width: '100%', borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth },
});
