import { Platform } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, shadows } from '../../constants/spacing';

/** Shared visual tokens for the home experience */
export const homeTheme = {
  bg: '#FAFAF9',
  surface: colors.surface,
  surfaceMuted: '#F5F5F4',
  surfaceWarm: '#FFF7ED',
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primarySoft: colors.primarySoft,
  text: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,
  border: colors.border,
  borderLight: '#F0EEEC',
  success: colors.success,
  star: '#F59E0B',
  heroGradient: ['#FFF7ED', '#FFFFFF', '#FAFAF9'],
  ctaGradient: [colors.primary, colors.primaryDark],
};

export const homeLayout = {
  pad: 20,
  gap: 10,
  sectionGap: 28,
  categoryHeight: 102,
  featuredCardW: 168,
  featuredCardH: 210,
};

export function homeCardShadow(elevation = 3) {
  return Platform.select({
    ios: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.06,
      shadowRadius: elevation * 3,
    },
    android: { elevation },
    web: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.08,
      shadowRadius: elevation * 3,
    },
    default: { elevation },
  });
}

export const homeRadius = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
};
