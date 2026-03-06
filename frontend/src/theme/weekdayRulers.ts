/**
 * Antigravity — Weekday Rulers (Chaldean System)
 *
 * Классическая хальдейская система управителей дней недели.
 * Каждый день недели управляется одной из 7 традиционных планет.
 */

import type { PlanetName } from './planetColors';

export interface WeekdayRulerInfo {
    planet: PlanetName;
    dayNameEn: string;
    dayNameRu: string;
    /** Хальдейские часы управителей (массив из 24 элементов) */
    hoursSequence: PlanetName[];
}

/**
 * Хальдейская последовательность планет (по убыванию скорости орбиты)
 * Сатурн → Юпитер → Марс → Солнце → Венера → Меркурий → Луна
 */
const CHALDEAN_ORDER: PlanetName[] = [
    'Saturn',
    'Jupiter',
    'Mars',
    'Sun',
    'Venus',
    'Mercury',
    'Moon',
];

/**
 * Управители дней недели (0 = Воскресенье, 6 = Суббота)
 * Соответствует возвращаемому значению Date.getDay()
 */
export const WEEKDAY_RULERS: Record<number, WeekdayRulerInfo> = {
    0: {
        planet: 'Sun',
        dayNameEn: 'Sunday',
        dayNameRu: 'Воскресенье',
        hoursSequence: generateHoursSequence('Sun'),
    },
    1: {
        planet: 'Moon',
        dayNameEn: 'Monday',
        dayNameRu: 'Понедельник',
        hoursSequence: generateHoursSequence('Moon'),
    },
    2: {
        planet: 'Mars',
        dayNameEn: 'Tuesday',
        dayNameRu: 'Вторник',
        hoursSequence: generateHoursSequence('Mars'),
    },
    3: {
        planet: 'Mercury',
        dayNameEn: 'Wednesday',
        dayNameRu: 'Среда',
        hoursSequence: generateHoursSequence('Mercury'),
    },
    4: {
        planet: 'Jupiter',
        dayNameEn: 'Thursday',
        dayNameRu: 'Четверг',
        hoursSequence: generateHoursSequence('Jupiter'),
    },
    5: {
        planet: 'Venus',
        dayNameEn: 'Friday',
        dayNameRu: 'Пятница',
        hoursSequence: generateHoursSequence('Venus'),
    },
    6: {
        planet: 'Saturn',
        dayNameEn: 'Saturday',
        dayNameRu: 'Суббота',
        hoursSequence: generateHoursSequence('Saturn'),
    },
};

/**
 * Генерирует хальдейскую последовательность часов для дня
 * @param startPlanet — управитель 1-го часа дня
 */
function generateHoursSequence(startPlanet: PlanetName): PlanetName[] {
    const startIdx = CHALDEAN_ORDER.indexOf(startPlanet);
    const hours: PlanetName[] = [];
    for (let i = 0; i < 24; i++) {
        hours.push(CHALDEAN_ORDER[(startIdx + i) % 7]);
    }
    return hours;
}

/**
 * Получить управителя дня недели для даты
 */
export function getWeekdayRuler(date: Date): WeekdayRulerInfo {
    const dayOfWeek = date.getDay();
    return WEEKDAY_RULERS[dayOfWeek];
}

/**
 * Получить хальдейского управителя текущего часа
 */
export function getCurrentHourRuler(date: Date): PlanetName {
    const dayInfo = getWeekdayRuler(date);
    const hour = date.getHours();
    // Хальдейские часы считаются с восхода (примерно 6:00 AM)
    // Для простоты считаем от 0:00
    return dayInfo.hoursSequence[hour % 24];
}
