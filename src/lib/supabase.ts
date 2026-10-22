import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Data now lives on the device (SQLite). The old Supabase project is only used once per person and device,
// to verify their existing password and copy their data over; null when not configured.
export const cloud =
  supabaseUrl && supabasePublishableKey
    ? createClient<Database>(supabaseUrl, supabasePublishableKey, {
        auth: { storage: AsyncStorage, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;
