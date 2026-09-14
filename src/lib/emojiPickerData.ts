/**
 * Emoji picker data: emoji + keywords for search.
 * Used by HabitIconStep. Keywords are used for filtering (e.g. "water" → 💧).
 *
 * Extended list comes from `emoji-datasource` (Unicode / vendor emoji set), not
 * raw code-point scans — avoids unsupported glyphs that show as tofu on some devices.
 */
import emojiData from 'emoji-datasource';

export interface EmojiOption {
  emoji: string;
  keywords: string[];
}

function unifiedToEmoji(unified: string): string {
  return unified.split('-').map((hex) => String.fromCodePoint(parseInt(hex, 16))).join('');
}

function keywordsFromDatum(d: { name: string; short_names: string[]; category: string }): string[] {
  const kw = new Set<string>();
  for (const s of d.short_names) {
    kw.add(s);
    kw.add(s.replace(/_/g, ' '));
  }
  for (const w of d.name.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 1)) {
    kw.add(w);
  }
  kw.add(d.category.toLowerCase());
  kw.add('emoji');
  kw.add('icon');
  return [...kw];
}

function buildDatasourceOptions(): EmojiOption[] {
  const sorted = [...emojiData].sort((a, b) => a.sort_order - b.sort_order);
  return sorted.map((d) => ({
    emoji: unifiedToEmoji(d.unified),
    keywords: keywordsFromDatum(d),
  }));
}

const CURATED_EMOJI_OPTIONS: EmojiOption[] = [
  // Stars & favorites
  { emoji: '⭐', keywords: ['star', 'favorite', 'goal', 'highlight'] },
  { emoji: '🌟', keywords: ['star', 'shine', 'goal'] },
  { emoji: '✨', keywords: ['sparkle', 'done', 'complete'] },
  { emoji: '💫', keywords: ['dizzy', 'star'] },
  // Fitness & movement
  { emoji: '🏃', keywords: ['run', 'running', 'jog', 'cardio'] },
  { emoji: '🚶', keywords: ['walk', 'walking', 'steps'] },
  { emoji: '🧘', keywords: ['meditate', 'meditation', 'yoga', 'mindful'] },
  { emoji: '🧘‍♀️', keywords: ['yoga', 'meditate', 'stretch'] },
  { emoji: '🧘‍♂️', keywords: ['yoga', 'meditate'] },
  { emoji: '🏋️', keywords: ['gym', 'workout', 'weights', 'lift', 'fitness'] },
  { emoji: '🏋️‍♀️', keywords: ['gym', 'workout', 'weights'] },
  { emoji: '🏋️‍♂️', keywords: ['gym', 'workout', 'weights'] },
  { emoji: '🚴', keywords: ['bike', 'cycling', 'cycle'] },
  { emoji: '🏊', keywords: ['swim', 'swimming', 'pool'] },
  { emoji: '🤸', keywords: ['stretch', 'gymnastics', 'flexibility'] },
  { emoji: '🙆', keywords: ['stretch', 'arms', 'stretching'] },
  { emoji: '💪', keywords: ['strength', 'muscle', 'plank', 'exercise'] },
  { emoji: '🦾', keywords: ['strong', 'arm', 'push', 'pushup', 'reps'] },
  { emoji: '👟', keywords: ['steps', 'shoes', 'run', 'walk'] },
  { emoji: '🪜', keywords: ['stairs', 'climb', 'steps'] },
  { emoji: '🏌️', keywords: ['golf'] },
  { emoji: '🎾', keywords: ['tennis'] },
  { emoji: '⚽', keywords: ['soccer', 'football'] },
  { emoji: '🏀', keywords: ['basketball'] },
  { emoji: '🧗', keywords: ['climb', 'climbing'] },
  // Water & drinks
  { emoji: '💧', keywords: ['water', 'drink', 'hydrate', 'glass'] },
  { emoji: '🍵', keywords: ['tea', 'green tea'] },
  { emoji: '☕', keywords: ['coffee', 'caffeine'] },
  { emoji: '🥤', keywords: ['soda', 'drink', 'pop'] },
  { emoji: '🍺', keywords: ['beer', 'alcohol', 'drink'] },
  { emoji: '🍷', keywords: ['wine', 'alcohol'] },
  // Food & eating
  { emoji: '🍎', keywords: ['apple', 'fruit', 'healthy'] },
  { emoji: '🥗', keywords: ['salad', 'healthy', 'eat'] },
  { emoji: '🥕', keywords: ['vegetable', 'carrot', 'eat', 'healthy'] },
  { emoji: '🥬', keywords: ['vegetable', 'green', 'lettuce', 'kale'] },
  { emoji: '🥦', keywords: ['broccoli', 'vegetable'] },
  { emoji: '🍳', keywords: ['breakfast', 'egg', 'cook'] },
  { emoji: '🍰', keywords: ['sweet', 'cake', 'dessert', 'sugar'] },
  { emoji: '🍬', keywords: ['candy', 'sugar', 'sweet'] },
  { emoji: '🍪', keywords: ['cookie', 'snack'] },
  // Health & body
  { emoji: '💊', keywords: ['vitamin', 'medicine', 'pill', 'supplement'] },
  { emoji: '🦷', keywords: ['teeth', 'brush', 'dental'] },
  { emoji: '🧵', keywords: ['floss', 'dental'] },
  { emoji: '😴', keywords: ['sleep', 'bed', 'rest'] },
  { emoji: '🛏️', keywords: ['bed', 'sleep', 'make bed'] },
  { emoji: '🧠', keywords: ['brain', 'mind', 'think', 'learn'] },
  { emoji: '❤️', keywords: ['heart', 'love', 'health'] },
  { emoji: '🫀', keywords: ['heart', 'cardio'] },
  { emoji: '🫁', keywords: ['lungs', 'breathe'] },
  // Learning & productivity
  { emoji: '📚', keywords: ['read', 'book', 'study'] },
  { emoji: '📖', keywords: ['book', 'read', 'study', 'course'] },
  { emoji: '📔', keywords: ['journal', 'notebook', 'diary'] },
  { emoji: '📝', keywords: ['note', 'write', 'todo'] },
  { emoji: '✍️', keywords: ['write', 'writing', 'pen'] },
  { emoji: '🎓', keywords: ['study', 'learn', 'graduate'] },
  { emoji: '🗣️', keywords: ['speak', 'language', 'talk'] },
  { emoji: '📋', keywords: ['plan', 'list', 'clipboard', 'todo'] },
  { emoji: '📧', keywords: ['email', 'inbox', 'mail'] },
  { emoji: '💻', keywords: ['computer', 'work', 'laptop'] },
  { emoji: '🎯', keywords: ['target', 'goal', 'focus', 'deep work'] },
  { emoji: '🐸', keywords: ['frog', 'eat the frog', 'hardest task', 'procrastinate'] },
  // Tech & screens
  { emoji: '📱', keywords: ['phone', 'social media', 'screen'] },
  { emoji: '📵', keywords: ['no phone', 'off', 'screen'] },
  { emoji: '📺', keywords: ['tv', 'screen', 'watch'] },
  // Nature & outside
  { emoji: '🌱', keywords: ['grow', 'plant', 'nature'] },
  { emoji: '🌳', keywords: ['tree', 'outside', 'nature', 'park'] },
  { emoji: '☀️', keywords: ['sun', 'morning', 'wake'] },
  { emoji: '🌙', keywords: ['moon', 'night', 'sleep', 'late'] },
  { emoji: '🌅', keywords: ['sunrise', 'morning'] },
  { emoji: '🌄', keywords: ['sunrise', 'morning'] },
  // Creativity & music
  { emoji: '🎵', keywords: ['music', 'listen'] },
  { emoji: '🎶', keywords: ['music', 'notes'] },
  { emoji: '🎧', keywords: ['headphones', 'podcast', 'listen'] },
  { emoji: '🎸', keywords: ['guitar', 'instrument', 'music', 'practice'] },
  { emoji: '🎹', keywords: ['piano', 'instrument', 'music'] },
  { emoji: '🎨', keywords: ['art', 'paint', 'creative'] },
  { emoji: '🖌️', keywords: ['paint', 'brush', 'art'] },
  { emoji: '✏️', keywords: ['pencil', 'draw', 'write'] },
  // Home & chores
  { emoji: '🧹', keywords: ['clean', 'tidy', 'sweep'] },
  { emoji: '👕', keywords: ['laundry', 'clothes', 'wash'] },
  { emoji: '🛒', keywords: ['shopping', 'groceries'] },
  // Social & communication
  { emoji: '📞', keywords: ['call', 'phone', 'family', 'friend'] },
  { emoji: '🙏', keywords: ['gratitude', 'thanks', 'pray', 'mindful'] },
  // Habits & goals
  { emoji: '🏆', keywords: ['trophy', 'win', 'goal', 'achieve'] },
  { emoji: '🎲', keywords: ['dice', 'game', 'random'] },
  { emoji: '🧩', keywords: ['puzzle', 'game'] },
  { emoji: '♟️', keywords: ['chess', 'game'] },
  { emoji: '📸', keywords: ['photo', 'camera'] },
  { emoji: '✈️', keywords: ['travel', 'plane'] },
  { emoji: '🧪', keywords: ['experiment', 'science'] },
  { emoji: '🧶', keywords: ['yarn', 'knit', 'craft'] },
  { emoji: '🚭', keywords: ['smoking', 'no smoke', 'quit'] },
  // Misc
  { emoji: '🔥', keywords: ['fire', 'streak', 'hot'] },
  { emoji: '💡', keywords: ['idea', 'light bulb'] },
  { emoji: '🔔', keywords: ['reminder', 'bell', 'notification'] },
  { emoji: '⏰', keywords: ['alarm', 'time', 'reminder'] },
  { emoji: '📅', keywords: ['calendar', 'date', 'schedule'] },
  { emoji: '✅', keywords: ['done', 'check', 'complete'] },
  { emoji: '🔄', keywords: ['repeat', 'habit', 'cycle'] },
];

// Curated entries first (richer habit-specific keywords), then full standard set.
const emojiSet = new Set<string>();
export const EMOJI_OPTIONS: EmojiOption[] = [
  ...CURATED_EMOJI_OPTIONS.filter(({ emoji }) => {
    if (emojiSet.has(emoji)) return false;
    emojiSet.add(emoji);
    return true;
  }),
  ...buildDatasourceOptions().filter(({ emoji }) => {
    if (emojiSet.has(emoji)) return false;
    emojiSet.add(emoji);
    return true;
  }),
];

export const EMOJI_LIST: EmojiOption[] = EMOJI_OPTIONS;

export function searchEmojis(query: string): EmojiOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return EMOJI_LIST;
  return EMOJI_LIST.filter(
    (opt) =>
      opt.keywords.some((k) => k.includes(q) || q.includes(k)) ||
      opt.emoji === query.trim()
  );
}
