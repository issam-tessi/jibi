import { useEffect, useState } from 'react';

import { cloud } from '@/lib/supabase';
import { APP_USERS } from '@/lib/users';
import { useAuth } from '@/providers/auth-provider';

export type AppUser = {
  username: string;
  display_name: string;
  icon: string;
  /** Has a profile (password) on this device. */
  local: boolean;
  /** Has an account in the old cloud project whose data will be copied over on first sign-in. */
  cloud: boolean;
  /** Can sign in with an existing password (locally or via the cloud). */
  has_password: boolean;
};

export function usernameFromEmail(email: string | undefined) {
  return email?.split('@')[0] ?? '';
}

/** The fixed list of people, with whether each already has a profile here or data in the cloud. */
export function useAppUsers() {
  const { hasLocalProfile } = useAuth();
  const [state, setState] = useState<{ users: AppUser[]; error: string | null; loading: boolean }>({
    users: [],
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await Promise.all(APP_USERS.map((u) => hasLocalProfile(u.username)));
      // Best effort: offline just means we can't tell who still has cloud data to bring over.
      const remote = cloud ? await cloud.rpc('list_app_users').then((r) => r.data ?? [], () => []) : [];
      const inCloud = new Set(remote.filter((r) => r.has_password).map((r) => r.username));
      if (cancelled) return;
      setState({
        users: APP_USERS.map((u, i) => ({
          ...u,
          local: local[i],
          cloud: inCloud.has(u.username),
          has_password: local[i] || inCloud.has(u.username),
        })),
        error: null,
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [hasLocalProfile]);

  return state;
}
