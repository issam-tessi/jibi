import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { closeProfileDatabase, openProfileDatabase } from '@/lib/db';
import { importFromCloud } from '@/lib/db/import';
import { cloud } from '@/lib/supabase';

/** Same shape as before (session.user.id / .email) so the rest of the app is unchanged. */
export type Session = { user: { id: string; email: string; username: string } };

/** Stored per person on this device. `id` keeps the old cloud user id so per-user settings survive. */
type Credential = { id: string; salt: string; hash: string };

const SESSION_KEY = 'jibi.session';
const credKey = (username: string) => `jibi.auth.${username}`;
const emailOf = (username: string) => `${username}@jibi.app`;

const hash = (salt: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);

async function readCredential(username: string): Promise<Credential | null> {
  const raw = await AsyncStorage.getItem(credKey(username)).catch(() => null);
  return raw ? (JSON.parse(raw) as Credential) : null;
}

async function saveCredential(username: string, id: string, password: string) {
  const salt = Crypto.randomUUID();
  const cred: Credential = { id, salt, hash: await hash(salt, password) };
  await AsyncStorage.setItem(credKey(username), JSON.stringify(cred));
  return cred;
}

type SignInResult = { error: string | null; imported?: Record<string, number> };

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  /** Signs in with a local password; the first time on a device it checks the cloud and copies data over. */
  signIn: (username: string, password: string) => Promise<SignInResult>;
  /** Creates a local profile for someone who never had a cloud account. */
  createProfile: (username: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  hasLocalProfile: (username: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);

  const start = useCallback(async (username: string, id: string, withPassword = false) => {
    await openProfileDatabase(username);
    // Signing in with the password proves ownership, so it resets this device's Face ID lock
    // (escape hatch if the passkey was deleted or Face ID stops working).
    if (withPassword) await AsyncStorage.removeItem(`jibi.lock.enabled.${id}`).catch(() => {});
    await AsyncStorage.setItem(SESSION_KEY, username);
    setSession({ user: { id, email: emailOf(username), username } });
  }, []);

  // Resume the last session on launch.
  useEffect(() => {
    (async () => {
      const username = await AsyncStorage.getItem(SESSION_KEY).catch(() => null);
      const cred = username ? await readCredential(username) : null;
      if (username && cred) await start(username, cred.id).catch(() => AsyncStorage.removeItem(SESSION_KEY));
      setLoading(false);
    })();
  }, [start]);

  const signIn = useCallback(
    async (username: string, password: string): Promise<SignInResult> => {
      const cred = await readCredential(username);
      if (cred) {
        if ((await hash(cred.salt, password)) !== cred.hash) return { error: 'Wrong password.' };
        await start(username, cred.id, true);
        return { error: null };
      }

      // First sign-in on this device: the cloud vouches for the password, then we bring the data over.
      if (!cloud) return { error: 'This device has no data yet and cloud import isn’t configured.' };
      const { data, error } = await cloud.auth.signInWithPassword({ email: emailOf(username), password });
      if (error) {
        if (error.message === 'Invalid login credentials') return { error: 'Wrong password.' };
        return { error: `Couldn’t reach the cloud to bring your data over (${error.message}). Check your connection.` };
      }
      try {
        await openProfileDatabase(username);
        const imported = await importFromCloud();
        await saveCredential(username, data.user.id, password);
        await start(username, data.user.id, true);
        return { error: null, imported };
      } catch (e) {
        closeProfileDatabase();
        return { error: e instanceof Error ? e.message : String(e) };
      } finally {
        await cloud.auth.signOut().catch(() => {});
      }
    },
    [start]
  );

  const createProfile = useCallback(
    async (username: string, password: string): Promise<SignInResult> => {
      if (await readCredential(username)) return { error: 'This profile already exists on this device.' };
      await saveCredential(username, username, password);
      await start(username, username, true);
      return { error: null };
    },
    [start]
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    closeProfileDatabase();
    setSession(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, isLoading, signIn, createProfile, signOut, hasLocalProfile: async (u) => !!(await readCredential(u)) }),
    [session, isLoading, signIn, createProfile, signOut]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
