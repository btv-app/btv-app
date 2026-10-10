import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius } from '@/constants/theme';
import { formatTime } from '@/data/dates';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  style?: StyleProp<ViewStyle>;
};

/** A labeled date or time picker: the compact native picker on iPhone, a dialog on Android. */
export function DateTimeField({ label, mode, value, onChange, minimumDate, style }: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const text = mode === 'date'
    ? value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : formatTime(value);

  return (
    <View style={[{ gap: 5 }, style]}>
      <AppText type="label" style={styles.label}>{label}</AppText>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          minimumDate={minimumDate}
          minuteInterval={mode === 'time' ? 5 : undefined}
          accentColor={theme.primary}
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          onValueChange={(_, date) => onChange(date)}
          style={styles.ios}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${text}`}
          onPress={() =>
            DateTimePickerAndroid.open({ value, mode, minimumDate, onValueChange: (_, date) => onChange(date) })
          }
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <AppText>{text}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 6 },
  ios: { alignSelf: 'flex-start', marginLeft: -8 },
  input: { borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: 11, paddingVertical: 10 },
});
