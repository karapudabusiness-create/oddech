import { create } from 'zustand';

export interface ToastState {
  id: number;
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
  show: (message: string, action?: { label: string; onPress: () => void }) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  id: 0,
  message: null,
  show: (message, action) =>
    set((s) => ({ id: s.id + 1, message, actionLabel: action?.label, onAction: action?.onPress })),
  hide: () => set({ message: null, actionLabel: undefined, onAction: undefined }),
}));
