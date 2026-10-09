import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button, ToggleChip } from '@/components/controls';
import { Radius, Spacing } from '@/constants/theme';
import { addDays, startOfToday, toIsoDate } from '@/data/dates';
import {
  DEFAULT_FILTERS,
  WHEN_LABELS,
  shortDateLabel,
  type EventFilters,
  type When,
} from '@/data/filters';
import { CATEGORIES, TOWNS, type Category } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

/** Dates offered under "Pick a date": the next four weeks. */
const PICKABLE_DAYS = 28;

export function FilterSheet({
  visible,
  filters,
  onChange,
  onClose,
  resultCount,
}: {
  visible: boolean;
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  onClose: () => void;
  resultCount: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<EventFilters>) => onChange({ ...filters, ...patch });
  const toggleCategory = (category: Category) =>
    set({
      categories: filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    });

  const today = startOfToday();
  const days = Array.from({ length: PICKABLE_DAYS }, (_, i) => toIsoDate(addDays(today, i)));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => onChange({ ...DEFAULT_FILTERS, search: filters.search })} hitSlop={10}>
            <AppText type="strong" themeColor="primary">Reset</AppText>
          </Pressable>
          <AppText type="title" style={styles.title}>Filters</AppText>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close filters">
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Section title="When">
            {(Object.keys(WHEN_LABELS) as Exclude<When, 'date'>[]).map((when) => (
              <ToggleChip
                key={when}
                label={WHEN_LABELS[when]}
                selected={filters.when === when}
                onPress={() => set({ when, date: null })}
              />
            ))}
            <ToggleChip
              label="Pick a date"
              selected={filters.when === 'date'}
              onPress={() => set({ when: 'date', date: filters.date ?? toIsoDate(today) })}
            />
          </Section>
          {filters.when === 'date' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
              {days.map((iso) => (
                <ToggleChip key={iso} label={shortDateLabel(iso)} selected={filters.date === iso} onPress={() => set({ date: iso })} />
              ))}
            </ScrollView>
          )}

          <Section title="Category">
            {CATEGORIES.map((category) => (
              <ToggleChip
                key={category}
                label={category}
                selected={filters.categories.includes(category)}
                onPress={() => toggleCategory(category)}
              />
            ))}
          </Section>

          <Section title="Town">
            {(['All', ...TOWNS] as const).map((town) => (
              <ToggleChip key={town} label={town} selected={filters.town === town} onPress={() => set({ town })} />
            ))}
          </Section>

          <View style={[styles.switchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <AppText type="strong">Free events only</AppText>
              <AppText type="small">Hide anything with a cover charge or ticket</AppText>
            </View>
            <Switch
              value={filters.freeOnly}
              onValueChange={(freeOnly) => set({ freeOnly })}
              trackColor={{ true: theme.primary, false: theme.border }}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.three }]}>
          <Button
            title={resultCount === 1 ? 'Show 1 event' : `Show ${resultCount} events`}
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <AppText type="script">{title.toLowerCase()}</AppText>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 22, lineHeight: 26 },
  body: { padding: Spacing.three, gap: Spacing.four },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  days: { gap: 6 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { padding: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
});
