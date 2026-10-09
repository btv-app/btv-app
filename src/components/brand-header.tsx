import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Slate header with the BTV wordmark and the sparkle rule from the brand graphics. */
export function BrandHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { backgroundColor: theme.header, paddingTop: insets.top + 10 }]}>
      <Text style={[styles.wordmark, { color: theme.onHeader }]} accessibilityLabel="Between the Villes">
        BETWEEN <Text style={styles.the}>THE</Text> VILLES
      </Text>
      <View style={styles.rule}>
        <View style={styles.line} />
        <Sparkle />
      </View>
    </View>
  );
}

/** Four-point star drawn with two rotated squares, so no SVG dependency is needed. */
function Sparkle() {
  return (
    <View style={styles.sparkle}>
      <View style={[styles.diamond, { transform: [{ scaleX: 0.28 }, { rotate: '45deg' }] }]} />
      <View style={[styles.diamond, { transform: [{ scaleY: 0.28 }, { rotate: '45deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16 },
  wordmark: { fontFamily: Fonts.bodyBold, fontSize: 15, letterSpacing: 4.5, textAlign: 'center' },
  the: { fontFamily: Fonts.bodyMedium, fontSize: 8, letterSpacing: 3 },
  rule: { height: 28, justifyContent: 'center', marginHorizontal: -16 },
  line: { height: 1.5, backgroundColor: Brand.royal },
  sparkle: { position: 'absolute', left: 30, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  diamond: { position: 'absolute', width: 18, height: 18, backgroundColor: Brand.royal },
});
