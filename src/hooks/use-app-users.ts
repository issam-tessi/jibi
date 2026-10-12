import { useEffect, useState } from 'react';

import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type AppUser = Database['public']['Functions']['list_app_users']['Returns'][number];

/** Must match public.app_user_email() in the database. */
export function appUserEmail(username: string) {
  return `${username.toLowerCase()}@jibi.app`;
}

export function usernameFromEmail(email: string | undefined) {
  return email?.split('@')[0] ?? '';
}

/** The fixed list of people who can use the app, with whether each has set a password yet. */
export function useAppUsers() {
  const [state, setState] = useState<{ users: AppUser[]; error: string | null; loading: boolean }>({
    users: [],
    error: null,
    loading: true,
  });

  useEffect(() => {
    supabase.rpc('list_app_users').then(({ data, error }) => {
      setState({ users: data ?? [], error: error?.message ?? null, loading: false });
    });
  }, []);

  return state;
}
