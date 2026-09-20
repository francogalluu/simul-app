import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { S } from './simulTheme';
import { avatarPublicUrl } from './avatarUpload';
import { useHouseholdStore } from '@/store/householdStore';
import { useHouseholdKind, kindContext } from './kind';

/**
 * The two people in the household, as slots. 'A' is whoever created the
 * household, 'S' is the partner who joined with the invite code. Which one
 * is *me* depends on who's signed in (see `useMe`).
 */
export type Person = 'A' | 'S';

/** Who a habit belongs to. 'both' = shared, needs both people to complete it. */
export type Owner = Person | 'both';

export interface PersonInfo {
  name: string;
  initial: string;
  /** Chosen at onboarding (or Settings); falls back to the app default until then. */
  color: string;
  avatarUrl: string | null;
  /** False for slot 'S' until the partner has joined. */
  joined: boolean;
}

export type People = Record<Person, PersonInfo>;

const FALLBACK_COLOR: Record<Person, string> = { A: S.personA, S: S.personB };
const info = (
  p: Person,
  member: { displayName: string; color: string; avatarPath: string | null } | undefined,
  placeholder: string,
): PersonInfo => {
  const clean = member?.displayName?.trim() || placeholder;
  return {
    name: clean,
    initial: Array.from(clean)[0]?.toUpperCase() ?? '?',
    color: member?.color ?? FALLBACK_COLOR[p],
    avatarUrl: member?.avatarPath ? avatarPublicUrl(member.avatarPath) : null,
    joined: Boolean(member),
  };
};

export const partnerOf = (p: Person): Person => (p === 'A' ? 'S' : 'A');

/** Does this habit involve this person at all? */
export const involves = (owner: Owner, p: Person): boolean => owner === 'both' || owner === p;

/** Display info for both slots, from the live household roster. */
export function usePeople(): People {
  const { t } = useTranslation();
  const members = useHouseholdStore((s) => s.members);
  // Until the partner joins their slot shows a translated "Partner" placeholder.
  const kind = useHouseholdKind();
  const placeholder = t('settings.partner', { context: kindContext(kind) });
  return useMemo(() => ({ A: info('A', members[0], placeholder), S: info('S', members[1], placeholder) }), [members, placeholder]);
}

/** The signed-in user's slot. */
export function useMe(): Person {
  const userId = useHouseholdStore((s) => s.userId);
  const members = useHouseholdStore((s) => s.members);
  return members[1]?.userId === userId ? 'S' : 'A';
}
