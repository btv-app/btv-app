import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppTextProps = TextProps & {
  type?: 'default' | 'small' | 'strong' | 'cardTitle' | 'label' | 'title' | 'script';
  themeColor?: ThemeColor;
};

export function AppText({ style, type = 'default', themeColor, ...rest }: AppTextProps) {
  const theme = useTheme();
  const fallback: ThemeColor = type === 'small' || type === 'label' ? 'textSecondary' : type === 'script' ? 'accent' : 'text';

  return <Text style={[{ color: theme[themeColor ?? fallback] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: Fonts.bodyMedium, fontSize: 12.5, lineHeight: 18 },
  strong: { fontFamily: Fonts.bodySemiBold, fontSize: 15, lineHeight: 21 },
  cardTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, lineHeight: 19 },
  label: { fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, textTransform: 'uppercase', letterSpacing: 0.5 },
  script: { fontFamily: Fonts.displayItalic, fontSize: 21, lineHeight: 26 },
});
