/**
 * Localization utility for the Lunar Calendar extension
 */

class LunarLocalization {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.translations = {};
        this.loaded = false;
    }

    /**
     * Detect user's preferred language
     */
    detectLanguage() {
        // Get browser language
        const browserLang = navigator.language || navigator.userLanguage;

        // Check if it's Russian
        if (browserLang.startsWith('ru')) {
            return 'ru';
        }

        // Default to Russian for this extension unless the user saved a preference
        return 'ru';
    }

    /**
     * Load translations for current language
     */
    async loadTranslations() {
        if (this.loaded) return;

        try {
            const response = await fetch(`locales/${this.currentLang}.json`);
            this.translations = await response.json();
            this.loaded = true;
        } catch (error) {
            console.warn(`Failed to load ${this.currentLang} translations, falling back to English`);
            if (this.currentLang !== 'en') {
                this.currentLang = 'en';
                return this.loadTranslations();
            }
        }
    }

    /**
     * Get translated text by key path
     * @param {string} keyPath - Dot-separated path to translation key (e.g., 'popup.title')
     * @param {object} params - Optional parameters for string interpolation
     */
    t(keyPath, params = {}) {
        if (!this.loaded) {
            console.warn('Translations not loaded yet');
            return keyPath;
        }

        const keys = keyPath.split('.');
        let value = this.translations;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                console.warn(`Translation key not found: ${keyPath}`);
                return keyPath;
            }
        }

        // Simple parameter interpolation
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? params[key] : match;
            });
        }

        return value;
    }

    /**
     * Translate moon phase names from API response
     */
    translateMoonPhase(phaseName) {
        const phaseMap = {
            'New Moon': 'moonPhases.newMoon',
            'Waxing Crescent': 'moonPhases.waxingCrescent',
            'First Quarter': 'moonPhases.firstQuarter',
            'Waxing Gibbous': 'moonPhases.waxingGibbous',
            'Full Moon': 'moonPhases.fullMoon',
            'Waning Gibbous': 'moonPhases.waningGibbous',
            'Last Quarter': 'moonPhases.lastQuarter',
            'Waning Crescent': 'moonPhases.waningCrescent'
        };

        const key = phaseMap[phaseName];
        return key ? this.t(key) : phaseName;
    }

    /**
     * Format duration with localized units
     */
    formatDuration(timeString) {
        if (!timeString) return '';

        // Replace English time units with localized ones
        let formatted = timeString;

        if (this.currentLang === 'ru') {
            // Handle Russian pluralization
            formatted = formatted
                .replace(/(\d+)\s+days?/g, (match, num) => {
                    const n = parseInt(num);
                    let unit;
                    if (n % 10 === 1 && n % 100 !== 11) {
                        unit = 'день';
                    } else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) {
                        unit = 'дня';
                    } else {
                        unit = 'дней';
                    }
                    return `${n} ${unit}`;
                })
                .replace(/(\d+)\s+hours?/g, (match, num) => {
                    const n = parseInt(num);
                    let unit;
                    if (n % 10 === 1 && n % 100 !== 11) {
                        unit = 'час';
                    } else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) {
                        unit = 'часа';
                    } else {
                        unit = 'часов';
                    }
                    return `${n} ${unit}`;
                })
                .replace(/(\d+)\s+minutes?/g, (match, num) => {
                    const n = parseInt(num);
                    let unit;
                    if (n % 10 === 1 && n % 100 !== 11) {
                        unit = 'минута';
                    } else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) {
                        unit = 'минуты';
                    } else {
                        unit = 'минут';
                    }
                    return `${n} ${unit}`;
                });
        }

        return formatted;
    }

    /**
     * Get current language code
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Switch language
     */
    async switchLanguage(langCode) {
        if (this.currentLang === langCode) return;

        this.currentLang = langCode;
        this.loaded = false;
        await this.loadTranslations();

        // Store preference
        try {
            localStorage.setItem('lunarCalendarLang', langCode);
        } catch (e) {
            console.warn('Could not save language preference');
        }
    }

    /**
     * Load saved language preference
     */
    loadLanguagePreference() {
        try {
            const saved = localStorage.getItem('lunarCalendarLang');
            if (saved && ['en', 'ru'].includes(saved)) {
                this.currentLang = saved;
            }
        } catch (e) {
            console.warn('Could not load language preference');
        }
    }
}

// Global instance
window.lunarL10n = new LunarLocalization();