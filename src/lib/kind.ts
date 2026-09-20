import { useTranslation } from 'react-i18next';
import { useHouseholdStore, type HouseholdKind } from '@/store/householdStore';

/** Whether this household is two partners or two friends (partners until it loads). */
export function useHouseholdKind(): HouseholdKind {
  return useHouseholdStore((s) => s.household?.kind ?? 'couple');
}

/** i18next context for a kind: keys have a `_friend` variant that is used for friends. */
export const kindContext = (kind: HouseholdKind) => (kind === 'friend' ? 'friend' : undefined);

/**
 * `useTranslation` whose `t` picks the friend wording (`key_friend`) when the household is made of
 * friends, and falls back to the plain key otherwise. Pass `kind` to override (onboarding, before
 * a household exists).
 */
export function useKindTranslation(kindOverride?: HouseholdKind) {
  const base = useTranslation();
  const own = useHouseholdKind();
  const kind = kindOverride ?? own;
  const context = kindContext(kind);
  const t = ((key: string, options?: Record<string, unknown>) =>
    base.t(key, { context, ...options })) as typeof base.t;
  return { ...base, t, kind };
}
