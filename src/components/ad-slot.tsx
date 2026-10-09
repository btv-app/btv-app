import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Where ads render. Local sponsors (sold by the BTV owner) fill these first;
 * Google AdMob fills the rest once it's added in a development build.
 */
export function AdSlot({ kind }: { kind: 'native' | 'banner' }) {
  const theme = useTheme();

  if (kind === 'banner') {
    return (
      <View style={[styles.banner, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <AppText type="label">Ad</AppText>
        <AppText type="small">Your Cheatham County business here</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.native, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.logo, { backgroundColor: theme.accent }]}>
        <AppText type="cardTitle" style={{ color: theme.background }}>
          RH
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText type="label">Sponsored · Local</AppText>
        <AppText type="cardTitle">Riverbend Hardware</AppText>
        <AppText type="small">Fall bulbs and mums are in. 10% off with the BTV app.</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 54,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  native: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logo: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
