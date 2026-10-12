import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePreferences } from '@/providers/preferences-provider';

/** System scheme unless the user picked Light/Dark in Settings. */
export function useColorScheme() {
  const system = useSystemColorScheme();
  const { appearance } = usePreferences();
  return appearance === 'system' ? system : appearance;
}
