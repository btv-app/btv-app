import { Pressable, ScrollView, StyleSheet, View, type PressableProps } from 'react-native';

import { AppText } from '@/components/app-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundElement }]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: theme.card }]}>
            <AppText type="strong" style={styles.segmentText}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              { borderColor: selected ? theme.text : theme.border, backgroundColor: selected ? theme.text : theme.card },
            ]}>
            <AppText type="small" style={{ color: selected ? theme.background : theme.text }}>
              {option}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A single on/off chip, for multi-select rows and quick filters. */
export function ToggleChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { borderColor: selected ? theme.text : theme.border, backgroundColor: selected ? theme.text : theme.card }]}>
      <AppText type="small" style={{ color: selected ? theme.background : theme.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Button({
  title,
  variant = 'primary',
  ...rest
}: PressableProps & { title: string; variant?: 'primary' | 'secondary' | 'accent' }) {
  const theme = useTheme();
  const background = variant === 'primary' ? theme.primary : variant === 'accent' ? theme.accent : theme.card;
  const color = variant === 'primary' ? theme.onPrimary : variant === 'accent' ? theme.background : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        variant === 'secondary' && styles.buttonOutline,
      ]}
      {...rest}>
      <AppText style={[styles.buttonText, { color }]}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', borderRadius: Radius.medium, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  segmentText: { fontSize: 13 },
  chips: { gap: 6, paddingVertical: Spacing.two },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  button: { borderRadius: Radius.medium, paddingVertical: 13, alignItems: 'center' },
  buttonOutline: { borderWidth: 1 },
  buttonText: { fontFamily: Fonts.bodyBold },
});
