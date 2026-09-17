import { create } from 'zustand';

/**
 * Small, non-blocking notices for things that don't deserve a modal: a
 * dropped sync, a nudge from your partner, "photo attached". Rendered by
 * `<ToastHost />` (mounted once in App.tsx). Serious errors still use Alert.
 */
export type ToastKind = 'info' | 'success' | 'error';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  icon?: string;
  /** ms; defaults by kind. */
  duration: number;
  onPress?: () => void;
}

interface ToastState {
  items: ToastItem[];
  show: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;
const DEFAULT_DURATION: Record<ToastKind, number> = { info: 3200, success: 2400, error: 4200 };

export const useToastStore = create<ToastState>()((set) => ({
  items: [],
  show: (toast) => {
    const id = nextId++;
    const item: ToastItem = { ...toast, id, duration: toast.duration ?? DEFAULT_DURATION[toast.kind] };
    // Keep at most two on screen; the oldest makes room.
    set((s) => ({ items: [...s.items.slice(-1), item] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (title: string, body?: string, extra?: Partial<ToastItem>) => useToastStore.getState().show({ kind: 'info', title, body, ...extra }),
  success: (title: string, body?: string, extra?: Partial<ToastItem>) => useToastStore.getState().show({ kind: 'success', title, body, ...extra }),
  error: (title: string, body?: string, extra?: Partial<ToastItem>) => useToastStore.getState().show({ kind: 'error', title, body, ...extra }),
};
