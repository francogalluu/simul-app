import { S } from './simulTheme';

/** The two people in the household. 'A' is Franco, 'S' is Mora. */
export type Person = 'A' | 'S';

/** Who a habit belongs to. 'both' = shared, needs both people to complete it. */
export type Owner = Person | 'both';

export const PEOPLE: Record<Person, { name: string; color: string; avatar: number }> = {
  A: { name: 'Franco', color: S.personA, avatar: require('@/assets/images/couple/franco.jpg') },
  S: { name: 'Mora', color: S.personB, avatar: require('@/assets/images/couple/mora.jpg') },
};

export const partnerOf = (p: Person): Person => (p === 'A' ? 'S' : 'A');

/** Does this habit involve this person at all? */
export const involves = (owner: Owner, p: Person): boolean => owner === 'both' || owner === p;
