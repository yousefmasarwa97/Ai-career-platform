import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SUPPORTED_LOCALES } from '@ai-career/shared';
import en from './locales/en.json';
import ar from './locales/ar.json';
import he from './locales/he.json';

/**
 * i18n scaffolding (Req 16.6). Right-to-left handling for ar/he is applied in
 * the app shell in a later UI task; here we register the resource bundles.
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      he: { translation: he },
    },
    supportedLngs: [...SUPPORTED_LOCALES],
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
