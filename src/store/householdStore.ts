import { create } from 'zustand';
import { supabase, toAppError, logError, type AppErrorCode } from '@/lib/supabase';

export interface Member {
  /** Row id (random; used to match Realtime DELETE events). */
  id: string;
  userId: string;
  displayName: string;
  color: string;
  avatarPath: string | null;
  joinedAt: string;
}

export interface Household {
  id: string;
  inviteCode: string | null;
  /** The couple's own start date (YYYY-MM-DD), for milestone moments. */
  anniversary: string | null;
  /** Name for the two of them ("Franco & Mora"); null falls back to auto-joining both names. */
  duoName: string | null;
}

/** 'none' = signed in but not part of a household yet (show onboarding). */
export type HouseholdStatus = 'idle' | 'loading' | 'ready' | 'none' | 'error';

type Result<T = void> = { data?: T; error?: AppErrorCode };

interface Profile {
  displayName?: string;
  color?: string;
  avatarPath?: string | null;
}

interface HouseholdState {
  status: HouseholdStatus;
  userId: string | null;
  household: Household | null;
  /** Ordered by join time: [0] is the person who created the household. */
  members: Member[];

  load: (userId: string) => Promise<void>;
  refreshMembers: () => Promise<void>;
  createHousehold: (displayName: string, profile?: Profile, duoName?: string) => Promise<Result>;
  joinHousehold: (code: string, displayName: string, profile?: Profile) => Promise<Result>;
  regenerateInviteCode: () => Promise<Result>;
  rename: (displayName: string) => Promise<Result>;
  updateProfile: (profile: Profile) => Promise<Result>;
  setAnniversary: (date: string | null) => Promise<Result>;
  setDuoName: (name: string | null) => Promise<Result>;
  leaveHousehold: () => Promise<Result>;
  deleteAccount: () => Promise<Result>;
  reset: () => void;
}

export const MAX_NAME_LENGTH = 40;
export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);

export const MAX_DUO_NAME_LENGTH = 60;
/** Trims/collapses whitespace like cleanName, but empty means "clear it" (null), not "invalid". */
export const cleanDuoName = (name: string): string | null => {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, MAX_DUO_NAME_LENGTH);
  return clean || null;
};

type MemberRow = { id: string; user_id: string; display_name: string; color: string; avatar_path: string | null; joined_at: string };
const toMember = (r: MemberRow): Member => ({
  id: r.id,
  userId: r.user_id,
  displayName: r.display_name,
  color: r.color,
  avatarPath: r.avatar_path,
  joinedAt: r.joined_at,
});
const byJoinOrder = (a: Member, b: Member) =>
  a.joinedAt === b.joinedAt ? a.userId.localeCompare(b.userId) : a.joinedAt.localeCompare(b.joinedAt);

const initial = { status: 'idle' as HouseholdStatus, userId: null, household: null, members: [] as Member[] };

export const useHouseholdStore = create<HouseholdState>()((set, get) => ({
  ...initial,

  load: async (userId) => {
    // A re-check that already has a settled answer (has a household, or
    // confidently has none) keeps its current status instead of flashing
    // 'loading'. That flash would otherwise swap RootNavigator's rendered
    // screen to a splash and back, unmounting whatever's on screen — most
    // visibly, wiping out Onboarding's in-progress avatar/name/color state
    // whenever this re-fires from the app-foreground listener (e.g. right
    // after the photo library picker hands back to the app).
    const settled = get().userId === userId && (get().household != null || get().status === 'none');
    set({ status: settled ? get().status : 'loading', userId });

    // RLS only returns the caller's own household and roster.
    const fetchOnce = () =>
      Promise.all([
        supabase.from('households').select('id, invite_code, anniversary, duo_name').maybeSingle(),
        supabase.from('household_members').select('id, user_id, display_name, color, avatar_path, joined_at'),
      ]);

    let [householdRes, membersRes] = await fetchOnce();
    if (get().userId !== userId) return; // signed out / switched user meanwhile

    // The project's database connection can briefly recycle after a period of
    // no activity (visible in Supabase's logs as a reconnect + schema-cache
    // reload); the very first request to land right after that can fail even
    // though the project is otherwise healthy. One quiet retry covers it
    // instead of surfacing an error the user has to tap through themselves.
    if (householdRes.error || membersRes.error) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      if (get().userId !== userId) return;
      [householdRes, membersRes] = await fetchOnce();
      if (get().userId !== userId) return;
    }

    if (householdRes.error || membersRes.error) {
      logError('household.load', householdRes.error ?? membersRes.error);
      set({ status: get().household ? 'ready' : 'error' });
      return;
    }
    if (!householdRes.data) {
      set({ status: 'none', household: null, members: [] });
      return;
    }
    set({
      status: 'ready',
      household: {
        id: householdRes.data.id,
        inviteCode: householdRes.data.invite_code,
        anniversary: householdRes.data.anniversary ?? null,
        duoName: householdRes.data.duo_name ?? null,
      },
      members: (membersRes.data as MemberRow[]).map(toMember).sort(byJoinOrder),
    });
  },

  refreshMembers: async () => {
    const { userId } = get();
    if (userId) await get().load(userId);
  },

  createHousehold: async (displayName, profile, duoName) => {
    const { error } = await supabase.rpc('create_household', { p_display_name: cleanName(displayName) });
    if (error) {
      logError('household.create', error);
      return { error: toAppError(error) };
    }
    await get().refreshMembers();
    // create_household doesn't take color/avatar/duo name, so a household
    // always exists (with the column defaults) a moment before these
    // follow-up writes land.
    if (profile) await get().updateProfile(profile);
    if (duoName != null) await get().setDuoName(cleanDuoName(duoName));
    return {};
  },

  joinHousehold: async (code, displayName, profile) => {
    const { data, error } = await supabase.rpc('join_household', {
      p_code: code.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8),
      p_display_name: cleanName(displayName),
    });
    if (error) {
      logError('household.join', error);
      return { error: toAppError(error) };
    }
    if (!data) return { error: 'invalid_code' };
    await get().refreshMembers();
    if (profile) await get().updateProfile(profile);
    return {};
  },

  regenerateInviteCode: async () => {
    const { data, error } = await supabase.rpc('regenerate_invite_code');
    if (error) {
      logError('household.regenerateCode', error);
      return { error: toAppError(error) };
    }
    const household = get().household;
    if (household) set({ household: { ...household, inviteCode: data as string } });
    return {};
  },

  rename: async (displayName) => {
    const name = cleanName(displayName);
    if (!name) return { error: 'unknown' };
    return get().updateProfile({ displayName: name });
  },

  updateProfile: async (profile) => {
    const { userId, members } = get();
    if (!userId) return { error: 'unknown' };
    const columns: Record<string, unknown> = {};
    if (profile.displayName !== undefined) columns.display_name = profile.displayName;
    if (profile.color !== undefined) columns.color = profile.color;
    if (profile.avatarPath !== undefined) columns.avatar_path = profile.avatarPath;
    if (Object.keys(columns).length === 0) return {};

    const previous = members;
    set({ members: members.map((m) => (m.userId === userId ? { ...m, ...profile } : m)) });
    const { error } = await supabase.from('household_members').update(columns).eq('user_id', userId);
    if (error) {
      logError('household.updateProfile', error);
      set({ members: previous });
      return { error: toAppError(error) };
    }
    return {};
  },

  setAnniversary: async (date) => {
    const household = get().household;
    if (!household) return { error: 'unknown' };
    const previous = household;
    set({ household: { ...household, anniversary: date } });
    const { error } = await supabase.from('households').update({ anniversary: date }).eq('id', household.id);
    if (error) {
      logError('household.setAnniversary', error);
      set({ household: previous });
      return { error: toAppError(error) };
    }
    return {};
  },

  setDuoName: async (name) => {
    const household = get().household;
    if (!household) return { error: 'unknown' };
    const previous = household;
    set({ household: { ...household, duoName: name } });
    const { error } = await supabase.from('households').update({ duo_name: name }).eq('id', household.id);
    if (error) {
      logError('household.setDuoName', error);
      set({ household: previous });
      return { error: toAppError(error) };
    }
    return {};
  },

  leaveHousehold: async () => {
    const { error } = await supabase.rpc('leave_household');
    if (error) {
      logError('household.leave', error);
      return { error: toAppError(error) };
    }
    set({ status: 'none', household: null, members: [] });
    return {};
  },

  deleteAccount: async () => {
    const { error } = await supabase.rpc('delete_account');
    if (error) {
      logError('household.deleteAccount', error);
      return { error: toAppError(error) };
    }
    // The user no longer exists server-side; drop the local session too.
    await supabase.auth.signOut({ scope: 'local' });
    return {};
  },

  reset: () => set(initial),
}));
