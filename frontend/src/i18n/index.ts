import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ru from './locales/ru.json';

const tgUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
const telegramLang: string | undefined = tgUser?.language_code;

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ru: { translation: ru },
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'ru'],
        nonExplicitSupportedLngs: true,
        lng: telegramLang,
        detection: {
            order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupQuerystring: 'lng',
            lookupLocalStorage: 'i18nextLng',
        },
        interpolation: { escapeValue: false },
    });

export default i18n;
