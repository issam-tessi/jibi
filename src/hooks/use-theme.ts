/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { CategoryPalette, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}

/** Resolves a category palette slot (1..8) to a color for the current mode; null slot -> "Other" gray. */
export function useCategoryColor() {
  const scheme = useColorScheme();
  const palette = CategoryPalette[scheme === 'dark' ? 'dark' : 'light'];
  const unsorted = Colors[scheme === 'dark' ? 'dark' : 'light'].unsorted;
  return (slot: number | null | undefined) => (slot && slot >= 1 && slot <= 8 ? palette[slot - 1] : unsorted);
}
