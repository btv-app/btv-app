import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button, Chips } from '@/components/controls';
import { Screen } from '@/components/screen';
import { Fonts, Radius } from '@/constants/theme';
import { parseDate, toIsoDate } from '@/data/dates';
import { useStore } from '@/data/store';
import { CATEGORIES, TOWNS, type Category, type Town } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

const EMPTY = { title: '', date: '', time: '', venue: '', description: '' };

export default function SubmitScreen() {
  const { role, submitEvent } = useStore();
  const [form, setForm] = useState(EMPTY);
  const [town, setTown] = useState<Town>('Ashland City');
  const [category, setCategory] = useState<Category>('Music');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const isOwner = role === 'owner';

  if (role === 'guest') {
    return (
      <Screen>
        <AppText type="title">Share a local event</AppText>
        <AppText>Sign in so we can let you know when it&apos;s approved.</AppText>
        <Button title="Sign in to submit" onPress={() => router.push('/account')} />
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen>
        <AppText type="title">{isOwner ? 'Event published' : "Thanks! It's in the queue"}</AppText>
        <AppText>
          {isOwner
            ? "It's live in the list, map and calendar now."
            : "The BTV team reviews submissions daily. We'll let you know when it's approved."}
        </AppText>
        <Button title="Submit another" variant="secondary" onPress={() => setSent(false)} />
      </Screen>
    );
  }

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.title.trim()) return setError('Add a name for the event.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || toIsoDate(parseDate(form.date)) !== form.date) {
      return setError('Enter the date as YYYY-MM-DD, for example 2026-10-25.');
    }
    submitEvent({
      title: form.title.trim(),
      date: form.date,
      time: form.time.trim() || 'Time TBA',
      venue: form.venue.trim() || 'Venue TBA',
      description: form.description.trim(),
      town,
      category,
    });
    setForm(EMPTY);
    setError('');
    setSent(true);
  };

  return (
    <Screen>
      <AppText type="title">{isOwner ? 'Add an event' : 'Submit an event'}</AppText>
      <AppText type="small">
        {isOwner ? 'As the owner, your events publish right away.' : "Events are reviewed before they're posted."}
      </AppText>
      <Field label="Event name" value={form.title} onChangeText={set('title')} placeholder="Fall Concert in the Park" />
      <View style={styles.row}>
        <Field label="Date" value={form.date} onChangeText={set('date')} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
        <Field label="Time" value={form.time} onChangeText={set('time')} placeholder="6:30 PM" style={{ flex: 1 }} />
      </View>
      <AppText type="label" style={styles.label}>Town</AppText>
      <Chips options={TOWNS} value={town} onChange={setTown} />
      <AppText type="label" style={styles.label}>Category</AppText>
      <Chips options={CATEGORIES} value={category} onChange={setCategory} />
      <Field label="Venue or address" value={form.venue} onChangeText={set('venue')} placeholder="City Park amphitheater" />
      <Field label="Details" value={form.description} onChangeText={set('description')} multiline placeholder="What should people know?" />
      {!!error && <AppText style={{ color: '#B23B3B' }}>{error}</AppText>}
      <Button title={isOwner ? 'Publish event' : 'Send for review'} onPress={submit} />
    </Screen>
  );
}

function Field({ label, style, multiline, ...rest }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={[{ gap: 5 }, style]}>
      <AppText type="label" style={styles.label}>{label}</AppText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        style={[
          styles.input,
          { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
          multiline && { minHeight: 80, textAlignVertical: 'top' },
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  label: { marginTop: 6 },
  input: { borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: 11, paddingVertical: 10, fontFamily: Fonts.body, fontSize: 15 },
});
