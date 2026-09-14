import type { Habit } from '@/types/habit';

type UnitFields = Pick<Habit, 'unit' | 'unitKey'>;

/** First letter uppercase for short labels (e.g. vasos → Vasos). */
export function capitalizeLabel(text: string | undefined): string {
  const s = (text ?? '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Resolved unit text for display (respects optional i18n key from preset habits). */
export function getHabitUnitLabel(habit: UnitFields, t: (key: string) => string): string {
  const key = habit.unitKey?.trim();
  if (key) return t(key);
  return (habit.unit ?? '').trim();
}

/** Wizard / measure-by: time mode uses the minute preset unit or a typed "min". */
export function isMinuteUnit(unit: string, unitKey: string | null): boolean {
  if (unitKey === 'units.min') return true;
  return unit.trim().toLowerCase() === 'min';
}
