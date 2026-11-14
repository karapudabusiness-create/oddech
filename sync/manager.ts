import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { db } from '@/db/client';
import { onLocalChange } from '@/db/changes';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/stores/account';
import { pendingCount, syncOnce } from './engine';
import { supabaseRemote } from './supabaseRemote';

const DEBOUNCE_MS = 2500;
const RETRY_MS = [5_000, 15_000, 60_000, 300_000];

let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let retry = 0;
let online = true;

async function refreshPending() {
  useAccount.getState().set({ pending: await pendingCount(db) });
}

/** Uruchamia synchronizację (pojedynczo – kolejne wywołania w trakcie są łączone). */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    const { session, set } = useAccount.getState();
    if (!supabase || !session) {
      set({ sync: 'disabled' });
      return;
    }
    if (!online) {
      await refreshPending();
      set({ sync: 'offline' });
      return;
    }
    set({ sync: 'syncing', lastError: null });
    try {
      do {
        again = false;
        await syncOnce(db, supabaseRemote(supabase), session.user.id);
      } while (again);
      retry = 0;
      await refreshPending();
      const pending = useAccount.getState().pending;
      set({ sync: pending ? 'pending' : 'idle', lastSyncedAt: new Date().toISOString() });
    } catch (e) {
      await refreshPending();
      set({
        sync: online ? 'error' : 'offline',
        lastError: e instanceof Error ? e.message : String(e),
      });
      if (__DEV__) console.warn('Synchronizacja nie powiodła się', e);
      const delay = RETRY_MS[Math.min(retry++, RETRY_MS.length - 1)]!;
      schedule(delay);
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

function schedule(ms = DEBOUNCE_MS) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, ms);
}

/**
 * Montowane w głównym layoucie: sesja Supabase + automatyczna synchronizacja
 * (start, logowanie, zmiany lokalne z opóźnieniem, powrót do aplikacji, odzyskanie sieci).
 */
export function useSyncManager(): void {
  useEffect(() => {
    const store = useAccount.getState();
    if (!supabase) {
      store.set({ ready: true, sync: 'disabled' });
      return;
    }
    const client = supabase;
    void client.auth.getSession().then(({ data }) => {
      useAccount.getState().set({ session: data.session, ready: true });
      if (data.session) void syncNow();
    });
    const { data: authSub } = client.auth.onAuthStateChange((event, session) => {
      useAccount
        .getState()
        .set({ session, sync: session ? useAccount.getState().sync : 'disabled' });
      if (event === 'SIGNED_IN') void syncNow();
    });

    const unsubscribeChanges = onLocalChange((source) => {
      if (source === 'sync') return;
      void refreshPending().then(() => {
        const s = useAccount.getState();
        if (s.session && s.sync !== 'syncing') s.set({ sync: online ? 'pending' : 'offline' });
      });
      schedule();
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    const netUnsub = NetInfo.addEventListener((s) => {
      const nowOnline = s.isConnected !== false && s.isInternetReachable !== false;
      const cameBack = nowOnline && !online;
      online = nowOnline;
      if (cameBack) void syncNow();
      else if (!nowOnline && useAccount.getState().session)
        useAccount.getState().set({ sync: 'offline' });
    });

    return () => {
      authSub.subscription.unsubscribe();
      unsubscribeChanges();
      appSub.remove();
      netUnsub();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
