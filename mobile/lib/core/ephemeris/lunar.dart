/// Лунные сутки и таблица тридцати дней.
///
/// Порт AstroClock/src/lunar.h и src/lunardays.h. Первый день месяца идёт от
/// новолуния до первого восхода Луны, каждый следующий — от восхода до восхода.
/// Дней получается 29 или 30; тридцатый, когда случается, обрезается
/// новолунием.
library;

import 'ephemeris.dart';

class LunarDay {
  /// 1..30
  final int number;
  final double startJd;
  final double endJd;

  /// Знак Луны в запрошенный момент, 0..11.
  final int moonSign;

  /// Освещённость диска, 0..1.
  final double phase;

  const LunarDay({
    required this.number,
    required this.startJd,
    required this.endJd,
    required this.moonSign,
    required this.phase,
  });

  bool covers(double jd) => jd >= startJd && jd < endJd;

  LunarDayInfo get info => lunarDayTable[number - 1];
}

/// До трёх десятков поисков восхода Луны. Вызывающий обязан кэшировать
/// результат и пересчитывать только при выходе jd за [startJd, endJd).
LunarDay computeLunarDay(double jd, double lat, double lonEast) {
  final double nm = previousNewMoon(jd);
  final double nmNext = nextNewMoon(jd);

  int n = 1;
  double start = nm;
  double rise = moonriseAfter(nm, lat, lonEast);
  while (rise <= jd && n < 30) {
    n++;
    start = rise;
    // Между восходами 24ч49м плюс-минус полчаса, окно поиска сужено
    rise = moonriseAfter(rise + 0.8, lat, lonEast);
  }

  return LunarDay(
    number: n,
    startJd: start,
    endJd: rise < nmNext ? rise : nmNext,
    moonSign: (longitude(Body.moon, jd) / 30.0).floor(),
    phase: moonIllumination(jd),
  );
}

// --- сферы дня -------------------------------------------------------------

/// Сферы, по которым размечены тридцать дней. Порядок битов совпадает
/// с lunardays::Icon в прошивке, менять его нельзя: маски заданы числами.
enum Sphere {
  start('начинания'),
  work('дела'),
  money('деньги'),
  love('любовь'),
  talk('разговоры'),
  home('дом'),
  body('тело'),
  rest('отдых'),
  dream('сны'),
  study('учёба'),
  heal('здоровье'),
  road('дорога'),
  food('еда'),
  trade('сделки'),
  focus('сосредоточенность'),
  error('ошибки'),
  invent('изобретение'),
  purge('разбор');

  final String label;
  const Sphere(this.label);
}

List<Sphere> _spheresFromMask(int mask) => <Sphere>[
      for (final Sphere s in Sphere.values)
        if (mask & (1 << s.index) != 0) s
    ];

class LunarDayInfo {
  final int number;
  final String title;

  /// +1 день лёгкий, 0 ровный, -1 требует осторожности.
  final int tone;

  /// Чему день подходит.
  final List<Sphere> yes;

  /// Чего лучше не затевать.
  final List<Sphere> no;

  const LunarDayInfo(this.number, this.title, this.tone, this.yes, this.no);
}

LunarDayInfo _row(int n, String title, int tone, int yes, int no) =>
    LunarDayInfo(n, title, tone, _spheresFromMask(yes), _spheresFromMask(no));

/// Маски сфер собраны из корпуса zet/corpus.jsonl: 210 текстов, семь авторов
/// (Глоба в двух книгах, Зараев, Альберт Великий, ведические титхи, хорарная
/// традиция). Для каждой сферы считается полярность упоминаний по предложениям
/// с проверкой отрицаний рядом с ключевым словом, затем z-оценка по всем
/// тридцати дням: важна не частота темы, а насколько день по ней выделяется.
final List<LunarDayInfo> lunarDayTable = <LunarDayInfo>[
  _row(1, 'Свеча', 0, 0x00112, 0x00001),
  _row(2, 'Рог', 1, 0x0200C, 0x20000),
  _row(3, 'Барс', 0, 0x00042, 0x00000),
  _row(4, 'Древо', 0, 0x01024, 0x00000),
  _row(5, 'Единорог', 0, 0x03004, 0x00002),
  _row(6, 'Журавль', 1, 0x04110, 0x00000),
  _row(7, 'Ветер', 1, 0x00490, 0x00000),
  _row(8, 'Феникс', 0, 0x10008, 0x00040),
  _row(9, 'Мышь', -1, 0x20440, 0x08000),
  _row(10, 'Фонтан', 1, 0x00821, 0x00000),
  _row(11, 'Корона', 0, 0x00081, 0x00008),
  _row(12, 'Чаша', 1, 0x04088, 0x00000),
  _row(13, 'Колесо', 1, 0x00A20, 0x00400),
  _row(14, 'Труба', 1, 0x00403, 0x00000),
  _row(15, 'Змей', -1, 0x00100, 0x00000),
  _row(16, 'Бабочка', 1, 0x200C0, 0x00000),
  _row(17, 'Лоза', 1, 0x0200C, 0x00040),
  _row(18, 'Зеркало', 0, 0x18010, 0x00000),
  _row(19, 'Паук', -1, 0x0C020, 0x00400),
  _row(20, 'Орёл', 1, 0x02804, 0x00000),
  _row(21, 'Конь', 1, 0x00062, 0x00400),
  _row(22, 'Слон', 1, 0x02202, 0x00001),
  _row(23, 'Крокодил', -1, 0x00410, 0x00000),
  _row(24, 'Медведь', 1, 0x00409, 0x00000),
  _row(25, 'Черепаха', 0, 0x00040, 0x00400),
  _row(26, 'Жаба', -1, 0x00202, 0x08000),
  _row(27, 'Жезл', 0, 0x10880, 0x00008),
  _row(28, 'Лотос', 1, 0x00103, 0x00000),
  _row(29, 'Спрут', -1, 0x20100, 0x00400),
  _row(30, 'Лебедь', 1, 0x20108, 0x00200),
];

// --- фаза ------------------------------------------------------------------

enum MoonPhaseName {
  newMoon('новолуние'),
  waxingCrescent('растущий серп'),
  firstQuarter('первая четверть'),
  waxingGibbous('растущая луна'),
  full('полнолуние'),
  waningGibbous('убывающая луна'),
  lastQuarter('последняя четверть'),
  waningCrescent('убывающий серп');

  final String label;
  const MoonPhaseName(this.label);
}

/// Фаза по элонгации, восемь секторов по 45°. Границы те же, что у v2-схемы
/// на бэкенде, иначе локальный и серверный ответ разошлись бы на названии.
MoonPhaseName moonPhaseName(double jd) {
  final double elong =
      norm360(moonApparentLongitude(jd) - sunApparentLongitude(jd));
  final int sector = ((elong + 22.5) / 45.0).floor() % 8;
  return MoonPhaseName.values[sector];
}
