import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button, Chips, ToggleChip } from '@/components/controls';
import { DateTimeField } from '@/components/date-time-field';
import { EventCard } from '@/components/event-card';
import { EventDetails, normalizeLink } from '@/components/event-details';
import { Field } from '@/components/field';
import { PinMap } from '@/components/pin-map';
import { Screen } from '@/components/screen';
import { Radius } from '@/constants/theme';
import { parseDate, parseTimeText, startOfToday, timeRange, toClock, toIsoDate } from '@/data/dates';
import { useStore, type NewEvent } from '@/data/store';
import { MAX_EVENT_CATEGORIES, type BtvEvent, type Category, type Town } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { geocodeAddress } from '@/lib/geocode';

const EMPTY = { title: '', venue: '', address: '', price: '', link: '', description: '' };

type Coords = { latitude: number; longitude: number };

function atTime(hours: number, minutes = 0) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** "19:30" as a Date at that time today, for the time pickers. */
function fromClock(clock: string | undefined, fallbackHours: number) {
  const [h, m] = clock ? clock.split(':').map(Number) : [fallbackHours, 0];
  return atTime(h, m);
}

const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

/**
 * The add-an-event form with its preview step. With `editing`, the owner changes an event that's
 * already listed; otherwise it submits a new one (published right away for the owner).
 */
export function EventForm({ editing, onSaved }: { editing?: BtvEvent; onSaved: () => void }) {
  const theme = useTheme();
  const { role, submitEvent, updateEvent, categories: categoryList, towns: townList, townCenter } = useStore();
  const [form, setForm] = useState(() =>
    editing
      ? {
          title: editing.title,
          venue: editing.venue,
          address: editing.address ?? '',
          price: editing.price ?? '',
          link: editing.link ?? '',
          description: editing.description,
        }
      : EMPTY,
  );
  const [date, setDate] = useState(() => (editing ? parseDate(editing.date) : startOfToday()));
  // Events added before the time pickers only have text like "7–10 PM", so read the times from it.
  const [oldTimes] = useState(() => (editing && !editing.startTime ? parseTimeText(editing.time) : null));
  const [start, setStart] = useState(() => fromClock(editing?.startTime ?? oldTimes?.start, 18));
  const [end, setEnd] = useState<Date | null>(() => {
    const clock = editing?.endTime ?? oldTimes?.end;
    return clock ? fromClock(clock, 20) : null;
  });
  const [town, setTown] = useState<Town>(() => editing?.town ?? townList[0]?.name ?? '');
  const [categories, setCategories] = useState<Category[]>(() => editing?.categories ?? []);
  const [isFree, setIsFree] = useState(() => editing?.isFree ?? false);
  const [flyer, setFlyer] = useState<NewEvent['flyer']>(() => (editing?.flyerUrl ? 'keep' : null));
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [pin, setPin] = useState<Coords | null>(() => (editing ? { latitude: editing.latitude, longitude: editing.longitude } : null));
  const [pinMessage, setPinMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isOwner = role === 'owner';

  // An event keeps a town or category the owner has since removed, so it stays selectable here.
  const towns = townList.some((t) => t.name === town) ? townList.map((t) => t.name) : [...townList.map((t) => t.name), town];
  const allCategories = [...categoryList, ...categories.filter((c) => !categoryList.includes(c))];
  const flyerUri = flyer === 'keep' ? editing?.flyerUrl : flyer?.uri;

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggleCategory = (category: Category) => {
    setError('');
    if (categories.includes(category)) return setCategories(categories.filter((c) => c !== category));
    if (categories.length >= MAX_EVENT_CATEGORIES) return setError(`Pick up to ${MAX_EVENT_CATEGORIES} categories.`);
    setCategories([...categories, category]);
  };

  const pickFlyer = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;
    setFlyer({ uri: asset.uri, base64: asset.base64, width: asset.width, height: asset.height });
  };

  const draft: BtvEvent = {
    id: 'preview',
    title: form.title.trim(),
    town,
    venue: form.venue.trim(),
    address: form.address.trim() || undefined,
    date: toIsoDate(date),
    time: timeRange(start, end),
    categories,
    description: form.description.trim(),
    isFree,
    price: isFree ? undefined : form.price.trim() || undefined,
    link: normalizeLink(form.link) || undefined,
    flyerUrl: flyerUri,
    latitude: pin?.latitude ?? townCenter(town).latitude,
    longitude: pin?.longitude ?? townCenter(town).longitude,
    status: editing?.status ?? (isOwner ? 'approved' : 'pending'),
    cancelled: editing?.cancelled ?? false,
  };

  const preview = async () => {
    if (!draft.title) return setError('Add a name for the event.');
    if (!draft.venue) return setError('Add the venue name, like "City Park amphitheater".');
    if (!categories.length) return setError('Pick at least one category.');
    if (end && minutesOf(end) <= minutesOf(start)) return setError('The end time needs to be after the start time.');
    if (draft.link && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(draft.link)) return setError('That link doesn’t look like a web address.');
    setError('');
    // When editing, a pin the owner already placed stays put unless the address or town changed.
    const placeUnchanged = editing && pin && (draft.address ?? '') === (editing.address ?? '') && town === editing.town;
    if (placeUnchanged) {
      setPinMessage('Drag the pin if it isn’t quite right.');
    } else {
      setBusy(true);
      const found = await geocodeAddress(draft.address ?? '', town);
      setBusy(false);
      setPin(found ?? townCenter(town));
      setPinMessage(
        found
          ? 'The pin is at the address. Drag it if it isn’t quite right.'
          : `We couldn’t find that address, so the pin is in the middle of ${town}. Press and drag it to the right spot.`,
      );
    }
    setStep('preview');
  };

  const send = async () => {
    setBusy(true);
    const input: NewEvent = { ...draft, startTime: toClock(start), endTime: end ? toClock(end) : null, flyer };
    const failure = editing ? await updateEvent(editing.id, input) : await submitEvent(input);
    setBusy(false);
    if (failure) return setError(failure);
    if (!editing) {
      setForm(EMPTY);
      setCategories([]);
      setIsFree(false);
      setEnd(null);
      setFlyer(null);
      setPin(null);
      setStep('form');
    }
    setError('');
    onSaved();
  };

  if (step === 'preview') {
    return (
      <Screen>
        <AppText type="title">Check your event</AppText>
        <AppText type="small">This is how people will see it. Go back to change anything.</AppText>

        <AppText type="script">in the list</AppText>
        <EventCard event={draft} preview />

        <AppText type="script">event page</AppText>
        <View style={[styles.previewFrame, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <EventDetails event={draft} preview />
        </View>

        <AppText type="script">on the map</AppText>
        <AppText type="small">{pinMessage}</AppText>
        {pin && <PinMap coordinate={pin} onChange={setPin} title={draft.venue} />}

        {!!error && <AppText themeColor="danger">{error}</AppText>}
        <Button
          title={busy ? 'Saving…' : editing ? 'Save changes' : isOwner ? 'Publish event' : 'Send for review'}
          onPress={send}
          disabled={busy}
        />
        <Button title="Edit" variant="secondary" disabled={busy} onPress={() => setStep('form')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText type="title">{editing ? 'Edit event' : isOwner ? 'Add an event' : 'Submit an event'}</AppText>
      <AppText type="small">
        {editing
          ? 'Changes show for everyone as soon as you save.'
          : isOwner
            ? 'As the owner, your events publish right away.'
            : "Events are reviewed before they're posted."}
      </AppText>

      <Field label="Event name" value={form.title} onChangeText={set('title')} placeholder="Fall Concert in the Park" />

      <DateTimeField label="Date" mode="date" value={date} onChange={setDate} minimumDate={editing ? undefined : startOfToday()} />
      <View style={styles.row}>
        <DateTimeField label="Starts" mode="time" value={start} onChange={setStart} style={{ flex: 1 }} />
        {end ? (
          <View style={{ flex: 1 }}>
            <DateTimeField label="Ends" mode="time" value={end} onChange={setEnd} />
            <Pressable onPress={() => setEnd(null)} hitSlop={8}>
              <AppText type="small" themeColor="primary">Remove end time</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.addEnd, { flex: 1 }]}>
            <Pressable
              onPress={() => setEnd(new Date(start.getTime() + 2 * 60 * 60 * 1000))}
              accessibilityRole="button"
              style={[styles.dashed, { borderColor: theme.border }]}>
              <Ionicons name="add" size={16} color={theme.primary} />
              <AppText type="strong" themeColor="primary">End time</AppText>
            </Pressable>
          </View>
        )}
      </View>

      <AppText type="label" style={styles.label}>Town</AppText>
      <Chips options={towns} value={town} onChange={setTown} />
      <Field label="Venue name" value={form.venue} onChangeText={set('venue')} placeholder="City Park amphitheater" />
      <Field
        label="Street address"
        value={form.address}
        onChangeText={set('address')}
        placeholder="104 Frey St"
        autoComplete="street-address"
        textContentType="fullStreetAddress"
      />

      <AppText type="label" style={styles.label}>
        Categories · pick up to {MAX_EVENT_CATEGORIES}
      </AppText>
      <View style={styles.wrap}>
        {allCategories.map((c) => (
          <ToggleChip key={c} label={c} selected={categories.includes(c)} onPress={() => toggleCategory(c)} />
        ))}
      </View>

      <FreeSwitch value={isFree} onChange={setIsFree} />
      {!isFree && <Field label="Price" value={form.price} onChangeText={set('price')} placeholder="$10, kids under 12 free" />}
      <Field
        label="Tickets or more info (link)"
        value={form.link}
        onChangeText={set('link')}
        placeholder="facebook.com/events/…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Field label="Details" value={form.description} onChangeText={set('description')} multiline placeholder="What should people know?" />

      <AppText type="label" style={styles.label}>Flyer</AppText>
      {flyerUri ? (
        <View style={[styles.flyerRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Image source={{ uri: flyerUri }} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1, gap: 8 }}>
            <AppText type="small">People tap it on the event page to see it full size.</AppText>
            <View style={styles.row}>
              <Pressable onPress={pickFlyer} hitSlop={8}>
                <AppText type="strong" themeColor="primary">Change</AppText>
              </Pressable>
              <Pressable onPress={() => setFlyer(null)} hitSlop={8}>
                <AppText type="strong" themeColor="danger">Remove</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <Pressable onPress={pickFlyer} accessibilityRole="button" style={[styles.dashed, styles.flyerButton, { borderColor: theme.border }]}>
          <Ionicons name="image-outline" size={20} color={theme.primary} />
          <AppText type="strong" themeColor="primary">Add a flyer photo</AppText>
        </Pressable>
      )}

      {!!error && <AppText themeColor="danger">{error}</AppText>}
      <Button title={busy ? 'Finding the address…' : 'Preview'} onPress={preview} disabled={busy} />
    </Screen>
  );
}

function FreeSwitch({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.switchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <AppText type="strong">Free to attend</AppText>
        <AppText type="small">No ticket, cover charge or entry fee</AppText>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary, false: theme.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  addEnd: { justifyContent: 'flex-end' },
  dashed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    paddingVertical: 10,
  },
  flyerButton: { paddingVertical: 16 },
  flyerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: Radius.medium, borderWidth: 1 },
  thumb: { width: 64, height: 84, borderRadius: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 6, borderRadius: Radius.medium, borderWidth: 1 },
  label: { marginTop: 6 },
  previewFrame: { borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
