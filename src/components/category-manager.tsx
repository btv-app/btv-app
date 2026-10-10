import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/controls';
import { Field } from '@/components/field';
import { Radius } from '@/constants/theme';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

/**
 * Owner-only: add seasonal categories like "Halloween" and remove ones that are done.
 * Removing a category only takes it off the pickers; events that already use it keep it.
 */
export function CategoryManager() {
  const theme = useTheme();
  const { categories, addCategory, removeCategory } = useStore();
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<string | null>, onSuccess: () => void) => {
    setBusy(true);
    const failure = await action();
    setBusy(false);
    setError(failure ?? '');
    if (!failure) onSuccess();
  };

  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <AppText type="small">
        People pick up to 3 of these for each event. Removing one hides it from the pickers and filters;
        events that already use it keep it.
      </AppText>
      <View style={styles.wrap}>
        {categories.map((c) => (
          <View key={c} style={[styles.chip, { borderColor: confirming === c ? theme.danger : theme.border }]}>
            <AppText type="small" style={{ color: theme.text }}>{c}</AppText>
            <Pressable
              onPress={() => setConfirming(c)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${c}`}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>

      {confirming && (
        <View style={[styles.confirm, { borderColor: theme.danger }]}>
          <AppText style={{ flex: 1 }}>Remove {confirming}?</AppText>
          <Pressable
            disabled={busy}
            onPress={() => run(() => removeCategory(confirming), () => setConfirming(null))}
            hitSlop={8}>
            <AppText type="strong" themeColor="danger">Remove</AppText>
          </Pressable>
          <Pressable onPress={() => setConfirming(null)} hitSlop={8}>
            <AppText type="strong">Cancel</AppText>
          </Pressable>
        </View>
      )}

      <Field
        label="New category"
        value={name}
        onChangeText={setName}
        placeholder="Halloween"
        returnKeyType="done"
        maxLength={30}
        onSubmitEditing={() => run(() => addCategory(name), () => setName(''))}
      />
      {!!error && <AppText themeColor="danger">{error}</AppText>}
      <Button
        title={busy ? 'Saving…' : 'Add category'}
        variant="secondary"
        disabled={busy}
        onPress={() => run(() => addCategory(name), () => setName(''))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 14, gap: 10, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingLeft: 12,
    paddingRight: 7,
    paddingVertical: 5,
  },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: Radius.medium, padding: 10 },
});
