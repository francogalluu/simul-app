import { create } from 'zustand';

// In-memory mock task list for the Home screen preview — not persisted, no
// backend. Real habit data + pairing/invites are deliberately deferred until
// the product shape is settled (see BACKLOG.md).

export type Owner = 'A' | 'S' | 'both';

/** 'pending' = shared habit invite sent but not yet accepted by the partner (mock only — no real accept flow exists). */
export type TaskStatus = 'active' | 'pending';

export interface TaskItem {
  id: number;
  name: string;
  time: string;
  owner: Owner;
  done: boolean;
  status: TaskStatus;
  icon: string;
}

const INITIAL_ITEMS: TaskItem[] = [
  { id: 1, name: 'Morning stretch', time: '7:00am', owner: 'A', done: true, status: 'active', icon: '🧘' },
  { id: 2, name: 'Drink 2L water', time: 'All day', owner: 'both', done: false, status: 'active', icon: '💧' },
  { id: 3, name: 'No sugar today', time: 'All day', owner: 'S', done: true, status: 'active', icon: '🚫' },
  { id: 4, name: 'Evening walk together', time: '6:30pm', owner: 'both', done: false, status: 'active', icon: '🚶' },
  { id: 5, name: 'Read 10 pages', time: '9:00pm', owner: 'S', done: false, status: 'active', icon: '📖' },
];

interface TasksState {
  items: TaskItem[];
  toggleItem: (id: number) => void;
  addItem: (draft: { name: string; time: string; owner: Owner; status?: TaskStatus; icon?: string }) => void;
}

let nextId = INITIAL_ITEMS.length + 1;

export const useTasksStore = create<TasksState>()((set) => ({
  items: INITIAL_ITEMS,
  toggleItem: (id) =>
    set((s) => ({
      items: s.items.map((it) => (it.id === id && it.status === 'active' ? { ...it, done: !it.done } : it)),
    })),
  addItem: (draft) =>
    set((s) => ({
      items: [
        ...s.items,
        {
          id: nextId++,
          name: draft.name,
          time: draft.time || 'All day',
          owner: draft.owner,
          done: false,
          status: draft.status ?? 'active',
          icon: draft.icon ?? '⭐',
        },
      ],
    })),
}));
