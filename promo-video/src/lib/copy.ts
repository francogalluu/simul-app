import { createContext, useContext } from 'react';
import { staticFile } from 'remotion';

export type Lang = 'en' | 'es';

// Every on-screen string + the per-language layout tweaks that longer copy needs.
const COPY = {
  en: {
    hook: ['Building habits', 'alone is hard.'],
    day: 'Day',
    idea: ["So don't do it", 'alone.'],
    ideaNote: 'Do it with someone close to you.',
    steps: ['1. Do your habit.', '2. Send a photo.', '3. They approve it.'],
    tagThomas: "Thomas's phone",
    tagEmily: "Emily's phone",
    tagCx: 1128,
    polaroid: 'Read 20 pages',
    question: 'Who met or nearly met their goals?',
    questionSize: 70,
    source: 'Study by Gail Matthews, Dominican University of California',
    bars: [
      { cx: 770, value: '70%+', label: ['Shared weekly', 'with a friend'] },
      { cx: 1150, value: 'under half', label: ['Only thought', 'about it'] },
    ],
    barLabelSize: 33,
    cloud: { cx: 1430, cy: 560 },
    tagline: 'Build habits, together.',
    cta: 'Now on the App Store',
    screens: { home: 'screens/home.png', proof: 'screens/proof-review.png' },
    titleW: 316, // width (screenshot px) of the "Read 20 pages" title, for the strikethrough
  },
  es: {
    hook: ['Crear hábitos', 'solo es difícil.'],
    day: 'Día',
    idea: ['Así que no', 'lo hagas solo.'],
    ideaNote: 'Hacelo con alguien cercano.',
    steps: ['1. Hacé tu hábito.', '2. Mandá una foto.', '3. Tu pareja aprueba.'],
    tagThomas: 'Teléfono de Thomas',
    tagEmily: 'Teléfono de Emily',
    tagCx: 1090,
    polaroid: 'Leer 20 páginas',
    question: '¿Quiénes cumplieron (o casi) sus metas?',
    questionSize: 64,
    source: 'Estudio de Gail Matthews, Dominican University of California',
    bars: [
      { cx: 730, value: '70%+', label: ['Compartieron cada semana', 'con un amigo'] },
      { cx: 1190, value: 'menos de la mitad', label: ['Solo lo', 'pensaron'] },
    ],
    barLabelSize: 31,
    cloud: { cx: 1490, cy: 650 },
    tagline: 'Hábitos, juntos.',
    cta: 'Ya en el App Store',
    screens: { home: 'screens/es-01-home.png', proof: 'screens/es-06-proof-review.png' },
    titleW: 336,
  },
};

export type Copy = (typeof COPY)['en'];
export const LangContext = createContext<Lang>('en');
export const useCopy = (): Copy => COPY[useContext(LangContext)];
export const useScreens = () => {
  const c = useCopy();
  return { home: staticFile(c.screens.home), proof: staticFile(c.screens.proof) };
};
