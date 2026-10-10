import Ionicons from '@expo/vector-icons/Ionicons';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AdSlot } from '@/components/ad-slot';
import { AppText } from '@/components/app-text';
import { Button, Segmented, ToggleChip } from '@/components/controls';
import { EventCalendar } from '@/components/event-calendar';
import { EventCard } from '@/components/event-card';
import { EventMap } from '@/components/event-map';
import { FilterSheet } from '@/components/filter-sheet';
import { Screen } from '@/components/screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { groupLabel } from '@/data/dates';
import { activeFilterCount, applyFilters, DEFAULT_FILTERS, type EventFilters } from '@/data/filters';
import { useStore } from '@/data/store';
import type { BtvEvent, Category } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

type ViewMode = 'list' | 'map' | 'calendar';

/** A sponsored card appears after this many events in the list. */
const AD_EVERY = 3;

export default function EventsScreen() {
  const theme = useTheme();
  const { approved, categories, loading, loadError, refresh } = useStore();
  const [view, setView] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const events = applyFilters(approved, filters);
  const activeCount = activeFilterCount(filters);

  const set = (patch: Partial<EventFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const toggleCategory = (category: Category) =>
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(category)
        ? f.categories.filter((c) => c !== category)
        : [...f.categories, category],
    }));

  // Category shortcuts disappear if the owner removes that category.
  const categoryShortcut = (label: string, category: Category) =>
    categories.includes(category)
      ? { label, selected: filters.categories.includes(category), onPress: () => toggleCategory(category) }
      : null;

  // Shortcuts to the most-used filters; each mirrors a setting in the full filter sheet.
  const quickFilters = [
    { label: 'Today', selected: filters.when === 'today', onPress: () => set({ when: filters.when === 'today' ? 'any' : 'today', date: null }) },
    { label: 'This weekend', selected: filters.when === 'weekend', onPress: () => set({ when: filters.when === 'weekend' ? 'any' : 'weekend', date: null }) },
    categoryShortcut('Live music', 'Music'),
    { label: 'Free', selected: filters.freeOnly, onPress: () => set({ freeOnly: !filters.freeOnly }) },
    categoryShortcut('Support a cause', 'Support a Cause'),
    categoryShortcut('Community resources', 'Community Resources'),
  ].filter((chip) => chip !== null);

  return (
    <Screen>
      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={17} color={theme.textSecondary} />
          <TextInput
            value={filters.search}
            onChangeText={(search) => set({ search })}
            placeholder="Search events or venues"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            style={[styles.searchInput, { color: theme.text }]}
            accessibilityLabel="Search events"
          />
          {!!filters.search && (
            <Pressable onPress={() => set({ search: '' })} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={17} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={activeCount ? `Filters, ${activeCount} on` : 'Filters'}
          style={[
            styles.filterButton,
            { borderColor: activeCount ? theme.primary : theme.border, backgroundColor: activeCount ? theme.backgroundElement : theme.card },
          ]}>
          <Ionicons name="options-outline" size={18} color={activeCount ? theme.primary : theme.text} />
          {activeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <AppText style={[styles.badgeText, { color: theme.onPrimary }]}>{activeCount}</AppText>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick}>
        {quickFilters.map((q) => (
          <ToggleChip key={q.label} {...q} />
        ))}
      </ScrollView>

      <Segmented
        options={[
          { value: 'list', label: 'List' },
          { value: 'map', label: 'Map' },
          { value: 'calendar', label: 'Calendar' },
        ]}
        value={view}
        onChange={setView}
      />

      {loading ? (
        <AppText type="small" style={{ textAlign: 'center' }}>Loading events…</AppText>
      ) : loadError ? (
        <View style={styles.empty}>
          <AppText themeColor="danger" style={{ textAlign: 'center' }}>{loadError}</AppText>
          <View style={{ alignSelf: 'stretch' }}>
            <Button title="Try again" variant="secondary" onPress={refresh} />
          </View>
        </View>
      ) : events.length === 0 && (activeCount > 0 || filters.search) ? (
        <View style={styles.empty}>
          <AppText type="script">nothing matches</AppText>
          <AppText type="small" style={{ textAlign: 'center' }}>
            Try fewer filters, or clear them to see everything coming up.
          </AppText>
          <View style={{ alignSelf: 'stretch' }}>
            <Button title="Clear filters" variant="secondary" onPress={() => setFilters(DEFAULT_FILTERS)} />
          </View>
        </View>
      ) : (
        <>
          {view === 'list' && <EventList events={events} />}
          {view === 'map' && <EventMap events={events} />}
          {view === 'calendar' && <EventCalendar events={events} />}
        </>
      )}

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setSheetOpen(false)}
        resultCount={events.length}
      />
    </Screen>
  );
}

function EventList({ events }: { events: BtvEvent[] }) {
  if (!events.length) {
    return <AppText type="small">Nothing listed yet. Know of something? Tap Submit to add it.</AppText>;
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

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: Spacing.two },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: Fonts.body, fontSize: 15 },
  filterButton: {
    width: 46,
    borderWidth: 1,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: 10.5, lineHeight: 13 },
  quick: { gap: 6, paddingBottom: 2 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
});
