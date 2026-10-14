import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';

export type Appearance = 'system' | 'light' | 'dark';
export type HomeView = 'recent' | 'day' | 'week' | 'month';
/** 1 = Monday, 0 = Sunday (matches Date#getDay). */
export type WeekStart = 0 | 1;

export type Preferences = {
  appearance: Appearance;
  /** CategoryPalette slot (0..7) used as the app accent; 0 is the original blue. */
  accent: number;
  homeView: HomeView;
  weekStart: WeekStart;
  /** Gym visits a week to aim for. */
  gymGoal: number;
  /** City used for prayer times. */
  prayerCity: string;
};

export const DEFAULT_PREFERENCES: Preferences = { appearance: 'system', accent: 0, homeView: 'recent', weekStart: 1, gymGoal: 3, prayerCity: 'tunis' };

const STORAGE_KEY = 'jibi.preferences';

type PreferencesContext = Preferences & {
  ready: boolean;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
};

const Context = createContext<PreferencesContext | null>(null);

/** Device-local look & feel settings. Lives above auth so the sign-in screen follows the chosen theme too. */
export function PreferencesProvider({ children }: PropsWithChildren) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setPrefs({ ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: Preferences) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  }, []);

  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      setPrefs((prev) => persist({ ...prev, [key]: value })),
    [persist],
  );

  const reset = useCallback(() => setPrefs(persist(DEFAULT_PREFERENCES)), [persist]);

  return <Context value={{ ...prefs, ready, setPreference, reset }}>{children}</Context>;
}

export function usePreferences() {
  const ctx = use(Context);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}
