import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env, isSupabaseConfigured } from './env';

/** Adres bez końcowego ukośnika (supabase-js dokleja ścieżki /auth/v1, /rest/v1). */
const baseUrl = env.supabaseUrl.replace(/\/+$/, '');

/**
 * Klient Supabase – null, gdy w `.env` nie ma kluczy (aplikacja działa wtedy w pełni lokalnie).
 * Sesja jest przechowywana w AsyncStorage i odświeżana automatycznie, gdy aplikacja jest aktywna.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(baseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock: processLock,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
