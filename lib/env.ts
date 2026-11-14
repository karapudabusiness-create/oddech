/** Konfiguracja z `.env` (zmienne EXPO_PUBLIC_* są wstrzykiwane do bundla). */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export const isSupabaseConfigured = (): boolean =>
  env.supabaseUrl.startsWith('https://') && env.supabaseAnonKey.length > 20;
