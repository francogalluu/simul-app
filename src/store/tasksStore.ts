import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase, toAppError, logError } from '@/lib/supabase';
import { showSyncError } from '@/lib/errors';
import { addDays, today } from '@/lib/dates';
import type { Owner, Person } from '@/lib/people';
import { notifyInvite, notifyNudge, notifyProofApproved, notifyProofPending, notifyProofRejected } from '@/lib/inAppNotifications';
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

/** A stretch of days a habit is paused. `to` null = still paused. Inclusive. */
export interface Pause {
  from: string;
  to: string | null;
}

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
  /** "HH:MM" local time for a daily reminder, or null for none. */
  reminderTime: string | null;
  /** Paused stretches; days inside one don't count for or against a streak. */
  pauses: Pause[];
  /** Completing this habit means submitting a photo the other person signs off on. */
  requireProof: boolean;
}

/** completions[date][habitId] = which people completed it that day. */
export type Completions = Record<string, Record<string, Partial<Record<Person, boolean>>>>;
/** proofs[date][habitId][person] = public URL of the photo they attached. */
export type Proofs = Record<string, Record<string, Partial<Record<Person, string>>>>;
export type ProofStatus = 'pending' | 'approved';
/** proofStatuses[date][habitId][person] = where their proof-of-work photo stands. */
export type ProofStatuses = Record<string, Record<string, Partial<Record<Person, ProofStatus>>>>;

export interface HabitDraft {
  name: string;
  time: string;
  /** 'both' creates a pending invite for the partner. */
  owner: 'me' | 'both';
  icon: string;
  reminderTime?: string | null;
  requireProof?: boolean;
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
  reminder_time: string | null;
  pauses: unknown;
  require_proof: boolean;
}

interface CompletionRow {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  proof_path: string | null;
  proof_status: ProofStatus | null;
}

interface NudgeRow {
  id: string;
  household_id: string;
  habit_id: string;
  from_user: string;
  to_user: string;
  date: string;
}

interface TasksState {
  status: SyncStatus;
  habits: Habit[];
  completions: Completions;
  proofs: Proofs;
  proofStatuses: ProofStatuses;
  /** `${habitId}|${date}` → who sent a nudge about it (either direction). */
  nudges: Record<string, Person>;

  start: (householdId: string, userId: string, members: Member[]) => Promise<void>;
  setMembers: (members: Member[]) => void;
  refetch: () => Promise<void>;
  stop: () => void;

  addHabit: (draft: HabitDraft) => string;
  updateHabit: (id: string, patch: Partial<Pick<Habit, 'name' | 'time' | 'icon' | 'reminderTime' | 'requireProof'>>) => void;
  removeHabit: (id: string) => void;
  acceptInvite: (id: string) => void;
  declineInvite: (id: string) => void;
  /** Flip my completion of a habit on a date. No-op for a not-yet-done "requires proof" habit — use submitProof. */
  toggleCompletion: (habitId: string, date: string, person: Person) => Partial<Record<Person, boolean>>;

  /** Pause from today until resumed. History and streak are kept. */
  pauseHabit: (id: string) => void;
  resumeHabit: (id: string) => void;
  /** Take one day off without breaking the streak. */
  skipDay: (id: string, date: string) => void;
  /** Attach (or remove) a proof photo to my completion of a habit on a date. */
  setProof: (habitId: string, date: string, path: string | null) => void;
  /** Complete a "requires proof" habit by submitting the photo itself. */
  submitProof: (habitId: string, date: string, path: string) => Promise<boolean>;
  /** Approve or reject my partner's pending proof; a reject undoes their completion so they can redo it. */
  validateProof: (habitId: string, date: string, person: Person, decision: 'approve' | 'reject') => Promise<boolean>;
  /** Ping the partner about a shared habit they haven't done yet today. */
  sendNudge: (habitId: string, date: string) => Promise<boolean>;
}

export const MAX_HABIT_NAME = 80;
const TIMES: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'All day'];
const HABIT_COLUMNS = 'id, household_id, name, icon, time_of_day, owner_id, status, requested_by, created_on, created_at, reminder_time, pauses, require_proof';
const COMPLETION_COLUMNS = 'id, habit_id, user_id, date, proof_path, proof_status';
const PAGE = 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// ─── Module-level sync state (not part of React state) ───────────────────────

let ctx: { householdId: string; userId: string } | null = null;
let channel: RealtimeChannel | null = null;
let generation = 0; // bumps on start/stop so stale async work is ignored
let habitRows: Record<string, HabitRow> = {};
let completionRows: Record<string, CompletionRow> = {}; // by id
let nudgeRows: Record<string, NudgeRow> = {};
let slots: Record<string, Person> = {};
let names: Record<string, string> = {};
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

/** Normalises the jsonb `pauses` column; anything malformed is dropped rather than trusted. */
export function parsePauses(raw: unknown): Pause[] {
  if (!Array.isArray(raw)) return [];
  const out: Pause[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const { from, to } = p as { from?: unknown; to?: unknown };
    if (typeof from !== 'string' || !DATE_RE.test(from)) continue;
    if (to !== null && to !== undefined && (typeof to !== 'string' || !DATE_RE.test(to))) continue;
    out.push({ from, to: to ?? null });
  }
  return out.sort((a, b) => a.from.localeCompare(b.from));
}

/** Postgres `time` comes back as "HH:MM:SS"; the app only cares about "HH:MM". */
const toClock = (t: string | null) => (t ? t.slice(0, 5) : null);

export function proofPublicUrl(path: string): string {
  return supabase.storage.from('habit-proofs').getPublicUrl(path).data.publicUrl;
}

function derive(): Pick<TasksState, 'habits' | 'completions' | 'proofs' | 'proofStatuses' | 'nudges'> {
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
      reminderTime: toClock(row.reminder_time),
      pauses: parsePauses(row.pauses),
      requireProof: row.require_proof,
    });
  }
  const completions: Completions = {};
  const proofs: Proofs = {};
  const proofStatuses: ProofStatuses = {};
  for (const row of Object.values(completionRows)) {
    const person = slots[row.user_id];
    if (!person || !habitRows[row.habit_id]) continue;
    ((completions[row.date] ??= {})[row.habit_id] ??= {})[person] = true;
    if (row.proof_path) ((proofs[row.date] ??= {})[row.habit_id] ??= {})[person] = proofPublicUrl(row.proof_path);
    if (row.proof_status) ((proofStatuses[row.date] ??= {})[row.habit_id] ??= {})[person] = row.proof_status;
  }
  const nudges: Record<string, Person> = {};
  for (const n of Object.values(nudgeRows)) {
    const from = slots[n.from_user];
    if (from) nudges[`${n.habit_id}|${n.date}`] = from;
  }
  return { habits, completions, proofs, proofStatuses, nudges };
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
    const since = addDays(today(), -1);
    const fetchOnce = () =>
      Promise.all([
        fetchAll<HabitRow>((from, to) =>
          supabase.from('habits').select(HABIT_COLUMNS).eq('household_id', householdId).order('id').range(from, to),
        ),
        fetchAll<CompletionRow>((from, to) =>
          supabase.from('completions').select(COMPLETION_COLUMNS).eq('household_id', householdId).order('id').range(from, to),
        ),
        fetchAll<NudgeRow>((from, to) =>
          supabase.from('nudges').select('id, household_id, habit_id, from_user, to_user, date').eq('household_id', householdId).gte('date', since).order('id').range(from, to),
        ),
      ]);
    try {
      let habits: HabitRow[];
      let completions: CompletionRow[];
      let nudges: NudgeRow[];
      try {
        [habits, completions, nudges] = await fetchOnce();
      } catch (e) {
        if (gen !== generation) return;
        // The project's database connection can briefly recycle after a period
        // of no activity; the first request right after that can fail even
        // though the project is otherwise healthy. One quiet retry covers it.
        logError('tasks.load.retrying', e);
        await new Promise((resolve) => setTimeout(resolve, 900));
        if (gen !== generation) return;
        [habits, completions, nudges] = await fetchOnce();
      }
      if (gen !== generation) return;
      habitRows = Object.fromEntries(habits.map((h) => [h.id, h]));
      // For my toggles still in flight, the local (optimistic) state wins over what the server had.
      const userId = ctx?.userId;
      const isPendingMine = (c: CompletionRow) => c.user_id === userId && pendingToggles.has(`${c.habit_id}|${c.date}`);
      const keep = [...completions.filter((c) => !isPendingMine(c)), ...Object.values(completionRows).filter(isPendingMine)];
      completionRows = Object.fromEntries(keep.map((c) => [c.id, c]));
      nudgeRows = Object.fromEntries(nudges.map((n) => [n.id, n]));
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
      const isNew = !habitRows[row.id];
      habitRows[row.id] = row;
      // A shared-habit invite from the partner just landed: say so right away
      // instead of waiting for them to notice the Mailbox badge.
      if (isNew && payload.eventType === 'INSERT' && row.status === 'pending' && row.requested_by && row.requested_by !== ctx.userId) {
        notifyInvite(row.name, names[row.requested_by] ?? 'Your partner');
      }
    }
    publish();
  }

  function onCompletionChange(payload: RealtimePostgresChangesPayload<CompletionRow & { household_id: string }>) {
    if (payload.eventType === 'DELETE') {
      const id = (payload.old as Partial<CompletionRow>).id;
      const row = id ? completionRows[id] : undefined;
      if (!row || (row.user_id === ctx?.userId && pendingToggles.has(`${row.habit_id}|${row.date}`))) return;
      delete completionRows[row.id];
      // A pending proof of mine just vanished from under me: the only way
      // that happens without my own action is my partner rejecting it (the
      // "reject" policy only lets them delete a *pending* row — see the
      // migration). The habit still existing rules out "I deleted the whole
      // habit" as the cause.
      if (ctx && row.user_id === ctx.userId && row.proof_status === 'pending' && habitRows[row.habit_id]) {
        const habit = habitRows[row.habit_id];
        const otherId = Object.keys(slots).find((u) => u !== ctx!.userId);
        notifyProofRejected(habit.name, (otherId && names[otherId]) ?? 'Your partner', habit.icon);
      }
    } else if (payload.eventType === 'INSERT') {
      const row = payload.new;
      if (!ctx || row.household_id !== ctx.householdId) return;
      if (row.user_id === ctx.userId && pendingToggles.has(`${row.habit_id}|${row.date}`)) return;
      // Drop any other local row for the same (habit, user, date) before adding.
      for (const [cid, c] of Object.entries(completionRows)) {
        if (completionKey(c.habit_id, c.user_id, c.date) === completionKey(row.habit_id, row.user_id, row.date)) delete completionRows[cid];
      }
      completionRows[row.id] = { id: row.id, habit_id: row.habit_id, user_id: row.user_id, date: row.date, proof_path: row.proof_path ?? null, proof_status: row.proof_status ?? null };
      // Partner just submitted proof on something of theirs — or on a shared
      // habit — that needs my sign-off.
      if (row.proof_status === 'pending' && row.user_id !== ctx.userId) {
        const habit = habitRows[row.habit_id];
        notifyProofPending(habit?.name ?? 'a habit', names[row.user_id] ?? 'Your partner', habit?.icon);
      }
    } else if (payload.eventType === 'UPDATE') {
      const row = payload.new;
      const local = completionRows[row.id];
      if (!local) return;
      const wasPending = local.proof_status === 'pending';
      completionRows[row.id] = { ...local, proof_path: row.proof_path ?? null, proof_status: row.proof_status ?? null };
      // My own submitted proof just got approved.
      if (ctx && wasPending && row.proof_status === 'approved' && row.user_id === ctx.userId) {
        const habit = habitRows[row.habit_id];
        const otherId = Object.keys(slots).find((u) => u !== ctx!.userId);
        notifyProofApproved(habit?.name ?? 'a habit', (otherId && names[otherId]) ?? 'Your partner', habit?.icon);
      }
    } else {
      return;
    }
    publish();
  }

  function onNudgeChange(payload: RealtimePostgresChangesPayload<NudgeRow>) {
    if (payload.eventType !== 'INSERT') return;
    const row = payload.new;
    if (!ctx || row.household_id !== ctx.householdId || nudgeRows[row.id]) return;
    nudgeRows[row.id] = row;
    if (row.to_user === ctx.userId) {
      const habit = habitRows[row.habit_id];
      notifyNudge(habit?.name ?? 'a habit', names[row.from_user] ?? 'Your partner', habit?.icon);
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
      .from('completions').select('id').eq('habit_id', habitId).eq('user_id', userId).eq('date', date).maybeSingle();
    if (gen !== generation) return;
    if (readError) throw readError;

    if (local && !server) {
      const { error } = await supabase.from('completions').insert({ id: local.id, household_id: householdId, habit_id: habitId, user_id: userId, date });
      if (error && error.code !== '23505') throw error; // 23505: already there (another device)
    } else if (!local && server) {
      const { error } = await supabase.from('completions').delete().eq('id', server.id);
      if (error) throw error;
    } else if (local && server && local.id !== server.id) {
      delete completionRows[local.id];
      completionRows[server.id] = { ...local, id: server.id };
    }
  }

  /** Optimistic update of the `pauses` column with rollback. */
  function writePauses(id: string, next: Pause[], context: string) {
    const before = habitRows[id];
    if (!before) return;
    const gen = generation;
    habitRows[id] = { ...before, pauses: next };
    publish();
    void (async () => {
      await pendingHabitInserts.get(id);
      const { data, error } = await supabase.from('habits').update({ pauses: next }).eq('id', id).select('id');
      if (gen !== generation) return;
      if (error || !data?.length) {
        if (habitRows[id]) habitRows[id] = before;
        publish();
        fail(context, error ?? { code: '42501' });
      }
    })();
  }

  return {
    status: 'idle',
    habits: [],
    completions: {},
    proofs: {},
    proofStatuses: {},
    nudges: {},

    start: async (householdId, userId, members) => {
      if (ctx?.householdId === householdId && ctx.userId === userId && channel) {
        get().setMembers(members);
        return;
      }
      get().stop();
      const gen = ++generation;
      ctx = { householdId, userId };
      slots = slotsFor(members);
      names = Object.fromEntries(members.map((m) => [m.userId, m.displayName]));
      set({ status: 'loading' });

      let subscribedOnce = false;
      const filter = `household_id=eq.${householdId}`;
      // Realtime can't filter DELETE events (and doesn't apply RLS to them): they arrive
      // for every household but carry only the random primary key. Unknown ids are ignored.
      channel = supabase
        .channel(`household:${householdId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habits', filter }, onHabitChange)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'habits', filter }, onHabitChange)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'habits' }, onHabitChange)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completions', filter }, onCompletionChange)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'completions', filter }, onCompletionChange)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'completions' }, onCompletionChange)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nudges', filter }, onNudgeChange)
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
      names = Object.fromEntries(members.map((m) => [m.userId, m.displayName]));
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
      nudgeRows = {};
      slots = {};
      names = {};
      pendingToggles.clear();
      pendingHabitInserts.clear();
      set({ status: 'idle', habits: [], completions: {}, proofs: {}, proofStatuses: {}, nudges: {} });
    },

    addHabit: (draft) => {
      if (!ctx) return '';
      const { householdId, userId } = ctx;
      const gen = generation;
      const shared = draft.owner === 'both';
      const reminder = draft.reminderTime && TIME_RE.test(draft.reminderTime) ? draft.reminderTime : null;
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
        reminder_time: reminder,
        pauses: [],
        require_proof: Boolean(draft.requireProof),
      };
      habitRows[row.id] = row;
      publish();

      const request = (async () => {
        const { created_at: _serverSet, pauses: _default, ...insert } = row;
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
      const update: Partial<Pick<HabitRow, 'name' | 'icon' | 'time_of_day' | 'reminder_time' | 'require_proof'>> = {};
      if (patch.name != null) update.name = patch.name.trim().slice(0, MAX_HABIT_NAME);
      if (patch.icon != null) update.icon = patch.icon.slice(0, 16);
      if (patch.time != null && TIMES.includes(patch.time as TimeOfDay)) update.time_of_day = patch.time;
      if (patch.reminderTime !== undefined) update.reminder_time = patch.reminderTime && TIME_RE.test(patch.reminderTime) ? patch.reminderTime : null;
      if (patch.requireProof !== undefined) update.require_proof = patch.requireProof;
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

    toggleCompletion: (habitId, date, person) => {
      const current = get().completions[date]?.[habitId] ?? {};
      const habitRow = habitRows[habitId];
      if (!ctx || slots[ctx.userId] !== person || !habitRow) return current;
      const { userId } = ctx;
      const gen = generation;

      const existing = Object.values(completionRows).find((c) => c.habit_id === habitId && c.user_id === userId && c.date === date);
      // A "requires proof" habit can only be completed by submitting the
      // photo (see submitProof) — a plain tap can still un-complete one,
      // though, same as any other habit.
      if (!existing && habitRow.require_proof) return current;
      if (existing) {
        delete completionRows[existing.id];
      } else {
        const id = Crypto.randomUUID();
        completionRows[id] = { id, habit_id: habitId, user_id: userId, date, proof_path: null, proof_status: null };
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

    pauseHabit: (id) => {
      const habit = habitRows[id];
      if (!habit) return;
      const pauses = parsePauses(habit.pauses);
      if (pauses.some((p) => p.to === null)) return; // already paused
      writePauses(id, [...pauses, { from: today(), to: null }], 'tasks.pauseHabit');
    },

    resumeHabit: (id) => {
      const habit = habitRows[id];
      if (!habit) return;
      const t = today();
      const pauses = parsePauses(habit.pauses)
        // Paused and resumed on the same day: as if it never happened.
        .filter((p) => !(p.to === null && p.from === t))
        .map((p) => (p.to === null ? { ...p, to: addDays(t, -1) } : p));
      writePauses(id, pauses, 'tasks.resumeHabit');
    },

    skipDay: (id, date) => {
      const habit = habitRows[id];
      if (!habit) return;
      const pauses = parsePauses(habit.pauses);
      if (pauses.some((p) => p.from <= date && (p.to === null || date <= p.to))) return;
      writePauses(id, [...pauses, { from: date, to: date }], 'tasks.skipDay');
    },

    setProof: (habitId, date, path) => {
      if (!ctx) return;
      const { userId } = ctx;
      const gen = generation;
      const local = Object.values(completionRows).find((c) => c.habit_id === habitId && c.user_id === userId && c.date === date);
      if (!local) return;
      const before = local;
      completionRows[local.id] = { ...local, proof_path: path };
      publish();

      void (async () => {
        // The completion itself may still be on its way to the server.
        await pendingToggles.get(`${habitId}|${date}`);
        const current = completionRows[local.id] ?? Object.values(completionRows).find((c) => c.habit_id === habitId && c.user_id === userId && c.date === date);
        if (!current) return;
        const { data, error } = await supabase.from('completions').update({ proof_path: path }).eq('id', current.id).select('id');
        if (gen !== generation) return;
        if (error || !data?.length) {
          if (completionRows[current.id]) completionRows[current.id] = { ...current, proof_path: before.proof_path };
          publish();
          fail('tasks.setProof', error ?? { code: '42501' });
        }
      })();
    },

    submitProof: async (habitId, date, path) => {
      if (!ctx) return false;
      const { userId, householdId } = ctx;
      if (!habitRows[habitId]) return false;
      const gen = generation;
      const existing = Object.values(completionRows).find((c) => c.habit_id === habitId && c.user_id === userId && c.date === date);
      const id = existing?.id ?? Crypto.randomUUID();
      const before = existing ? { ...existing } : null;
      completionRows[id] = { id, habit_id: habitId, user_id: userId, date, proof_path: path, proof_status: 'pending' };
      publish();

      await pendingHabitInserts.get(habitId);
      const { error } = existing
        ? await supabase.from('completions').update({ proof_path: path, proof_status: 'pending' }).eq('id', id)
        : await supabase.from('completions').insert({ id, household_id: householdId, habit_id: habitId, user_id: userId, date, proof_path: path, proof_status: 'pending' });
      if (gen !== generation) return false;
      if (error && error.code !== '23505') {
        if (before) completionRows[id] = before;
        else delete completionRows[id];
        publish();
        fail('tasks.submitProof', error);
        return false;
      }
      return true;
    },

    validateProof: async (habitId, date, person, decision) => {
      if (!ctx) return false;
      const targetUserId = Object.entries(slots).find(([, p]) => p === person)?.[0];
      if (!targetUserId || targetUserId === ctx.userId) return false; // only your partner's proof, never your own
      const target = Object.values(completionRows).find((c) => c.habit_id === habitId && c.user_id === targetUserId && c.date === date);
      if (!target || target.proof_status !== 'pending') return false;
      const gen = generation;
      const before = { ...target };

      if (decision === 'approve') {
        completionRows[target.id] = { ...target, proof_status: 'approved' };
        publish();
        const { error } = await supabase.from('completions').update({ proof_status: 'approved' }).eq('id', target.id);
        if (gen !== generation) return false;
        if (error) {
          completionRows[target.id] = before;
          publish();
          fail('tasks.validateProof', error);
          return false;
        }
        return true;
      }

      // Reject: their completion goes away entirely so they can redo it.
      delete completionRows[target.id];
      publish();
      const { error } = await supabase.from('completions').delete().eq('id', target.id);
      if (gen !== generation) return false;
      if (error) {
        completionRows[target.id] = before;
        publish();
        fail('tasks.validateProof', error);
        return false;
      }
      return true;
    },

    sendNudge: async (habitId, date) => {
      if (!ctx) return false;
      const { householdId, userId } = ctx;
      const toUser = Object.keys(slots).find((u) => u !== userId);
      if (!toUser) return false;
      const key = `${habitId}|${date}`;
      if (get().nudges[key] === slots[userId]) return true; // already sent today
      const gen = generation;
      const row: NudgeRow = { id: Crypto.randomUUID(), household_id: householdId, habit_id: habitId, from_user: userId, to_user: toUser, date };
      nudgeRows[row.id] = row;
      publish();
      const { error } = await supabase.from('nudges').insert(row);
      if (gen !== generation) return false;
      if (error && error.code !== '23505') {
        delete nudgeRows[row.id];
        publish();
        fail('tasks.sendNudge', error);
        return false;
      }
      return true;
    },
  };
});
