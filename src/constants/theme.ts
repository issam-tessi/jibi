/**
 * App colors for light and dark mode. Components read these through `useTheme()`.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // iOS system label colors
    text: '#000000',
    textSecondary: 'rgba(60,60,67,0.6)',
    textMuted: 'rgba(60,60,67,0.3)',
    // iOS grouped backgrounds
    background: '#f2f2f7',
    backgroundElement: 'rgba(118,118,128,0.12)',
    backgroundSelected: 'rgba(118,118,128,0.24)',
    card: '#ffffff',
    border: 'rgba(60,60,67,0.29)',
    // Wallet-style balance card
    hero: '#1c1c1e',
    heroText: '#ffffff',
    heroTextSecondary: 'rgba(235,235,245,0.6)',
    // iOS system colors (always paired with a sign/icon, never color alone)
    income: '#248a3d',
    expense: '#d70015',
    savings: '#5856d6',
    unsorted: '#8e8e93',
    accent: '#007aff',
  },
  dark: {
    text: '#ffffff',
    textSecondary: 'rgba(235,235,245,0.6)',
    textMuted: 'rgba(235,235,245,0.3)',
    background: '#000000',
    backgroundElement: 'rgba(118,118,128,0.24)',
    backgroundSelected: 'rgba(118,118,128,0.36)',
    card: '#1c1c1e',
    border: 'rgba(84,84,88,0.65)',
    hero: '#2c2c2e',
    heroText: '#ffffff',
    heroTextSecondary: 'rgba(235,235,245,0.6)',
    income: '#30d158',
    expense: '#ff453a',
    savings: '#5e5ce6',
    unsorted: '#8e8e93',
    accent: '#0a84ff',
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
  small: 8,
  medium: 10,
  large: 12,
  card: 20,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
