import * as Linking from 'expo-linking';

import { db } from '@/db/client';
import { wipeLocalData } from '@/db/repositories/maintenance';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/stores/account';
import { clearSyncState, pendingCount } from '@/sync/engine';
import { syncNow } from '@/sync/manager';

export class AuthActionError extends Error {
  constructor(
    public readonly code:
      'not-configured' | 'invalid-email' | 'invalid-code' | 'rate-limit' | 'network' | 'other',
  ) {
    super(code);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapError(e: { message?: string; status?: number; code?: string } | null): AuthActionError {
  const msg = (e?.message ?? '').toLowerCase();
  if (e?.status === 429 || msg.includes('rate limit') || msg.includes('security purposes'))
    return new AuthActionError('rate-limit');
  if (msg.includes('expired') || msg.includes('invalid') || e?.code === 'otp_expired')
    return new AuthActionError('invalid-code');
  if (msg.includes('network') || msg.includes('fetch')) return new AuthActionError('network');
  return new AuthActionError('other');
}

/** Wysyła e-mail z 6-cyfrowym kodem (i linkiem logowania). Konto jest zakładane automatycznie. */
export async function sendLoginCode(email: string): Promise<void> {
  if (!supabase) throw new AuthActionError('not-configured');
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) throw new AuthActionError('invalid-email');
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('auth/callback') },
  });
  if (error) throw mapError(error);
}

export async function verifyLoginCode(email: string, code: string): Promise<void> {
  if (!supabase) throw new AuthActionError('not-configured');
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.replace(/\D/g, ''),
    type: 'email',
  });
  if (error) throw mapError(error);
}

/** Link z e-maila (PKCE): oddech://auth/callback?code=… */
export async function completeMagicLink(code: string): Promise<void> {
  if (!supabase) throw new AuthActionError('not-configured');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw mapError(error);
}

/** Czy na urządzeniu są zmiany, które jeszcze nie trafiły na konto. */
export async function hasUnsyncedChanges(): Promise<boolean> {
  return (await pendingCount(db)) > 0;
}

/**
 * Wylogowanie: najpierw próba wysłania zmian, potem usunięcie danych konta z telefonu
 * (zostają na koncie; po ponownym zalogowaniu wrócą).
 */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  try {
    await syncNow();
  } catch {
    // brak sieci – użytkownik został ostrzeżony przed wywołaniem
  }
  await supabase.auth.signOut({ scope: 'local' });
  await clearSyncState(db);
  await wipeLocalData(db, { keepOnboarding: true });
  useAccount.getState().set({ session: null, sync: 'disabled', pending: 0, lastSyncedAt: null });
}

/** Trwałe usunięcie konta i wszystkich danych na serwerze oraz na tym telefonie. */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new AuthActionError('not-configured');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw mapError(error);
  await supabase.auth.signOut({ scope: 'local' });
  await clearSyncState(db);
  await wipeLocalData(db);
  useAccount.getState().set({ session: null, sync: 'disabled', pending: 0, lastSyncedAt: null });
}
