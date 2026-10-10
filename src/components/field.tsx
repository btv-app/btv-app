import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/app-text';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A labeled text input in the brand style. */
export function Field({ label, style, multiline, ...rest }: TextInputProps & { label: string }) {
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
  label: { marginTop: 6 },
  input: { borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: 11, paddingVertical: 10, fontFamily: Fonts.body, fontSize: 15 },
});
