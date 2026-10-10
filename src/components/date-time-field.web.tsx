import { createElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { Fonts, Radius } from '@/constants/theme';
import { toIsoDate } from '@/data/dates';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  style?: StyleProp<ViewStyle>;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** The native picker has no web version, so the web build uses the browser's own date and time inputs. */
export function DateTimeField({ label, mode, value, onChange, minimumDate, style }: Props) {
  const theme = useTheme();
  const inputValue = mode === 'date' ? toIsoDate(value) : `${pad(value.getHours())}:${pad(value.getMinutes())}`;

  const handleChange = (raw: string) => {
    if (!raw) return;
    const next = new Date(value);
    if (mode === 'date') {
      const [y, m, d] = raw.split('-').map(Number);
      next.setFullYear(y, m - 1, d);
    } else {
      const [h, min] = raw.split(':').map(Number);
      next.setHours(h, min, 0, 0);
    }
    onChange(next);
  };

  return (
    <View style={[{ gap: 5 }, style]}>
      <AppText type="label" style={{ marginTop: 6 }}>{label}</AppText>
      {createElement('input', {
        type: mode,
        value: inputValue,
        min: mode === 'date' && minimumDate ? toIsoDate(minimumDate) : undefined,
        step: mode === 'time' ? 300 : undefined,
        'aria-label': label,
        onChange: (e: { target: { value: string } }) => handleChange(e.target.value),
        style: StyleSheet.flatten([
          styles.input,
          { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
        ]),
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: Radius.medium,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
});
