import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button, ToggleChip } from '@/components/controls';
import { DateTimeField } from '@/components/date-time-field';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { addDays, parseDate, toIsoDate } from '@/data/dates';
import { describeRule, MAX_COUNT, MAX_INTERVAL, presetRules, weekdayPosition, type Recurrence } from '@/data/recurrence';
import { useTheme } from '@/hooks/use-theme';

const UNITS: { freq: Recurrence['freq']; label: string }[] = [
  { freq: 'daily', label: 'day' },
  { freq: 'weekly', label: 'week' },
  { freq: 'monthly', label: 'month' },
  { freq: 'yearly', label: 'year' },
];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const sameRule = (a: Recurrence | null, b: Recurrence | null) =>
  JSON.stringify(a && { ...a, weekdays: a.weekdays && [...a.weekdays].sort() }) ===
  JSON.stringify(b && { ...b, weekdays: b.weekdays && [...b.weekdays].sort() });

/** Keeps a rule in step when the event's date changes, the way Google Calendar does. */
export function adjustRuleForDate(rule: Recurrence | null, oldIso: string, newIso: string): Recurrence | null {
  if (!rule) return null;
  const next = { ...rule };
  if (next.freq === 'weekly' && next.weekdays) {
    const oldDay = parseDate(oldIso).getDay();
    const newDay = parseDate(newIso).getDay();
    next.weekdays = [...new Set(next.weekdays.map((d) => (d === oldDay ? newDay : d)))];
  }
  if (next.freq === 'monthly' && next.monthlyBy !== 'day') {
    const { nth, isLast } = weekdayPosition(newIso);
    if (next.monthlyBy === 'lastWeekday' && !isLast) next.monthlyBy = 'weekday';
    if (next.monthlyBy === 'weekday' && nth === 5) next.monthlyBy = 'lastWeekday';
  }
  if (next.until && next.until < newIso) delete next.until;
  return next;
}

/** The "Repeat" row on the event form. Opens Google Calendar's choices, including Custom. */
export function RepeatPicker({
  date,
  value,
  onChange,
}: {
  /** The event's first date, YYYY-MM-DD. */
  date: string;
  value: Recurrence | null;
  onChange: (rule: Recurrence | null) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);

  return (
    <View style={{ gap: 5 }}>
      <AppText type="label" style={{ marginTop: 6 }}>Repeat</AppText>
      <Pressable
        onPress={() => {
          setCustom(false);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Repeat: ${describeRule(value, date)}`}
        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="repeat" size={18} color={theme.primary} />
        <AppText style={{ flex: 1 }}>{describeRule(value, date)}</AppText>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        {custom ? (
          <CustomRepeat
            date={date}
            initial={value}
            onCancel={() => setCustom(false)}
            onDone={(rule) => {
              onChange(rule);
              setOpen(false);
            }}
          />
        ) : (
          <Sheet title="Repeat" onClose={() => setOpen(false)}>
            {presetRules(date).map((option) => (
              <Option
                key={option.label}
                label={option.label}
                selected={sameRule(option.rule, value)}
                onPress={() => {
                  onChange(option.rule);
                  setOpen(false);
                }}
              />
            ))}
            <Option
              label="Custom…"
              selected={!presetRules(date).some((o) => sameRule(o.rule, value))}
              detail={presetRules(date).some((o) => sameRule(o.rule, value)) ? undefined : describeRule(value, date)}
              onPress={() => setCustom(true)}
            />
          </Sheet>
        )}
      </Modal>
    </View>
  );
}

/** Google's "Custom recurrence": every N units, which days, and when it ends. */
function CustomRepeat({
  date,
  initial,
  onCancel,
  onDone,
}: {
  date: string;
  initial: Recurrence | null;
  onCancel: () => void;
  onDone: (rule: Recurrence) => void;
}) {
  const theme = useTheme();
  const start = parseDate(date);
  const { weekday, nth, isLast } = weekdayPosition(date);
  const [freq, setFreq] = useState<Recurrence['freq']>(initial?.freq ?? 'weekly');
  const [interval, setIntervalText] = useState(String(initial?.interval ?? 1));
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [weekday]);
  const [monthlyBy, setMonthlyBy] = useState<NonNullable<Recurrence['monthlyBy']>>(
    initial?.monthlyBy ?? (nth === 5 ? 'lastWeekday' : 'day'),
  );
  const [ends, setEnds] = useState<'never' | 'on' | 'after'>(initial?.until ? 'on' : initial?.count ? 'after' : 'never');
  const [until, setUntil] = useState(() => (initial?.until ? parseDate(initial.until) : addDays(start, 28)));
  const [count, setCount] = useState(String(initial?.count ?? 10));
  const [error, setError] = useState('');

  const ordinal = ['first', 'second', 'third', 'fourth'][nth - 1];
  const every = Number(interval);

  const done = () => {
    if (!Number.isInteger(every) || every < 1 || every > MAX_INTERVAL) return setError(`Repeat every 1 to ${MAX_INTERVAL}.`);
    const times = Number(count);
    if (ends === 'after' && (!Number.isInteger(times) || times < 1 || times > MAX_COUNT)) {
      return setError(`Choose 1 to ${MAX_COUNT} dates.`);
    }
    if (ends === 'on' && toIsoDate(until) < date) return setError('The end date needs to be on or after the event date.');
    const rule: Recurrence = { freq, interval: every };
    if (freq === 'weekly') rule.weekdays = [...new Set([...weekdays, weekday])].sort();
    if (freq === 'monthly') rule.monthlyBy = monthlyBy;
    if (ends === 'on') rule.until = toIsoDate(until);
    if (ends === 'after') rule.count = times;
    onDone(rule);
  };

  return (
    <Sheet title="Custom repeat" onClose={onCancel} closeLabel="Back" footer={<Button title="Done" onPress={done} />}>
      <AppText type="script">repeat every</AppText>
      <View style={styles.inline}>
        <TextInput
          value={interval}
          onChangeText={setIntervalText}
          keyboardType="number-pad"
          maxLength={2}
          accessibilityLabel="Repeat every how many"
          style={[styles.number, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
        />
        {UNITS.map((u) => (
          <ToggleChip key={u.freq} label={every === 1 ? u.label : `${u.label}s`} selected={freq === u.freq} onPress={() => setFreq(u.freq)} />
        ))}
      </View>

      {freq === 'weekly' && (
        <>
          <AppText type="script">repeat on</AppText>
          <View style={styles.inline}>
            {WEEKDAY_LETTERS.map((letter, day) => {
              // The event's own weekday is always on, as in Google Calendar.
              const selected = day === weekday || weekdays.includes(day);
              return (
                <Pressable
                  key={day}
                  disabled={day === weekday}
                  onPress={() => setWeekdays(selected ? weekdays.filter((d) => d !== day) : [...weekdays, day])}
                  accessibilityRole="button"
                  accessibilityLabel={WEEKDAY_NAMES[day]}
                  accessibilityState={{ selected }}
                  style={[
                    styles.day,
                    { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.card },
                  ]}>
                  <AppText type="strong" style={{ color: selected ? theme.onPrimary : theme.text }}>{letter}</AppText>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {freq === 'monthly' && (
        <View style={{ gap: 4 }}>
          <Option label={`Monthly on day ${start.getDate()}`} selected={monthlyBy === 'day'} onPress={() => setMonthlyBy('day')} />
          {nth < 5 && (
            <Option
              label={`Monthly on the ${ordinal} ${WEEKDAY_NAMES[weekday]}`}
              selected={monthlyBy === 'weekday'}
              onPress={() => setMonthlyBy('weekday')}
            />
          )}
          {isLast && (
            <Option
              label={`Monthly on the last ${WEEKDAY_NAMES[weekday]}`}
              selected={monthlyBy === 'lastWeekday'}
              onPress={() => setMonthlyBy('lastWeekday')}
            />
          )}
        </View>
      )}

      <AppText type="script">ends</AppText>
      <Option label="Never" selected={ends === 'never'} onPress={() => setEnds('never')} />
      <Option label="On a date" selected={ends === 'on'} onPress={() => setEnds('on')} />
      {ends === 'on' && <DateTimeField label="Last date" mode="date" value={until} onChange={setUntil} minimumDate={start} />}
      <Option label="After a number of dates" selected={ends === 'after'} onPress={() => setEnds('after')} />
      {ends === 'after' && (
        <View style={styles.inline}>
          <TextInput
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel="How many dates"
            style={[styles.number, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          />
          <AppText>dates in all</AppText>
        </View>
      )}
      {!!error && <AppText themeColor="danger">{error}</AppText>}
    </Sheet>
  );
}

function Sheet({
  title,
  onClose,
  closeLabel,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  closeLabel?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.sheet, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
          {closeLabel ? (
            <AppText type="strong" themeColor="primary">{closeLabel}</AppText>
          ) : (
            <Ionicons name="close" size={24} color={theme.text} accessibilityLabel="Close" />
          )}
        </Pressable>
        <AppText type="title" style={styles.title}>{title}</AppText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer && <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.three }]}>{footer}</View>}
    </View>
  );
}

function Option({ label, detail, selected, onPress }: { label: string; detail?: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={styles.option}>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? theme.primary : theme.textSecondary} />
      <View style={{ flex: 1 }}>
        <AppText>{label}</AppText>
        {!!detail && <AppText type="small">{detail}</AppText>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: 11, paddingVertical: 11 },
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 22, lineHeight: 26 },
  body: { padding: Spacing.three, gap: Spacing.two },
  footer: { padding: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  number: { width: 56, borderWidth: 1, borderRadius: Radius.medium, paddingVertical: 8, textAlign: 'center', fontFamily: Fonts.body, fontSize: 16 },
  day: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
