export interface NavItem {
    path: string;
    icon: string;
    /** Ключ из i18n; второй аргумент t() даёт фолбэк, если ключа нет. */
    i18nKey: string;
    fallback: string;
}

export interface NavSection {
    id: string;
    i18nKey: string;
    fallback: string;
    /** Секцию можно свернуть; по умолчанию свёрнута только лаборатория. */
    collapsible?: boolean;
    items: NavItem[];
}

export const NAV: NavSection[] = [
    {
        id: 'chart',
        i18nKey: 'nav.section.chart',
        fallback: 'Карта',
        items: [
            { path: '/natal-chart', icon: '🌟', i18nKey: 'nav.short.natalChart', fallback: 'Натальная карта' },
            { path: '/chart-library', icon: '📚', i18nKey: 'nav.short.chartLibrary', fallback: 'Библиотека карт' },
            { path: '/synastry', icon: '💞', i18nKey: 'nav.short.synastry', fallback: 'Синастрия' },
            { path: '/progressions', icon: '⏳', i18nKey: 'nav.short.progressions', fallback: 'Прогрессии' },
            { path: '/draconic', icon: '🐉', i18nKey: 'nav.short.draconic', fallback: 'Драконическая' },
            { path: '/human-design', icon: '🔶', i18nKey: 'nav.short.humanDesign', fallback: 'Human Design' },
            { path: '/jyotish-dasha', icon: '🕉', i18nKey: 'nav.short.jyotishDasha', fallback: 'Джйотиш Даша' },
            { path: '/navamsa', icon: '⑨', i18nKey: 'nav.short.navamsa', fallback: 'Навамша D9' },
        ],
    },
    {
        id: 'day',
        i18nKey: 'nav.section.day',
        fallback: 'День',
        items: [
            { path: '/day-explorer', icon: '🔮', i18nKey: 'nav.short.dayExplorer', fallback: 'Проводник по дню' },
            { path: '/celestial-events', icon: '✨', i18nKey: 'nav.short.celestialEvents', fallback: 'Небесные события' },
        ],
    },
    {
        id: 'time',
        i18nKey: 'nav.section.time',
        fallback: 'Время',
        items: [
            { path: '/optimal-timing', icon: '⚡', i18nKey: 'nav.short.optimalTiming', fallback: 'Оптимальное время' },
            { path: '/optimal-timing-v2', icon: '🎯', i18nKey: 'nav.short.optimalTimingV2', fallback: 'Intent-scheduler v2' },
        ],
    },
    {
        id: 'lab',
        i18nKey: 'nav.section.lab',
        fallback: 'Лаборатория',
        collapsible: true,
        items: [
            { path: '/scheduler-lab', icon: '🔬', i18nKey: 'nav.short.schedulerLab', fallback: 'Scheduler Lab' },
            { path: '/zodiac-wheel-test', icon: '🧪', i18nKey: 'nav.short.testPage', fallback: 'Колесо (тест)' },
            { path: '/zodiac-wheel-demo', icon: '🎨', i18nKey: 'nav.short.demoPage', fallback: 'Колесо (демо)' },
        ],
    },
];

/** Заголовок шапки для текущего пути. `/natal-chart/:id` матчится префиксом. */
export function findNavItem(pathname: string): NavItem | null {
    let best: NavItem | null = null;
    for (const section of NAV) {
        for (const item of section.items) {
            if (pathname === item.path || pathname.startsWith(item.path + '/')) {
                if (!best || item.path.length > best.path.length) best = item;
            }
        }
    }
    return best;
}
