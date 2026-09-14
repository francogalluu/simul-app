/**
 * i18n setup for Fovere (English + Spanish).
 * Import this once at app entry (App.tsx). Initial language is set after
 * reading persisted settings or device locale.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import es from './es.json';

export type Language = 'en' | 'es';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  lng: 'en', // default until App.tsx applies stored or device locale
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

/**
 * Maps device locale to supported app language.
 * Returns 'es' if device is Spanish, otherwise 'en'.
 */
export function getDeviceLocale(): Language {
  const locales = Localization.getLocales();
  const code = locales?.[0]?.languageCode?.toLowerCase();
  if (code === 'es' || code?.startsWith('es-')) return 'es';
  return 'en';
}

export { i18n };
