import { ZodiacSign } from '../types';

export const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    id: 1,
    name: 'Овен',
    element: 'Огонь',
    quality: 'Кардинальный',
    rulingPlanet: 'Mars',
    symbol: '♈',
    dateRange: [21, 19], // Mar 21 - Apr 19
  },
  {
    id: 2,
    name: 'Телец',
    element: 'Земля',
    quality: 'Фиксированный',
    rulingPlanet: 'Venus',
    symbol: '♉',
    dateRange: [20, 20], // Apr 20 - May 20
  },
  {
    id: 3,
    name: 'Близнецы',
    element: 'Воздух',
    quality: 'Мутабельный',
    rulingPlanet: 'Mercury',
    symbol: '♊',
    dateRange: [21, 20], // May 21 - Jun 20
  },
  {
    id: 4,
    name: 'Рак',
    element: 'Вода',
    quality: 'Кардинальный',
    rulingPlanet: 'Moon',
    symbol: '♋',
    dateRange: [21, 22], // Jun 21 - Jul 22
  },
  {
    id: 5,
    name: 'Лев',
    element: 'Огонь',
    quality: 'Фиксированный',
    rulingPlanet: 'Sun',
    symbol: '♌',
    dateRange: [23, 22], // Jul 23 - Aug 22
  },
  {
    id: 6,
    name: 'Дева',
    element: 'Земля',
    quality: 'Мутабельный',
    rulingPlanet: 'Mercury',
    symbol: '♍',
    dateRange: [23, 22], // Aug 23 - Sep 22
  },
  {
    id: 7,
    name: 'Весы',
    element: 'Воздух',
    quality: 'Кардинальный',
    rulingPlanet: 'Venus',
    symbol: '♎',
    dateRange: [23, 22], // Sep 23 - Oct 22
  },
  {
    id: 8,
    name: 'Скорпион',
    element: 'Вода',
    quality: 'Фиксированный',
    rulingPlanet: 'Pluto',
    symbol: '♏',
    dateRange: [23, 21], // Oct 23 - Nov 21
  },
  {
    id: 9,
    name: 'Стрелец',
    element: 'Огонь',
    quality: 'Мутабельный',
    rulingPlanet: 'Jupiter',
    symbol: '♐',
    dateRange: [22, 21], // Nov 22 - Dec 21
  },
  {
    id: 10,
    name: 'Козерог',
    element: 'Земля',
    quality: 'Кардинальный',
    rulingPlanet: 'Saturn',
    symbol: '♑',
    dateRange: [22, 19], // Dec 22 - Jan 19
  },
  {
    id: 11,
    name: 'Водолей',
    element: 'Воздух',
    quality: 'Фиксированный',
    rulingPlanet: 'Uranus',
    symbol: '♒',
    dateRange: [20, 18], // Jan 20 - Feb 18
  },
  {
    id: 12,
    name: 'Рыбы',
    element: 'Вода',
    quality: 'Мутабельный',
    rulingPlanet: 'Neptune',
    symbol: '♓',
    dateRange: [19, 20], // Feb 19 - Mar 20
  },
];

export const getZodiacSignByLongitude = (longitude: number): ZodiacSign => {
  const signIndex = Math.floor(longitude / 30);
  return ZODIAC_SIGNS[signIndex];
};
