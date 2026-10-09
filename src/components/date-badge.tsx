import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { monthShort, parseDate, weekdayShort } from '@/data/dates';
import { useTheme } from '@/hooks/use-theme';

/** Ice-blue date circle, as on BTV's lineup graphics. */
export function DateBadge({ date, size = 54 }: { date: string; size?: number }) {
  const theme = useTheme();
  const color = theme.onDateBadge;

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.dateBadge }]}>
      <Text style={[styles.small, { color }]}>{weekdayShort(date)}</Text>
      <Text style={[styles.day, { color }]}>{parseDate(date).getDate()}</Text>
      <Text style={[styles.small, { color }]}>{monthShort(date)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  small: { fontFamily: Fonts.bodyBold, fontSize: 8.5, letterSpacing: 0.8 },
  day: { fontFamily: Fonts.bodyExtraBold, fontSize: 18, lineHeight: 21 },
});
