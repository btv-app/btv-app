/**
 * Between the Villes brand. Colors are sampled from BTV's own social graphics;
 * fonts are Bodoni Moda (headlines, italic script) and Montserrat (everything else).
 */

import '@/global.css';

export const Brand = {
  slate: '#517C9F',
  royal: '#003087',
  navy: '#011C53',
  sky: '#9FC4F0',
  ice: '#BDDEFF',
  white: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: '#0B1F45',
    textSecondary: '#586D87',
    background: '#EEF4FA',
    card: '#FFFFFF',
    border: '#D2DFED',
    backgroundElement: '#DCEBFB',
    primary: Brand.royal,
    onPrimary: Brand.white,
    accent: Brand.slate,
    header: Brand.slate,
    onHeader: Brand.white,
    dateBadge: Brand.ice,
    onDateBadge: Brand.navy,
    success: '#2F7D4F',
    danger: '#B23B3B',
  },
  dark: {
    text: '#E8F1FB',
    textSecondary: '#9DB2CC',
    background: '#0A1730',
    card: '#12254A',
    border: '#243B63',
    backgroundElement: '#1C3358',
    primary: Brand.sky,
    onPrimary: Brand.navy,
    accent: Brand.ice,
    header: '#3E6487',
    onHeader: Brand.white,
    dateBadge: Brand.ice,
    onDateBadge: Brand.navy,
    success: '#6CC38F',
    danger: '#E57878',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Font family names as registered by useFonts in the root layout. */
export const Fonts = {
  display: 'BodoniModa_400Regular',
  displayItalic: 'BodoniModa_400Regular_Italic',
  body: 'Montserrat_400Regular',
  bodyMedium: 'Montserrat_500Medium',
  bodySemiBold: 'Montserrat_600SemiBold',
  bodyBold: 'Montserrat_700Bold',
  bodyExtraBold: 'Montserrat_800ExtraBold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

export const MaxContentWidth = 800;
