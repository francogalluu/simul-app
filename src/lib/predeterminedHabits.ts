import type { OnboardingCategory } from '@/navigation/types';

/**
 * Predetermined habits shown in "Add a new habit" picker.
 * Tapping one pre-fills the create-habit wizard.
 * nameKey and category titleKey are i18n keys so names/titles show in the user's language.
 */
export interface PredeterminedHabit {
  id: string;
  /** i18n key for display name, e.g. 'predetermined.drink-water' */
  nameKey: string;
  icon: string;
  goalType: 'build' | 'break';
  kind: 'boolean' | 'numeric';
  frequency: 'daily' | 'weekly' | 'monthly';
  target: number;
  /** i18n key for numeric unit, e.g. 'units.glasses' */
  unitKey?: string;
}

export interface PredeterminedCategory {
  /** i18n key for category title, e.g. 'predetermined.cat.healthFitness' */
  titleKey: string;
  habits: PredeterminedHabit[];
}

const ONBOARDING_CATEGORY_TO_CATS: Record<OnboardingCategory, string[]> = {
  'health-fitness': ['predetermined.cat.healthFitness'],
  'mind-mood': ['predetermined.cat.mindMood'],
  'career-study': ['predetermined.cat.careerStudy'],
  'home-organization': ['predetermined.cat.homeOrganization'],
  finances: ['predetermined.cat.finances'],
  relationships: ['predetermined.cat.relationships'],
  'creativity-hobbies': ['predetermined.cat.creativityHobbies'],
};

export const PREDETERMINED_CATEGORIES: PredeterminedCategory[] = [
  {
    titleKey: 'predetermined.cat.healthFitness',
    habits: [
      { id: 'drink-water', nameKey: 'predetermined.drink-water', icon: '💧', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 8, unitKey: 'units.glasses' },
      { id: 'eat-vegetables', nameKey: 'predetermined.eat-vegetables', icon: '🥕', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 2, unitKey: 'units.servings' },
      { id: 'brush-teeth', nameKey: 'predetermined.brush-teeth', icon: '🦷', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'take-vitamins', nameKey: 'predetermined.take-vitamins', icon: '💊', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'floss', nameKey: 'predetermined.floss', icon: '🧵', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'stretch', nameKey: 'predetermined.stretch', icon: '🤸', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 5, unitKey: 'units.min' },
      { id: 'sleep-early', nameKey: 'predetermined.sleep-early', icon: '😴', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'green-vegetable', nameKey: 'predetermined.green-vegetable', icon: '🥬', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'eat-fruit', nameKey: 'predetermined.eat-fruit', icon: '🍎', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 2, unitKey: 'units.servings' },
      { id: 'protein-meal', nameKey: 'predetermined.protein-meal', icon: '🥩', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 1, unitKey: 'units.meal' },
      { id: 'healthy-breakfast', nameKey: 'predetermined.healthy-breakfast', icon: '🥣', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'skin-care', nameKey: 'predetermined.skin-care', icon: '🧴', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'sun-protection', nameKey: 'predetermined.sun-protection', icon: '☀️', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'morning-run', nameKey: 'predetermined.morning-run', icon: '🏃', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
      { id: 'take-walk', nameKey: 'predetermined.take-walk', icon: '🚶', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 20, unitKey: 'units.min' },
      { id: 'yoga', nameKey: 'predetermined.yoga', icon: '🧘‍♀️', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 15, unitKey: 'units.min' },
      { id: 'gym', nameKey: 'predetermined.gym', icon: '🏋️', goalType: 'build', kind: 'numeric', frequency: 'weekly', target: 3, unitKey: 'units.times' },
      { id: 'steps', nameKey: 'predetermined.steps', icon: '👟', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 10000, unitKey: 'units.steps' },
      { id: 'stairs', nameKey: 'predetermined.stairs', icon: '🪜', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'stretch-daily', nameKey: 'predetermined.stretch-daily', icon: '🙆', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 5, unitKey: 'units.min' },
      { id: 'plank', nameKey: 'predetermined.plank', icon: '💪', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 1, unitKey: 'units.min' },
      { id: 'pushups', nameKey: 'predetermined.pushups', icon: '🦾', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 20, unitKey: 'units.reps' },
      { id: 'cycling', nameKey: 'predetermined.cycling', icon: '🚴', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
      { id: 'swimming', nameKey: 'predetermined.swimming', icon: '🏊', goalType: 'build', kind: 'numeric', frequency: 'weekly', target: 2, unitKey: 'units.times' },
      { id: 'dance', nameKey: 'predetermined.dance', icon: '💃', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 15, unitKey: 'units.min' },
      { id: 'squats', nameKey: 'predetermined.squats', icon: '🦵', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 20, unitKey: 'units.reps' },
      { id: 'jump-rope', nameKey: 'predetermined.jump-rope', icon: '⛳', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 5, unitKey: 'units.min' },
      { id: 'reduce-alcohol', nameKey: 'predetermined.reduce-alcohol', icon: '🍺', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 1, unitKey: 'units.drinks' },
      { id: 'eat-fewer-sweets', nameKey: 'predetermined.eat-fewer-sweets', icon: '🍰', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 1, unitKey: 'units.servings' },
      { id: 'no-soda', nameKey: 'predetermined.no-soda', icon: '🥤', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'limit-caffeine', nameKey: 'predetermined.limit-caffeine', icon: '☕', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 2, unitKey: 'units.cups' },
      { id: 'no-late-snack', nameKey: 'predetermined.no-late-snack', icon: '🌙', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'reduce-sugar', nameKey: 'predetermined.reduce-sugar', icon: '🍬', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 25, unitKey: 'units.g' },
      { id: 'no-fast-food', nameKey: 'predetermined.no-fast-food', icon: '🍟', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'limit-processed', nameKey: 'predetermined.limit-processed', icon: '📦', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 1, unitKey: 'units.servings' },
      { id: 'no-energy-drinks', nameKey: 'predetermined.no-energy-drinks', icon: '⚡', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'reduce-snacking', nameKey: 'predetermined.reduce-snacking', icon: '🥜', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 2, unitKey: 'units.times' },
      { id: 'no-smoking', nameKey: 'predetermined.no-smoking', icon: '🚭', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'no-vaping', nameKey: 'predetermined.no-vaping', icon: '💨', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'reduce-nail-biting', nameKey: 'predetermined.reduce-nail-biting', icon: '✋', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
    ],
  },
  {
    titleKey: 'predetermined.cat.mindMood',
    habits: [
      { id: 'meditate', nameKey: 'predetermined.meditate', icon: '🧘', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 10, unitKey: 'units.min' },
      { id: 'journal', nameKey: 'predetermined.journal', icon: '📔', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'gratitude', nameKey: 'predetermined.gratitude', icon: '🙏', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'affirmations', nameKey: 'predetermined.affirmations', icon: '✨', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'read', nameKey: 'predetermined.read', icon: '📚', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 20, unitKey: 'units.min' },
      { id: 'get-outside', nameKey: 'predetermined.get-outside', icon: '🌳', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
      { id: 'no-phone-morning', nameKey: 'predetermined.no-phone-morning', icon: '☀️', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'brain-game', nameKey: 'predetermined.brain-game', icon: '🧩', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 10, unitKey: 'units.min' },
      { id: 'listen-audiobook', nameKey: 'predetermined.listen-audiobook', icon: '🔊', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 15, unitKey: 'units.min' },
      { id: 'reduce-social-media', nameKey: 'predetermined.reduce-social-media', icon: '📱', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 60, unitKey: 'units.min' },
      { id: 'screen-time', nameKey: 'predetermined.screen-time', icon: '📺', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 120, unitKey: 'units.min' },
      { id: 'no-phone-bed', nameKey: 'predetermined.no-phone-bed', icon: '📵', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'no-screens-bed', nameKey: 'predetermined.no-screens-bed', icon: '📵', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'no-scroll-morning', nameKey: 'predetermined.no-scroll-morning', icon: '⏰', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'limit-gaming', nameKey: 'predetermined.limit-gaming', icon: '🎮', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 90, unitKey: 'units.min' },
      { id: 'reduce-news', nameKey: 'predetermined.reduce-news', icon: '📰', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 2, unitKey: 'units.times' },
      { id: 'limit-youtube', nameKey: 'predetermined.limit-youtube', icon: '▶️', goalType: 'break', kind: 'numeric', frequency: 'daily', target: 60, unitKey: 'units.min' },
    ],
  },
  {
    titleKey: 'predetermined.cat.careerStudy',
    habits: [
      { id: 'plan-day', nameKey: 'predetermined.plan-day', icon: '📋', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'inbox-zero', nameKey: 'predetermined.inbox-zero', icon: '📧', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'no-procrastinate', nameKey: 'predetermined.no-procrastinate', icon: '🐸', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'deep-work', nameKey: 'predetermined.deep-work', icon: '🎯', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 90, unitKey: 'units.min' },
      { id: 'review-week', nameKey: 'predetermined.review-week', icon: '📊', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'learn-language', nameKey: 'predetermined.learn-language', icon: '🗣️', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 15, unitKey: 'units.min' },
      { id: 'course', nameKey: 'predetermined.course', icon: '📖', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
      { id: 'podcast', nameKey: 'predetermined.podcast', icon: '🎧', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 1, unitKey: 'units.episode' },
      { id: 'read-industry', nameKey: 'predetermined.read-industry', icon: '📰', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'skill-practice', nameKey: 'predetermined.skill-practice', icon: '💻', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
    ],
  },
  {
    titleKey: 'predetermined.cat.homeOrganization',
    habits: [
      { id: 'make-bed', nameKey: 'predetermined.make-bed', icon: '🛏️', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'tidy-10min', nameKey: 'predetermined.tidy-10min', icon: '🧹', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 10, unitKey: 'units.min' },
      { id: 'laundry', nameKey: 'predetermined.laundry', icon: '👕', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'dishes-daily', nameKey: 'predetermined.dishes-daily', icon: '🍽️', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'declutter', nameKey: 'predetermined.declutter', icon: '🗑️', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 15, unitKey: 'units.min' },
      { id: 'meal-prep', nameKey: 'predetermined.meal-prep', icon: '🍱', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'water-plants', nameKey: 'predetermined.water-plants', icon: '🪴', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'clean-surfaces', nameKey: 'predetermined.clean-surfaces', icon: '🧽', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'plan-meals', nameKey: 'predetermined.plan-meals', icon: '📝', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'evening-reset', nameKey: 'predetermined.evening-reset', icon: '🌆', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'reduce-snooze', nameKey: 'predetermined.reduce-snooze', icon: '⏰', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
    ],
  },
  {
    titleKey: 'predetermined.cat.finances',
    habits: [
      { id: 'track-expenses', nameKey: 'predetermined.track-expenses', icon: '📝', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'save-money', nameKey: 'predetermined.save-money', icon: '🏦', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'review-budget', nameKey: 'predetermined.review-budget', icon: '📊', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'pack-lunch', nameKey: 'predetermined.pack-lunch', icon: '🥪', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'review-subscriptions', nameKey: 'predetermined.review-subscriptions', icon: '📋', goalType: 'build', kind: 'boolean', frequency: 'monthly', target: 1 },
      { id: 'no-shopping-impulse', nameKey: 'predetermined.no-shopping-impulse', icon: '🛒', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'reduce-eating-out', nameKey: 'predetermined.reduce-eating-out', icon: '🍽️', goalType: 'break', kind: 'numeric', frequency: 'weekly', target: 3, unitKey: 'units.times' },
      { id: 'no-impulse-online', nameKey: 'predetermined.no-impulse-online', icon: '💻', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
    ],
  },
  {
    titleKey: 'predetermined.cat.relationships',
    habits: [
      { id: 'call-family', nameKey: 'predetermined.call-family', icon: '📞', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 2 },
      { id: 'social-event', nameKey: 'predetermined.social-event', icon: '👋', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'compliment-someone', nameKey: 'predetermined.compliment-someone', icon: '💬', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'quality-time', nameKey: 'predetermined.quality-time', icon: '❤️', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
      { id: 'check-in-friend', nameKey: 'predetermined.check-in-friend', icon: '📲', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'active-listening', nameKey: 'predetermined.active-listening', icon: '👂', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'write-message', nameKey: 'predetermined.write-message', icon: '✉️', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'random-kindness', nameKey: 'predetermined.random-kindness', icon: '🌟', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'no-gossip', nameKey: 'predetermined.no-gossip', icon: '🤫', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'limit-complaining', nameKey: 'predetermined.limit-complaining', icon: '😤', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'no-phone-meals', nameKey: 'predetermined.no-phone-meals', icon: '🍽️', goalType: 'break', kind: 'boolean', frequency: 'daily', target: 1 },
    ],
  },
  {
    titleKey: 'predetermined.cat.creativityHobbies',
    habits: [
      { id: 'creative-time', nameKey: 'predetermined.creative-time', icon: '🎨', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
      { id: 'write', nameKey: 'predetermined.write', icon: '✍️', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 500, unitKey: 'units.words' },
      { id: 'practice-instrument', nameKey: 'predetermined.practice-instrument', icon: '🎸', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 20, unitKey: 'units.min' },
      { id: 'draw-paint', nameKey: 'predetermined.draw-paint', icon: '🖌️', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 15, unitKey: 'units.min' },
      { id: 'photo-daily', nameKey: 'predetermined.photo-daily', icon: '📷', goalType: 'build', kind: 'boolean', frequency: 'daily', target: 1 },
      { id: 'cook-new-recipe', nameKey: 'predetermined.cook-new-recipe', icon: '👩‍🍳', goalType: 'build', kind: 'boolean', frequency: 'weekly', target: 1 },
      { id: 'gardening', nameKey: 'predetermined.gardening', icon: '🌱', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 15, unitKey: 'units.min' },
      { id: 'diy-project', nameKey: 'predetermined.diy-project', icon: '🔨', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
      { id: 'learn-new-skill', nameKey: 'predetermined.learn-new-skill', icon: '🎓', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 15, unitKey: 'units.min' },
      { id: 'craft', nameKey: 'predetermined.craft', icon: '✂️', goalType: 'build', kind: 'numeric', frequency: 'daily', target: 30, unitKey: 'units.min' },
    ],
  },
];

export function searchPredetermined(
  query: string,
  goalType: 'build' | 'break' | undefined,
  t: (key: string) => string,
  onboardingCategory?: OnboardingCategory,
): PredeterminedCategory[] {
  const q = query.trim().toLowerCase();
  let source = PREDETERMINED_CATEGORIES;
  if (goalType) {
    source = source
      .map(cat => ({
        titleKey: cat.titleKey,
        habits: cat.habits.filter(h => h.goalType === goalType),
      }))
      .filter(cat => cat.habits.length > 0);
  }

  if (!q) {
    if (!onboardingCategory) return source;
    const preferred = ONBOARDING_CATEGORY_TO_CATS[onboardingCategory] ?? [];
    if (preferred.length === 0) return source;

    const byTitleKey = new Map(source.map(cat => [cat.titleKey, cat] as const));
    const ordered: PredeterminedCategory[] = [];

    for (const key of preferred) {
      const cat = byTitleKey.get(key);
      if (cat) {
        ordered.push(cat);
        byTitleKey.delete(key);
      }
    }

    for (const [, cat] of byTitleKey) {
      ordered.push(cat);
    }

    return ordered;
  }

  const result: PredeterminedCategory[] = [];
  for (const cat of source) {
    const titleLower = t(cat.titleKey).toLowerCase();
    const matches = cat.habits.filter(h =>
      t(h.nameKey).toLowerCase().includes(q) || titleLower.includes(q),
    );
    if (matches.length > 0) result.push({ titleKey: cat.titleKey, habits: matches });
  }
  return result;
}
