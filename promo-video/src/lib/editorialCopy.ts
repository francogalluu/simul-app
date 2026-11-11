import { createContext, useContext } from 'react';

export type Lang = 'en' | 'es';

// Every on-screen string of the editorial promo, per language, plus the few layout numbers that
// depend on copy length (font sizes, widths in px). Scenes read text only from here.
const COPY = {
  en: {
    hook: ['Habits are hard', 'to keep alone.'],
    hookSize: 120,
    pair: 'Thomas & Emily',
    idea: 'Build them together.',
    ideaSize: 116,
    phoneOf: ["Thomas's phone", "Emily's phone"],
    steps: ['Do your habit', 'Send a photo', 'Your partner approves'],
    stepSize: 46,
    approved: 'Approved', // the app's own chip label (proofs.approved)
    study: ['When one partner gets moving,', 'the other usually follows.'],
    studySize: 80,
    rows: [
      { label: 'Partner became active', filled: 8, value: '2 in 3' },
      { label: 'Partner stayed inactive', filled: 3, value: '1 in 4' },
    ],
    valueSize: 64,
    source: 'Jackson, Steptoe & Wardle, JAMA Internal Medicine (2015) · 3,722 adults in couples',
    wordmark: 'Simul',
    tagline: 'Build habits, together.',
    cta: 'Now on the App Store',
    screens: { home: 'screens/editorial/en-home.png', proof: 'screens/editorial/en-proof.png' },
    titleW: 316, // width (screenshot px) of the "Read 20 pages" title, for the strikethrough
  },
  // Spanish (Rioplatense voseo, like the app). Text only for now: its layout numbers and screens are
  // checked when the Spanish version is built, after the English video is approved.
  es: {
    hook: ['Los hábitos cuestan', 'cuando estás solo.'],
    hookSize: 120,
    pair: 'Thomas & Emily',
    idea: 'Construilos juntos.',
    ideaSize: 116,
    phoneOf: ['Teléfono de Thomas', 'Teléfono de Emily'],
    steps: ['Hacé tu hábito', 'Mandá una foto', 'Tu pareja aprueba'],
    stepSize: 46,
    approved: 'Aprobada',
    study: ['Cuando uno de la pareja se mueve,', 'el otro suele seguirlo.'],
    studySize: 80,
    rows: [
      { label: 'Su pareja empezó a moverse', filled: 8, value: '2 de cada 3' },
      { label: 'Su pareja siguió inactiva', filled: 3, value: '1 de cada 4' },
    ],
    valueSize: 64,
    source: 'Jackson, Steptoe y Wardle, JAMA Internal Medicine (2015) · 3.722 adultos en pareja',
    wordmark: 'Simul',
    tagline: 'Hábitos, juntos.',
    cta: 'Ya en el App Store',
    screens: { home: 'screens/editorial/es-home.png', proof: 'screens/editorial/es-proof.png' },
    titleW: 336,
  },
};

export type EditorialCopy = (typeof COPY)['en'];
export const EditorialLang = createContext<Lang>('en');
export const useEditorialCopy = (): EditorialCopy => COPY[useContext(EditorialLang)];
