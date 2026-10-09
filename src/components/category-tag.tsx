import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { Category } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

export function CategoryTag({ category, inverse }: { category: Category; inverse?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: inverse ? 'rgba(255,255,255,0.2)' : theme.backgroundElement }]}>
      <AppText type="label" style={[styles.text, { color: inverse ? '#FFFFFF' : theme.text }]}>
        {category}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  text: { fontSize: 10 },
});
