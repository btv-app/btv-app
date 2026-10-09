import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EventCard } from '@/components/event-card';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { longDate, monthName, startOfToday, toIsoDate } from '@/data/dates';
import type { BtvEvent } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

export function EventCalendar({ events }: { events: BtvEvent[] }) {
  const theme = useTheme();
  const today = startOfToday();
  const [month, setMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(toIsoDate(today));

  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);

  const firstWeekday = new Date(month.year, month.month, 1).getDay();
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toIsoDate(new Date(month.year, month.month, i + 1))),
  ];

  const shift = (delta: number) => {
    const d = new Date(month.year, month.month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const dayEvents = events.filter((e) => e.date === selected);

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={[styles.calendar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.head}>
          <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </Pressable>
          <AppText style={styles.monthTitle}>
            {monthName(month.month)} {month.year}
          </AppText>
          <Pressable onPress={() => shift(1)} hitSlop={10} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <AppText key={i} type="label" style={styles.weekday}>
              {d}
            </AppText>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <View key={`blank-${i}`} style={styles.cell} />;
            const isSelected = iso === selected;
            const count = counts.get(iso) ?? 0;
            return (
              <Pressable
                key={iso}
                onPress={() => setSelected(iso)}
                accessibilityLabel={`${longDate(iso)}, ${count} events`}
                accessibilityState={{ selected: isSelected }}
                style={[styles.cell, isSelected && { backgroundColor: theme.primary, borderRadius: 10 }]}>
                <AppText
                  style={[
                    styles.dayNumber,
                    { color: isSelected ? theme.onPrimary : iso === toIsoDate(today) ? theme.accent : theme.text },
                  ]}>
                  {Number(iso.slice(8))}
                </AppText>
                <View style={styles.dots}>
                  {Array.from({ length: Math.min(count, 3) }, (_, n) => (
                    <View key={n} style={[styles.dot, { backgroundColor: isSelected ? theme.onPrimary : theme.primary }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <AppText type="script">{longDate(selected)}</AppText>
      {dayEvents.length ? (
        dayEvents.map((e) => <EventCard key={e.id} event={e} />)
      ) : (
        <AppText type="small">Nothing listed this day.</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 },
  monthTitle: { fontFamily: Fonts.display, fontSize: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayNumber: { fontSize: 14, fontFamily: Fonts.bodyMedium },
  dots: { flexDirection: 'row', gap: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
