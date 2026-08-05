/// Имена и символы. Часы рисовали растровые глифы 13×13, потому что во
/// встроенных шрифтах LovyanGFX нет ни кириллицы, ни астрологических знаков.
/// На телефоне это обычный текст, поэтому здесь Unicode и русские подписи.
library;

import 'ephemeris.dart';
import 'transits.dart';

const List<String> bodyNamesRu = <String>[
  'Солнце',
  'Луна',
  'Меркурий',
  'Венера',
  'Марс',
  'Юпитер',
  'Сатурн',
  'Уран',
  'Нептун',
  'Плутон',
];

/// Имена в том виде, в каком их ждёт бэкенд (shared-типы держат 'Sun').
const List<String> bodyNamesApi = <String>[
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];

/// Уран здесь ⛢, а не ♅: так в вебе (frontend/src/components/ZodiacWheel/utils.ts,
/// getPlanetSymbol) и так же обведены растры в AstroClock/src/glyphs.h. Веб
/// остаётся эталоном, расходиться начертаниям трёх клиентов незачем.
const List<String> bodyGlyphs = <String>[
  '☉', '☽', '☿', '♀', '♂', '♃', '♄', '⛢', '♆', '♇',
];

const List<String> signNamesRu = <String>[
  'Овен',
  'Телец',
  'Близнецы',
  'Рак',
  'Лев',
  'Дева',
  'Весы',
  'Скорпион',
  'Стрелец',
  'Козерог',
  'Водолей',
  'Рыбы',
];

const List<String> signNamesApi = <String>[
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

const List<String> signGlyphs = <String>[
  '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓',
];

/// Огонь, земля, воздух, вода по кругу.
const List<String> elementNamesRu = <String>['огонь', 'земля', 'воздух', 'вода'];

String elementOfSign(int sign) => elementNamesRu[sign % 4];

const Map<AspectKind, String> aspectNamesRu = <AspectKind, String>{
  AspectKind.conjunction: 'соединение',
  AspectKind.sextile: 'секстиль',
  AspectKind.square: 'квадрат',
  AspectKind.trine: 'трин',
  AspectKind.opposition: 'оппозиция',
};

const Map<AspectKind, String> aspectNamesApi = <AspectKind, String>{
  AspectKind.conjunction: 'conjunction',
  AspectKind.sextile: 'sextile',
  AspectKind.square: 'square',
  AspectKind.trine: 'trine',
  AspectKind.opposition: 'opposition',
};

const Map<AspectKind, String> aspectGlyphs = <AspectKind, String>{
  AspectKind.conjunction: '☌',
  AspectKind.sextile: '⚹',
  AspectKind.square: '□',
  AspectKind.trine: '△',
  AspectKind.opposition: '☍',
};

/// Гармоничный аспект или напряжённый. Соединение нейтрально: его окраска
/// зависит от участников, а не от угла.
bool isHarmonious(AspectKind k) =>
    k == AspectKind.sextile || k == AspectKind.trine;

bool isTense(AspectKind k) =>
    k == AspectKind.square || k == AspectKind.opposition;

/// Подпись натальной точки: тела плюс асцендент и середина неба.
String natalPointNameRu(int p) {
  if (p < bodyCount) return bodyNamesRu[p];
  if (p == natalAsc) return 'Асцендент';
  if (p == natalMc) return 'МС';
  return '?';
}

String natalPointNameApi(int p) {
  if (p < bodyCount) return bodyNamesApi[p];
  if (p == natalAsc) return 'Ascendant';
  if (p == natalMc) return 'MC';
  return '';
}

String natalPointGlyph(int p) {
  if (p < bodyCount) return bodyGlyphs[p];
  if (p == natalAsc) return 'Asc';
  if (p == natalMc) return 'MC';
  return '?';
}

/// Долгота в подпись «12°34′ Овна».
String formatLongitude(double lon) {
  final double n = norm360(lon);
  final int sign = (n / 30.0).floor();
  final double inSign = n - sign * 30.0;
  final int d = inSign.floor();
  final int m = ((inSign - d) * 60).round();
  final int dd = m == 60 ? d + 1 : d;
  final int mm = m == 60 ? 0 : m;
  return '$dd°${mm.toString().padLeft(2, '0')}′ ${signGlyphs[sign]}';
}

String formatOrb(double orb) => '${orb.toStringAsFixed(2)}°';

const List<String> weekdayNamesRu = <String>[
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
];
