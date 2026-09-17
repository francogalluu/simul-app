import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';
import { useTasksStore } from '@/store/tasksStore';
import { useGoalsStore } from '@/store/goalsStore';

/**
 * Keeps data in step with the auth session:
 *   session → household + roster → habits/completions (+ Realtime)
 * and wipes everything from memory the moment the session ends, so nothing
 * from one account is ever visible to the next person who signs in.
 */
export function useSessionSync() {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const householdStatus = useHouseholdStore((s) => s.status);
  const householdId = useHouseholdStore((s) => s.household?.id ?? null);
  const members = useHouseholdStore((s) => s.members);

  // Session changes: load the household, or clear everything.
  const previousUserId = useRef<string | null>(null);
  useEffect(() => {
    if (userId) {
      void useHouseholdStore.getState().load(userId);
    } else {
      useTasksStore.getState().stop();
      useHouseholdStore.getState().reset();
      // Goals are still device-local; don't carry them over to another account.
      if (previousUserId.current) useGoalsStore.getState().clearAll();
    }
    previousUserId.current = userId;
  }, [userId]);

  // Household ready → start syncing habits; left/removed → stop.
  useEffect(() => {
    if (userId && householdId && householdStatus === 'ready') {
      void useTasksStore.getState().start(householdId, userId, members);
    } else if (householdStatus === 'none') {
      useTasksStore.getState().stop();
    }
  }, [userId, householdId, householdStatus, members]);

  // Partner joins, leaves or renames → refresh the roster.
  useEffect(() => {
    if (!householdId) return;
    const refresh = () => void useHouseholdStore.getState().refreshMembers();
    const filter = `household_id=eq.${householdId}`;
    const channel = supabase
      .channel(`members:${householdId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'household_members', filter }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'household_members', filter }, refresh)
      // DELETE events can't be filtered; only react to rows that are in our roster.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'household_members' }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id && useHouseholdStore.getState().members.some((m) => m.id === id)) refresh();
      })
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [householdId]);

  // Coming back to the foreground: catch up on anything missed while suspended.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !useAuthStore.getState().session) return;
      void useHouseholdStore.getState().refreshMembers();
      void useTasksStore.getState().refetch();
    });
    return () => sub.remove();
  }, []);
}
