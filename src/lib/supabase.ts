import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** False until both values are set in .env; the app then runs on sample data with a demo sign-in. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Static web rendering runs without a window, where AsyncStorage can't work.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        ...(isServer ? {} : { storage: AsyncStorage }),
        autoRefreshToken: !isServer,
        persistSession: !isServer,
        detectSessionInUrl: false,
      },
    })
  : null;

// Keep the session fresh only while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
