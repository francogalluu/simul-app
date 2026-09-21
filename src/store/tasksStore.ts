import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase, toAppError, logError } from '@/lib/supabase';
import { showSyncError } from '@/lib/errors';
import { today } from '@/lib/dates';
import { normalizeDays } from '@/lib/weekdays';
import type { Owner, Person } from '@/lib/people';
import type { Member } from './householdStore';

// Habits + completions for the signed-in user's household, synced with Supabase.
//
// Server rows are kept as-is (keyed by user id) and translated into the
// app-level shape the UI and streak logic use, where the two people are
// slots: 'A' = whoever created the household, 'S' = the partner who joined.
//
// Writes are optimistic: the UI updates immediately, the request runs in the
// background, and a failure rolls back and shows an error. Rows get their UUID
// on the device, so a Realtime echo of our own write lands on the same id.

export type HabitStatus = 'active' | 'pending';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'All day';

export interface Habit {
  id: string;
  name: string;
  time: string;
  owner: Owner;
  icon: string;
  status: HabitStatus;
  /** YYYY-MM-DD the habit was created; it is not "active" on days before this. */
  createdAt: string;
  /** For shared habits: who sent the invite. */
  requestedBy?: Person;
  /** Completing it needs a photo that the other person validates. */
  requireProof: boolean;
  /** Weekdays it repeats on, as a bitmask (see lib/weekdays). Every day unless the person picked some. */
  days: number;
}

/** completions[date][habitId] = which people completed it that day. A completion whose proof is still pending doesn't count yet. */
export type Completions = Record<string, Record<string, Partial<Record<Person, boolean>>>>;

/** 'pending' = photo sent, waiting for the other person; 'approved' = validated. */
export type ProofStatus = 'pending' | 'approved';

export interface Proof {
  /** The completion row id. */
  id: string;
  /** Storage path in the habit-proofs bucket. */
  path: string;
  status: ProofStatus;
}

/** proofs[date][habitId] = the photo each person attached to their completion. */
export type Proofs = Record<string, Record<string, Partial<Record<Person, Proof>>>>;

export interface HabitDraft {
  name: string;
  time: string;
  /** 'both' creates a pending invite for the partner. */
  owner: 'me' | 'both';
  icon: string;
  requireProof?: boolean;
  days?: number;
}

type SyncStatus = 'idle' | 'loading' | 'ready' | 'error';

interface HabitRow {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  time_of_day: string;
  owner_id: string | null;
  status: HabitStatus;
  requested_by: string | null;
  created_on: string;
  created_at: string;
  require_proof: boolean;
  days_of_week: number;
}

interface CompletionRow {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  proof_path: string | null;
  proof_status: ProofStatus | null;
}

interface TasksState {
  status: SyncStatus;
  habits: Habit[];
  completions: Completions;
  proofs: Proofs;

  start: (householdId: string, userId: string, members: Member[]) => Promise<void>;
  setMembers: (members: Member[]) => void;
  refetch: () => Promise<void>;
  stop: () => void;

  addHabit: (draft: HabitDraft) => string;
  updateHabit: (id: string, patch: Partial<Pick<Habit, 'name' | 'time' | 'icon' | 'requireProof' | 'days'>>) => void;
  removeHabit: (id: string) => void;
  acceptInvite: (id: string) => void;
  declineInvite: (id: string) => void;
  /** Flip my completion of a habit on a date. Returns the new completion state for that habit/date. */
  toggleCompletion: (habitId: string, date: string, person: Person, proofPath?: string) => Partial<Record<Person, boolean>>;
  /** The other person validates (approve) or rejects a pending proof. Rejecting removes the completion. */
  reviewProof: (completionId: string, approve: boolean) => void;
}

export const MAX_HABIT_NAME = 80;
const TIMES: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'All day'];
const HABIT_COLUMNS = 'id, household_id, name, icon, time_of_day, owner_id, status, requested_by, created_on, created_at, require_proof, days_of_week';
const COMPLETION_COLUMNS = 'id, habit_id, user_id, date, proof_path, proof_status';
const PAGE = 1000;

// ─── Module-level sync state (not part of React state) ───────────────────────

let ctx: { householdId: string; userId: string } | null = null;
let channel: RealtimeChannel | null = null;
let generation = 0; // bumps on start/stop so stale async work is ignored
let habitRows: Record<string, HabitRow> = {};
let completionRows: Record<string, CompletionRow> = {}; // by id
let slots: Record<string, Person> = {};
/** Keys `${habitId}|${date}` with my completion writes in flight; Realtime echoes for them are ignored. */
const pendingToggles = new Map<string, Promise<void>>();
/** Habits whose insert hasn't been confirmed yet; completions for them wait on it. */
const pendingHabitInserts = new Map<string, Promise<boolean>>();

const completionKey = (habitId: string, userId: string, date: string) => `${habitId}|${userId}|${date}`;

function slotsFor(members: Member[]): Record<string, Person> {
  const map: Record<string, Person> = {};
  members.slice(0, 2).forEach((m, i) => { map[m.userId] = i === 0 ? 'A' : 'S'; });
  return map;
}

function derive(): Pick<TasksState, 'habits' | 'completions' | 'proofs'> {
  const habits: Habit[] = [];
  for (const row of Object.values(habitRows).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const owner: Owner | undefined = row.owner_id == null ? 'both' : slots[row.owner_id];
    if (!owner) continue; // owner left the household; server removes these
    habits.push({
      id: row.id,
      name: row.name,
      icon: row.icon,
      time: row.time_of_day,
      owner,
      status: row.status,
      createdAt: row.created_on,
      requestedBy: row.requested_by ? slots[row.requested_by] : undefined,
      requireProof: Boolean(row.require_proof),
      days: normalizeDays(row.days_of_week),
    });
  }
  const completions: Completions = {};
  const proofs: Proofs = {};
  for (const row of Object.values(completionRows)) {
    const person = slots[row.user_id];
    if (!person || !habitRows[row.habit_id]) continue;
    // A completion waiting for its proof to be validated doesn't count (streaks, progress) yet.
    if (row.proof_status !== 'pending') ((completions[row.date] ??= {})[row.habit_id] ??= {})[person] = true;
    if (row.proof_path) {
      ((proofs[row.date] ??= {})[row.habit_id] ??= {})[person] = {
        id: row.id,
        path: row.proof_path,
        status: row.proof_status === 'pending' ? 'pending' : 'approved',
      };
    }
  }
  return { habits, completions, proofs };
}

async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export const useTasksStore = create<TasksState>()((set, get) => {
  const publish = () => set(derive());

  const fail = (context: string, error: unknown) => {
    logError(context, error);
    showSyncError(toAppError(error));
  };

  async function loadAll(gen: number) {
    if (!ctx) return;
    const { householdId } = ctx;
    const fetchOnce = () =>
      Promise.all([
        fetchAll<HabitRow>((from, to) =>
          supabase.from('habits').select(HABIT_COLUMNS).eq('household_id', householdId).order('id').range(from, to),
        ),
        fetchAll<CompletionRow>((from, to) =>
          supabase.from('completions').select(COMPLETION_COLUMNS).eq('household_id', householdId).order('id').range(from, to),
        ),
      ]);
    try {
      let habits: HabitRow[];
      let completions: CompletionRow[];
      try {
        [habits, completions] = await fetchOnce();
      } catch (e) {
        if (gen !== generation) return;
        // The project's database connection can briefly recycle after a period
        // of no activity; the first request right after that can fail even
        // though the project is otherwise healthy. One quiet retry covers it.
        logError('tasks.load.retrying', e);
        await new Promise((resolve) => setTimeout(resolve, 900));
        if (gen !== generation) return;
        [habits, completions] = await fetchOnce();
      }
      if (gen !== generation) return;
      habitRows = Object.fromEntries(habits.map((h) => [h.id, h]));
      // For my toggles still in flight, the local (optimistic) state wins over what the server had.
      const userId = ctx?.userId;
      const isPendingMine = (c: CompletionRow) => c.user_id === userId && pendingToggles.has(`${c.habit_id}|${c.date}`);
      const keep = [...completions.filter((c) => !isPendingMine(c)), ...Object.values(completionRows).filter(isPendingMine)];
      completionRows = Object.fromEntries(keep.map((c) => [c.id, c]));
      set({ status: 'ready', ...derive() });
    } catch (e) {
      if (gen !== generation) return;
      logError('tasks.load', e);
      set({ status: get().status === 'ready' ? 'ready' : 'error' });
    }
  }

  function onHabitChange(payload: RealtimePostgresChangesPayload<HabitRow>) {
    if (payload.eventType === 'DELETE') {
      const id = (payload.old as Partial<HabitRow>).id;
      if (!id || !habitRows[id]) return;
      delete habitRows[id];
      for (const [cid, c] of Object.entries(completionRows)) if (c.habit_id === id) delete completionRows[cid];
    } else {
      const row = payload.new;
      if (!ctx || row.household_id !== ctx.householdId) return;
      habitRows[row.id] = row;
    }
    publish();
  }

  const toRow = (r: CompletionRow): CompletionRow => ({
    id: r.id,
    habit_id: r.habit_id,
    user_id: r.user_id,
    date: r.date,
    proof_path: r.proof_path ?? null,
    proof_status: r.proof_status ?? null,
  });

  function onCompletionChange(payload: RealtimePostgresChangesPayload<CompletionRow & { household_id: string }>) {
    if (payload.eventType === 'DELETE') {
      const id = (payload.old as Partial<CompletionRow>).id;
      const row = id ? completionRows[id] : undefined;
      if (!row || (row.user_id === ctx?.userId && pendingToggles.has(`${row.habit_id}|${row.date}`))) return;
      delete completionRows[row.id];
    } else if (payload.eventType === 'INSERT') {
      const row = payload.new;
      if (!ctx || row.household_id !== ctx.householdId) return;
      if (row.user_id === ctx.userId && pendingToggles.has(`${row.habit_id}|${row.date}`)) return;
      // Drop any other local row for the same (habit, user, date) before adding.
      for (const [cid, c] of Object.entries(completionRows)) {
        if (completionKey(c.habit_id, c.user_id, c.date) === completionKey(row.habit_id, row.user_id, row.date)) delete completionRows[cid];
      }
      completionRows[row.id] = toRow(row);
    } else if (payload.eventType === 'UPDATE') {
      // The other person validated a proof (pending -> approved).
      const row = payload.new;
      if (!ctx || row.household_id !== ctx.householdId || !completionRows[row.id]) return;
      completionRows[row.id] = toRow(row);
    } else {
      return;
    }
    publish();
  }

  /** Bring the server in line with the local state for my completion of (habit, date). */
  async function syncToggle(habitId: string, date: string) {
    const gen = generation;
    if (!ctx) return;
    const { userId, householdId } = ctx;

    const created = pendingHabitInserts.get(habitId);
    if (created && !(await created)) return; // habit insert failed and was rolled back

    const local = Object.values(completionRows).find((c) => c.habit_id === habitId && c.user_id === userId && c.date === date);
    const { data: server, error: readError } = await supabase
      .from('completions').select('id, proof_path').eq('habit_id', habitId).eq('user_id', userId).eq('date', date).maybeSingle();
    if (gen !== generation) return;
    if (readError) throw readError;

    const removedProofPath = server?.proof_path ?? null;
    if (local && !server) {
      const { error } = await supabase.from('completions').insert({
        id: local.id,
        household_id: householdId,
        habit_id: habitId,
        user_id: userId,
        date,
        ...(local.proof_path ? { proof_path: local.proof_path, proof_status: local.proof_status ?? 'pending' } : {}),
      });
      if (error && error.code !== '23505') throw error; // 23505: already there (another device)
    } else if (!local && server) {
      const { error } = await supabase.from('completions').delete().eq('id', server.id);
      if (error) throw error;
      // The photo of a removed completion goes with it (best effort).
      if (removedProofPath) void supabase.storage.from('habit-proofs').remove([removedProofPath]);
    } else if (local && server && local.id !== server.id) {
      delete completionRows[local.id];
      completionRows[server.id] = { ...local, id: server.id };
    }
  }

  return {
    status: 'idle',
    habits: [],
    completions: {},
    proofs: {},

    start: async (householdId, userId, members) => {
      if (ctx?.householdId === householdId && ctx.userId === userId && channel) {
        get().setMembers(members);
        return;
      }
      get().stop();
      const gen = ++generation;
      ctx = { householdId, userId };
      slots = slotsFor(members);
      set({ status: 'loading' });

      let subscribedOnce = false;
      const filter = `household_id=eq.${householdId}`;
      // Realtime can't filter DELETE events (and doesn't apply RLS to them): they arrive
      // for every household but carry only the random primary key. Unknown ids are ignored.
      channel = supabase
        // A fresh name per start: removeChannel() is async, so reusing the topic right after stop() hands back
        // the old, already-subscribed channel and `.on()` throws, leaving the app stuck on the loading screen.
        .channel(`household:${householdId}:${gen}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habits', filter }, onHabitChange)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habits', filter }, onHabitChange)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'habits' }, onHabitChange)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completions', filter }, onCompletionChange)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'completions', filter }, onCompletionChange)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'completions' }, onCompletionChange)
        .subscribe((status) => {
          if (gen !== generation || status !== 'SUBSCRIBED') return;
          // After a reconnect we may have missed events: resync everything.
          if (subscribedOnce) void loadAll(gen);
          subscribedOnce = true;
        });

      await loadAll(gen);
    },

    setMembers: (members) => {
      slots = slotsFor(members);
      publish();
    },

    refetch: async () => {
      if (ctx) await loadAll(generation);
    },

    stop: () => {
      generation++;
      if (channel) void supabase.removeChannel(channel);
      channel = null;
      ctx = null;
      habitRows = {};
      completionRows = {};
      slots = {};
      pendingToggles.clear();
      pendingHabitInserts.clear();
      set({ status: 'idle', habits: [], completions: {}, proofs: {} });
    },

    addHabit: (draft) => {
      if (!ctx) return '';
      const { householdId, userId } = ctx;
      const gen = generation;
      const shared = draft.owner === 'both';
      const row: HabitRow = {
        id: Crypto.randomUUID(),
        household_id: householdId,
        name: draft.name.trim().slice(0, MAX_HABIT_NAME),
        icon: draft.icon.slice(0, 16) || '⭐',
        time_of_day: TIMES.includes(draft.time as TimeOfDay) ? draft.time : 'All day',
        owner_id: shared ? null : userId,
        status: shared ? 'pending' : 'active',
        requested_by: shared ? userId : null,
        created_on: today(),
        created_at: new Date().toISOString(),
        require_proof: Boolean(draft.requireProof),
        days_of_week: normalizeDays(draft.days),
      };
      habitRows[row.id] = row;
      publish();

      const request = (async () => {
        const { created_at: _serverSet, ...insert } = row;
        const { error } = await supabase.from('habits').insert(insert);
        if (gen !== generation) return false;
        if (error) {
          delete habitRows[row.id];
          publish();
          fail('tasks.addHabit', error);
          return false;
        }
        return true;
      })();
      pendingHabitInserts.set(row.id, request);
      void request.finally(() => pendingHabitInserts.delete(row.id));
      return row.id;
    },

    updateHabit: (id, patch) => {
      const before = habitRows[id];
      if (!before) return;
      const gen = generation;
      const update: Partial<Pick<HabitRow, 'name' | 'icon' | 'time_of_day' | 'require_proof' | 'days_of_week'>> = {};
      if (patch.name != null) update.name = patch.name.trim().slice(0, MAX_HABIT_NAME);
      if (patch.icon != null) update.icon = patch.icon.slice(0, 16);
      if (patch.time != null && TIMES.includes(patch.time as TimeOfDay)) update.time_of_day = patch.time;
      if (patch.requireProof != null) update.require_proof = patch.requireProof;
      if (patch.days != null) update.days_of_week = normalizeDays(patch.days);
      habitRows[id] = { ...before, ...update };
      publish();

      void (async () => {
        await pendingHabitInserts.get(id);
        const { data, error } = await supabase.from('habits').update(update).eq('id', id).select('id');
        if (gen !== generation) return;
        if (error || !data?.length) {
          if (habitRows[id]) habitRows[id] = before;
          publish();
          fail('tasks.updateHabit', error ?? { code: '42501' });
        }
      })();
    },

    removeHabit: (id) => {
      const before = habitRows[id];
      if (!before) return;
      const gen = generation;
      const removedCompletions = Object.values(completionRows).filter((c) => c.habit_id === id);
      delete habitRows[id];
      removedCompletions.forEach((c) => delete completionRows[c.id]);
      publish();

      void (async () => {
        await pendingHabitInserts.get(id);
        const { data, error } = await supabase.from('habits').delete().eq('id', id).select('id');
        if (gen !== generation) return;
        if (error || !data?.length) {
          habitRows[id] = before;
          removedCompletions.forEach((c) => { completionRows[c.id] = c; });
          publish();
          fail('tasks.removeHabit', error ?? { code: '42501' });
        }
      })();
    },

    acceptInvite: (id) => {
      const before = habitRows[id];
      if (!before || before.status !== 'pending') return;
      const gen = generation;
      const date = today();
      habitRows[id] = { ...before, status: 'active', created_on: date };
      publish();

      void (async () => {
        const { error } = await supabase.rpc('respond_to_invite', { p_habit_id: id, p_accept: true, p_today: date });
        if (gen !== generation) return;
        if (error) {
          habitRows[id] = before;
          publish();
          fail('tasks.acceptInvite', error);
        }
      })();
    },

    declineInvite: (id) => {
      const habit = habitRows[id];
      if (!habit) return;
      // Cancelling my own invite is a plain delete; declining theirs goes through the RPC.
      if (habit.requested_by === ctx?.userId) {
        get().removeHabit(id);
        return;
      }
      const gen = generation;
      delete habitRows[id];
      publish();

      void (async () => {
        const { error } = await supabase.rpc('respond_to_invite', { p_habit_id: id, p_accept: false, p_today: today() });
        if (gen !== generation) return;
        if (error) {
          habitRows[id] = habit;
          publish();
          fail('tasks.declineInvite', error);
        }
      })();
    },

    toggleCompletion: (habitId, date, person, proofPath) => {
      const current = get().completions[date]?.[habitId] ?? {};
      if (!ctx || slots[ctx.userId] !== person || !habitRows[habitId]) return current;
      const { userId } = ctx;
      const gen = generation;

      const existing = Object.values(completionRows).find((c) => c.habit_id === habitId && c.user_id === userId && c.date === date);
      if (existing) {
        delete completionRows[existing.id];
      } else {
        // A habit that requires proof can only be completed with its photo, and starts pending.
        if (habitRows[habitId].require_proof && !proofPath) return current;
        const id = Crypto.randomUUID();
        completionRows[id] = {
          id,
          habit_id: habitId,
          user_id: userId,
          date,
          proof_path: proofPath ?? null,
          proof_status: proofPath && habitRows[habitId].require_proof ? 'pending' : null,
        };
      }
      publish();

      // Serialize writes per (habit, date) and always sync to the latest local state,
      // so rapid double-taps collapse instead of racing each other.
      const key = `${habitId}|${date}`;
      const previous = pendingToggles.get(key) ?? Promise.resolve();
      const job = previous
        .then(() => syncToggle(habitId, date))
        .catch((error) => {
          if (gen !== generation) return;
          fail('tasks.toggleCompletion', error);
          void loadAll(gen); // resync to the server's truth
        })
        .finally(() => {
          if (pendingToggles.get(key) === job) pendingToggles.delete(key);
        });
      pendingToggles.set(key, job);

      return get().completions[date]?.[habitId] ?? {};
    },

    reviewProof: (completionId, approve) => {
      const before = completionRows[completionId];
      if (!ctx || !before || before.user_id === ctx.userId || before.proof_status !== 'pending') return;
      const gen = generation;
      if (approve) completionRows[completionId] = { ...before, proof_status: 'approved' };
      else delete completionRows[completionId];
      publish();

      void (async () => {
        const query = approve
          ? supabase.from('completions').update({ proof_status: 'approved' }).eq('id', completionId).select('id')
          : supabase.from('completions').delete().eq('id', completionId).select('id');
        const { data, error } = await query;
        if (gen !== generation) return;
        if (error || !data?.length) {
          completionRows[completionId] = before;
          publish();
          fail('tasks.reviewProof', error ?? { code: '42501' });
        }
      })();
    },
  };
});
