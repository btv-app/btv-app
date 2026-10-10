import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/controls';
import { Field } from '@/components/field';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Owner-only editor for a list people pick from, like categories ("Halloween" for the season)
 * or towns. Removing an item only takes it off the pickers; events that already use it keep it.
 */
export function ListManager({
  items,
  onAdd,
  onRemove,
  help,
  newLabel,
  placeholder,
}: {
  items: string[];
  onAdd: (name: string) => Promise<string | null>;
  onRemove: (name: string) => Promise<string | null>;
  help: string;
  newLabel: string;
  placeholder: string;
}) {
  const theme = useTheme();
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
      <AppText type="small">{help}</AppText>
      <View style={styles.wrap}>
        {items.map((c) => (
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
            onPress={() => run(() => onRemove(confirming), () => setConfirming(null))}
            hitSlop={8}>
            <AppText type="strong" themeColor="danger">Remove</AppText>
          </Pressable>
          <Pressable onPress={() => setConfirming(null)} hitSlop={8}>
            <AppText type="strong">Cancel</AppText>
          </Pressable>
        </View>
      )}

      <Field
        label={newLabel}
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        returnKeyType="done"
        maxLength={30}
        onSubmitEditing={() => run(() => onAdd(name), () => setName(''))}
      />
      {!!error && <AppText themeColor="danger">{error}</AppText>}
      <Button
        title={busy ? 'Saving…' : 'Add'}
        variant="secondary"
        disabled={busy}
        onPress={() => run(() => onAdd(name), () => setName(''))}
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
