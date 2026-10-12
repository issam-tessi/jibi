import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { usernameFromEmail } from '@/hooks/use-app-users';
import { biometricAvailable, enrollBiometric, forgetBiometric, verifyBiometric } from '@/lib/biometric';
import { useAuth } from '@/providers/auth-provider';

const RELOCK_AFTER_MS = 5 * 60 * 1000;

type Privacy = {
  /** Face ID lock is turned on for this user on this device. */
  enabled: boolean;
  /** Balances are currently hidden. */
  locked: boolean;
  /** This device can do Face ID / Touch ID / Windows Hello. */
  available: boolean;
  unlock: () => Promise<boolean>;
  lock: () => void;
  enable: () => Promise<boolean>;
  disable: () => Promise<boolean>;
};

const PrivacyContext = createContext<Privacy | null>(null);

/**
 * Privacy screen for balances: hides amounts until the device owner passes Face ID.
 * It's a shoulder-surfing guard, not encryption — data access is still governed by sign-in and RLS.
 */
export function PrivacyProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const name = usernameFromEmail(session?.user.email);
  const settingKey = `jibi.lock.enabled.${userId}`;

  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [available, setAvailable] = useState(false);
  const [unlockedAt, setUnlockedAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([AsyncStorage.getItem(settingKey).catch(() => null), biometricAvailable()]).then(([on, can]) => {
      if (cancelled) return;
      setAvailable(can);
      setEnabled(on === '1');
      setLocked(on === '1');
    });
    return () => {
      cancelled = true;
    };
  }, [settingKey]);

  const lock = useCallback(() => {
    if (enabled) setLocked(true);
  }, [enabled]);

  // Relock whenever the app/tab goes to the background...
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') lock();
    });
    return () => sub.remove();
  }, [lock]);

  // ...and a few minutes after unlocking.
  useEffect(() => {
    if (!enabled || locked || !unlockedAt) return;
    const timer = setTimeout(lock, RELOCK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [enabled, locked, unlockedAt, lock]);

  const unlock = useCallback(async () => {
    if (!enabled) return true;
    const ok = await verifyBiometric(userId);
    if (ok) {
      setLocked(false);
      setUnlockedAt(Date.now());
    }
    return ok;
  }, [enabled, userId]);

  const enable = useCallback(async () => {
    const ok = await enrollBiometric(userId, name);
    if (!ok) return false;
    await AsyncStorage.setItem(settingKey, '1').catch(() => {});
    setEnabled(true);
    setLocked(false);
    setUnlockedAt(Date.now());
    return true;
  }, [userId, name, settingKey]);

  // Turning the lock off requires passing Face ID, so whoever holds the phone can't just disable it.
  const disable = useCallback(async () => {
    if (!(await verifyBiometric(userId))) return false;
    await AsyncStorage.removeItem(settingKey).catch(() => {});
    await forgetBiometric(userId);
    setEnabled(false);
    setLocked(false);
    return true;
  }, [userId, settingKey]);

  return (
    <PrivacyContext value={{ enabled, locked, available, unlock, lock, enable, disable }}>{children}</PrivacyContext>
  );
}

export function usePrivacy() {
  const ctx = use(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used inside <PrivacyProvider>');
  return ctx;
}

/** Placeholder shown instead of an amount while locked. */
export const MASKED = '•••••';
