import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

export type SyncState = 'disabled' | 'idle' | 'syncing' | 'pending' | 'offline' | 'error';

interface AccountStore {
  session: Session | null;
  /** Czy sprawdzono już zapisaną sesję (start aplikacji). */
  ready: boolean;
  sync: SyncState;
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  set: (patch: Partial<Omit<AccountStore, 'set'>>) => void;
}

export const useAccount = create<AccountStore>((set) => ({
  session: null,
  ready: false,
  sync: 'disabled',
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
  set: (patch) => set(patch),
}));
