/**
 * App colors for light and dark mode. Components read these through `useTheme()`.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0b0b0b',
    textSecondary: '#52514e',
    textMuted: '#898781',
    background: '#f9f9f7',
    backgroundElement: '#efeee9',
    backgroundSelected: '#e1e0d9',
    card: '#ffffff',
    border: 'rgba(11,11,11,0.10)',
    // Hero balance card
    hero: '#14213d',
    heroText: '#ffffff',
    heroTextSecondary: '#b9c3d9',
    // Money semantics (always paired with a sign/icon, never color alone)
    income: '#006300',
    expense: '#c23434',
    savings: '#2a78d6',
    unsorted: '#a8a69f',
    accent: '#2a78d6',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#c3c2b7',
    textMuted: '#898781',
    background: '#0d0d0d',
    backgroundElement: '#1f1f1d',
    backgroundSelected: '#2c2c2a',
    card: '#1a1a19',
    border: 'rgba(255,255,255,0.10)',
    hero: '#1b2a4a',
    heroText: '#ffffff',
    heroTextSecondary: '#a9b6d1',
    income: '#0ca30c',
    expense: '#e66767',
    savings: '#3987e5',
    unsorted: '#5c5b57',
    accent: '#3987e5',
  },
} as const;

/**
 * Fixed categorical palette (validated for color-vision deficiency in this order).
 * Category N always uses slot N; never cycle — categories without a slot fold into "Other".
 */
export const CategoryPalette = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

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
  small: 10,
  medium: 16,
  large: 24,
} as const;

/** Height of the bottom tab bar (above the safe-area inset). */
export const BottomTabInset = 64;
export const MaxContentWidth = 720;
