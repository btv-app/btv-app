import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { CategoryTag } from '@/components/category-tag';
import { Button } from '@/components/controls';
import { Screen } from '@/components/screen';
import { Radius } from '@/constants/theme';
import { longDate } from '@/data/dates';
import { describeRule } from '@/data/recurrence';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

export default function ReviewScreen() {
  const theme = useTheme();
  const { role, pending, review } = useStore();
  const [error, setError] = useState('');
  const decide = async (id: string, decision: 'approved' | 'declined') => setError((await review(id, decision)) ?? '');

  if (role !== 'owner') {
    return (
      <Screen>
        <AppText>Only the BTV owner can review submissions.</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText type="title">Owner review</AppText>
      <AppText type="small">{pending.length ? `${pending.length} waiting for review` : 'All caught up.'}</AppText>
      {!!error && <AppText themeColor="danger">{error}</AppText>}
      {pending.map((e) => (
        <View key={e.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: theme.accent }]}>
          <View style={styles.tags}>
            {e.categories.map((c) => (
              <CategoryTag key={c} category={c} />
            ))}
          </View>
          <AppText type="cardTitle">{e.title}</AppText>
          <AppText type="small">
            {longDate(e.date)} · {e.time} · {e.town}
            {e.recurrence ? `\nRepeats: ${describeRule(e.recurrence, e.date)}` : ''}
            {'\n'}Submitted by {e.submittedBy ?? 'a resident'}
          </AppText>
          {!!e.description && <AppText numberOfLines={4}>{e.description}</AppText>}
          <Pressable onPress={() => router.push(`/event/${e.id}`)} accessibilityRole="link">
            <AppText type="strong" themeColor="primary">
              See full details{e.flyerUrl ? ' and flyer' : ''}
            </AppText>
          </Pressable>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button title="Approve" onPress={() => decide(e.id, 'approved')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Decline" variant="secondary" onPress={() => decide(e.id, 'declined')} />
            </View>
          </View>
        </View>
      ))}
      <Button title="Add an event yourself" variant="accent" onPress={() => router.push('/submit')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 12, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
