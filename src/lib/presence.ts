import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useHouseholdStore } from '@/store/householdStore';

/**
 * "Mora is here right now": Supabase Realtime Presence on a household-scoped
 * channel. Each device tracks itself while the app is in the foreground and
 * untracks when it goes to the background, so presence means "has the app
 * open", not merely "signed in". Kept apart from the postgres_changes
 * subscriptions in tasksStore — a different channel, a different lifecycle.
 */

interface PresenceMeta {
  userId: string;
  since: string;
}

export function usePartnerPresence(): { partnerHere: boolean } {
  const householdId = useHouseholdStore((s) => s.household?.id ?? null);
  const userId = useHouseholdStore((s) => s.userId);
  const [partnerHere, setPartnerHere] = useState(false);

  useEffect(() => {
    if (!householdId || !userId) {
      setPartnerHere(false);
      return;
    }
    let channel: RealtimeChannel | null = supabase.channel(`presence:${householdId}`, {
      config: { presence: { key: userId } },
    });
    let subscribed = false;

    const recompute = () => {
      if (!channel) return;
      const state = channel.presenceState<PresenceMeta>();
      const here = Object.entries(state).some(([key, metas]) => key !== userId && metas.length > 0);
      setPartnerHere(here);
    };

    const track = () => {
      if (channel && subscribed) void channel.track({ userId, since: new Date().toISOString() } satisfies PresenceMeta);
    };
    const untrack = () => {
      if (channel && subscribed) void channel.untrack();
    };

    channel
      .on('presence', { event: 'sync' }, recompute)
      .on('presence', { event: 'join' }, recompute)
      .on('presence', { event: 'leave' }, recompute)
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        subscribed = true;
        if (AppState.currentState === 'active') track();
      });

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') track();
      else untrack();
    });

    return () => {
      sub.remove();
      const c = channel;
      channel = null;
      if (c) void supabase.removeChannel(c);
      setPartnerHere(false);
    };
  }, [householdId, userId]);

  return { partnerHere };
}
