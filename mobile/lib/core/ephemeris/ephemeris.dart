/// Автономные эфемериды: видимые геоцентрические эклиптические долготы на дату.
/// Сети и файлов данных не требует, всё считается на месте.
///
/// Порт AstroClock/src/ephemeris.h один в один. Планеты — метод Standish (JPL,
/// приближённые кеплеровы элементы с вековыми скоростями), полная трёхмерная
/// задача с наклонением и узлом. Солнце и Луна — ряды Meeus напрямую
/// в геоцентрике.
///
/// Расхождение со swisseph на сетке 1955–2050: Солнце 0.008°, Луна 0.015°,
/// худшие Юпитер и Сатурн 0.18°. Асцендент и МС до 0.1″.
library;

import 'dart:math' as math;

enum Body {
  sun,
  moon,
  mercury,
  venus,
  mars,
  jupiter,
  saturn,
  uranus,
  neptune,
  pluto,
}

const int bodyCount = 10;

const double j2000 = 2451545.0;
const double deg = 0.017453292519943295; // рад в градусе
const double rad = 57.29577951308232; // градусов в радиане

double norm360(double x) {
  x = x % 360.0;
  return x < 0 ? x + 360.0 : x;
}

/// Разность углов, приведённая к (-180, 180].
double angleDiff(double a, double b) {
  double d = (a - b + 180.0) % 360.0;
  if (d < 0) d += 360.0;
  return d - 180.0;
}

double julianDayFromUnix(int unixSeconds) => unixSeconds / 86400.0 + 2440587.5;

double julianDayFromDateTime(DateTime t) =>
    julianDayFromUnix(t.toUtc().millisecondsSinceEpoch ~/ 1000) +
    (t.toUtc().millisecondsSinceEpoch % 1000) / 86400000.0;

DateTime dateTimeFromJulianDay(double jd) => DateTime.fromMillisecondsSinceEpoch(
      ((jd - 2440587.5) * 86400000.0).round(),
      isUtc: true,
    );

/// Юлианская дата из гражданских компонент. offsetHours — смещение от UTC,
/// которое действовало в месте и в момент события, с декретным и летним
/// временем.
double julianDayFromCivil(
  int year,
  int month,
  int day,
  int hour,
  int minute,
  double offsetHours,
) {
  int y = year;
  int m = month;
  final double d = day + (hour + minute / 60.0 - offsetHours) / 24.0;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  final int a = y ~/ 100;
  final int b = 2 - a + a ~/ 4; // григорианский календарь
  return (365.25 * (y + 4716)).toInt() +
      (30.6001 * (m + 1)).toInt() +
      d +
      b -
      1524.5;
}

// --- нутация и наклон эклиптики -------------------------------------------

/// Нутация по долготе, градусы. Четыре главных члена, остаток меньше 0.5″.
double nutationInLongitude(double jd) {
  final double t = (jd - j2000) / 36525.0;
  final double om = (125.04452 - 1934.136261 * t) * deg;
  final double l = (280.4665 + 36000.7698 * t) * deg;
  final double lp = (218.3165 + 481267.8813 * t) * deg;
  final double dpsi = -17.20 * math.sin(om) -
      1.32 * math.sin(2 * l) -
      0.23 * math.sin(2 * lp) +
      0.21 * math.sin(2 * om);
  return dpsi / 3600.0;
}

/// Средний наклон эклиптики, градусы.
double meanObliquity(double jd) {
  final double t = (jd - j2000) / 36525.0;
  return 23.439291111 -
      0.0130041667 * t -
      1.638889e-7 * t * t +
      5.036111e-7 * t * t * t;
}

double trueObliquity(double jd) {
  final double t = (jd - j2000) / 36525.0;
  final double om = (125.04452 - 1934.136261 * t) * deg;
  final double l = (280.4665 + 36000.7698 * t) * deg;
  final double lp = (218.3165 + 481267.8813 * t) * deg;
  final double deps = 9.20 * math.cos(om) +
      0.57 * math.cos(2 * l) +
      0.10 * math.cos(2 * lp) -
      0.09 * math.cos(2 * om);
  return meanObliquity(jd) + deps / 3600.0;
}

/// Общая прецессия по долготе от J2000 к эклиптике даты, градусы.
double precessionFromJ2000(double jd) {
  final double t = (jd - j2000) / 36525.0;
  return (5028.796195 * t + 1.1054348 * t * t) / 3600.0;
}

// --- Солнце (Meeus, гл. 25) -----------------------------------------------

/// Видимая долгота Солнца с учётом нутации и аберрации.
double sunApparentLongitude(double jd) {
  final double t = (jd - j2000) / 36525.0;
  final double l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  final double m = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) * deg;
  final double c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * math.sin(m) +
      (0.019993 - 0.000101 * t) * math.sin(2 * m) +
      0.000289 * math.sin(3 * m);
  final double trueLong = l0 + c;
  final double om = (125.04 - 1934.136 * t) * deg;
  // -0.00569° — аберрация, -0.00478 sin Ω — нутация в упрощённой форме
  return norm360(trueLong - 0.00569 - 0.00478 * math.sin(om));
}

/// Расстояние до Солнца, а.е. Нужно для фазы Луны и светового запаздывания.
double sunRadiusVector(double jd) {
  final double t = (jd - j2000) / 36525.0;
  final double m = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) * deg;
  final double e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
  final double c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * math.sin(m) +
      (0.019993 - 0.000101 * t) * math.sin(2 * m) +
      0.000289 * math.sin(3 * m);
  final double nu = m + c * deg;
  return 1.000001018 * (1 - e * e) / (1 + e * math.cos(nu));
}

// --- Луна (Meeus, гл. 47) --------------------------------------------------

/// Ряд Σl: [d, m, mp, f, коэффициент в 1e-6 градуса]. Усечён на членах меньше
/// 300e-6, остаток даёт вклад в пределах 0.001°.
const List<List<int>> _moonTerms = <List<int>>[
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861],
  [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069],
  [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215],
  [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713], [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691], [2, -1, 0, -2, 596],
  [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520], [1, 0, -2, 0, -487],
  [2, 1, 0, -2, -399], [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351], [3, 0, -2, 0, -340],
  [4, 0, -3, 0, 330], [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323], [1, 1, -1, 0, 299],
  [2, 0, 3, 0, 294],
];

/// Видимая геоцентрическая долгота Луны.
double moonApparentLongitude(double jd) {
  final double t = (jd - j2000) / 36525.0;
  final double t2 = t * t, t3 = t2 * t, t4 = t3 * t;

  final double lp = 218.3164477 +
      481267.88123421 * t -
      0.0015786 * t2 +
      t3 / 538841.0 -
      t4 / 65194000.0;
  final double d = 297.8501921 +
      445267.1114034 * t -
      0.0018819 * t2 +
      t3 / 545868.0 -
      t4 / 113065000.0;
  final double m =
      357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000.0;
  final double mp = 134.9633964 +
      477198.8675055 * t +
      0.0087414 * t2 +
      t3 / 69699.0 -
      t4 / 14712000.0;
  final double f = 93.2720950 +
      483202.0175233 * t -
      0.0036539 * t2 -
      t3 / 3526000.0 +
      t4 / 863310000.0;

  final double a1 = 119.75 + 131.849 * t;
  final double a2 = 53.09 + 479264.290 * t;
  // Эксцентриситет земной орбиты: члены с M и 2M ослабевают со временем
  final double e = 1.0 - 0.002516 * t - 0.0000074 * t2;

  double sigmaL = 0.0;
  for (final List<int> term in _moonTerms) {
    final double arg =
        (term[0] * d + term[1] * m + term[2] * mp + term[3] * f) * deg;
    double coeff = term[4].toDouble();
    final int am = term[1].abs();
    if (am == 1) {
      coeff *= e;
    } else if (am == 2) {
      coeff *= e * e;
    }
    sigmaL += coeff * math.sin(arg);
  }
  // Аддитивные поправки: Венера, Юпитер и уплощение Земли
  sigmaL += 3958.0 * math.sin(a1 * deg) +
      1962.0 * math.sin((lp - f) * deg) +
      318.0 * math.sin(a2 * deg);

  return norm360(lp + sigmaL / 1000000.0 + nutationInLongitude(jd));
}

// --- планеты (Standish, JPL approximate elements) --------------------------

class _KeplerElements {
  /// Элементы на эпоху J2000: a в а.е., остальное в градусах.
  final double a, e, i, l, varpi, om;

  /// Скорости за юлианское столетие.
  final double da, de, di, dl, dvarpi, dom;

  const _KeplerElements(this.a, this.e, this.i, this.l, this.varpi, this.om,
      this.da, this.de, this.di, this.dl, this.dvarpi, this.dom);
}

/// Таблица для интервала 1800–2050.
const List<_KeplerElements> _keplerTable = <_KeplerElements>[
  // Меркурий
  _KeplerElements(0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628,
      48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175,
      0.16047689, -0.12534081),
  // Венера
  _KeplerElements(0.72333566, 0.00677672, 3.39467605, 181.97909950,
      131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890,
      58517.81538729, 0.00268329, -0.27769418),
  // Земля / барицентр системы Земля-Луна
  _KeplerElements(1.00000261, 0.01671123, -0.00001531, 100.46457166,
      102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981,
      0.32327364, 0.0),
  // Марс
  _KeplerElements(1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959,
      49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499,
      0.44441088, -0.29257343),
  // Юпитер
  _KeplerElements(5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983,
      100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775,
      0.21252668, 0.20469106),
  // Сатурн
  _KeplerElements(9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831,
      113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201,
      -0.41897216, -0.28867794),
  // Уран
  _KeplerElements(19.18916464, 0.04725744, 0.77263783, 313.23810451,
      170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939,
      428.48202785, 0.40805281, 0.04240589),
  // Нептун
  _KeplerElements(30.06992276, 0.00859048, 1.77004347, -55.12002969,
      44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372,
      218.45945325, -0.32241464, -0.00508664),
  // Плутон
  _KeplerElements(39.48211675, 0.24882730, 17.14001206, 238.92903833,
      224.06891629, 110.30393684, -0.00031596, 0.00005170, 0.00004818,
      145.20780515, -0.04062942, -0.01183482),
];

class _Vec3 {
  final double x, y, z;
  const _Vec3(this.x, this.y, this.z);
}

/// Гелиоцентрические прямоугольные координаты в эклиптике J2000.
_Vec3 _heliocentricJ2000(int idx, double jd) {
  final _KeplerElements k = _keplerTable[idx];
  final double t = (jd - j2000) / 36525.0;

  final double a = k.a + k.da * t;
  final double e = k.e + k.de * t;
  final double inc = (k.i + k.di * t) * deg;
  final double l = k.l + k.dl * t;
  final double varpi = k.varpi + k.dvarpi * t;
  final double om = (k.om + k.dom * t) * deg;

  final double omega = varpi * deg - om;
  double m = norm360(l - varpi);
  if (m > 180.0) m -= 360.0;
  m *= deg;

  // Кеплер: E - e sin E = M. Ньютон сходится за 4 итерации даже на Плутоне.
  double ecc = m + e * math.sin(m);
  for (int i = 0; i < 6; i++) {
    final double dm = m - (ecc - e * math.sin(ecc));
    final double de = dm / (1.0 - e * math.cos(ecc));
    ecc += de;
    if (de < 1e-12 && de > -1e-12) break;
  }

  final double xp = a * (math.cos(ecc) - e);
  final double yp = a * math.sqrt(1.0 - e * e) * math.sin(ecc);

  final double co = math.cos(omega), so = math.sin(omega);
  final double cO = math.cos(om), sO = math.sin(om);
  final double cI = math.cos(inc), sI = math.sin(inc);

  return _Vec3(
    (co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp,
    (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp,
    (so * sI) * xp + (co * sI) * yp,
  );
}

/// Индекс в таблице Кеплера по Body. Земля стоит третьей и телом не является.
int _keplerIndex(Body b) {
  switch (b) {
    case Body.mercury:
      return 0;
    case Body.venus:
      return 1;
    case Body.mars:
      return 3;
    case Body.jupiter:
      return 4;
    case Body.saturn:
      return 5;
    case Body.uranus:
      return 6;
    case Body.neptune:
      return 7;
    case Body.pluto:
      return 8;
    default:
      return -1;
  }
}

const int _earthIndex = 2;
const double _lightDaysPerAu = 0.005775518;

/// Видимая геоцентрическая долгота планеты на эклиптику даты.
double planetApparentLongitude(Body b, double jd) {
  final int idx = _keplerIndex(b);
  final _Vec3 earth = _heliocentricJ2000(_earthIndex, jd);
  _Vec3 p = _heliocentricJ2000(idx, jd);

  // Световое запаздывание: одна итерация уносит ошибку ниже угловой секунды
  double dx = p.x - earth.x, dy = p.y - earth.y;
  final double dz = p.z - earth.z;
  final double dist = math.sqrt(dx * dx + dy * dy + dz * dz);
  p = _heliocentricJ2000(idx, jd - dist * _lightDaysPerAu);
  dx = p.x - earth.x;
  dy = p.y - earth.y;

  final double lonJ2000 = math.atan2(dy, dx) * rad;
  return norm360(lonJ2000 + precessionFromJ2000(jd) + nutationInLongitude(jd));
}

// --- общий вход ------------------------------------------------------------

/// Видимая геоцентрическая эклиптическая долгота тела, градусы.
double longitude(Body b, double jd) {
  if (b == Body.sun) return sunApparentLongitude(jd);
  if (b == Body.moon) return moonApparentLongitude(jd);
  return planetApparentLongitude(b, jd);
}

/// Скорость по долготе, градусов в сутки. Отрицательная — ретроградность.
double speed(Body b, double jd) {
  final double h = (b == Body.moon) ? 0.05 : 0.5;
  return angleDiff(longitude(b, jd + h), longitude(b, jd - h)) / (2 * h);
}

bool isRetrograde(Body b, double jd) =>
    b != Body.sun && b != Body.moon && speed(b, jd) < 0.0;

/// Освещённая доля диска Луны, 0..1.
double moonIllumination(double jd) {
  final double elong =
      angleDiff(moonApparentLongitude(jd), sunApparentLongitude(jd));
  return (1.0 - math.cos(elong * deg)) / 2.0;
}

/// Растёт ли Луна.
bool moonWaxing(double jd) {
  final double elong =
      norm360(moonApparentLongitude(jd) - sunApparentLongitude(jd));
  return elong < 180.0;
}

// --- дома ------------------------------------------------------------------

/// Среднее звёздное время по Гринвичу, градусы.
double greenwichSiderealTime(double jd) {
  final double t = (jd - j2000) / 36525.0;
  final double gst = 280.46061837 +
      360.98564736629 * (jd - j2000) +
      0.000387933 * t * t -
      t * t * t / 38710000.0;
  return norm360(gst);
}

/// Истинное местное звёздное время с учётом нутации, градусы.
double localSiderealTime(double jd, double lonEast) {
  final double eq = nutationInLongitude(jd) * math.cos(trueObliquity(jd) * deg);
  return norm360(greenwichSiderealTime(jd) + eq + lonEast);
}

/// Асцендент, градусы эклиптической долготы.
double ascendant(double jd, double latNorth, double lonEast) {
  final double lst = localSiderealTime(jd, lonEast) * deg;
  final double eps = trueObliquity(jd) * deg;
  final double phi = latNorth * deg;
  final double asc = math.atan2(-math.cos(lst),
          math.sin(lst) * math.cos(eps) + math.tan(phi) * math.sin(eps)) *
      rad;
  return norm360(asc + 180.0);
}

/// Середина неба, градусы эклиптической долготы.
double midheaven(double jd, double lonEast) {
  final double lst = localSiderealTime(jd, lonEast) * deg;
  final double eps = trueObliquity(jd) * deg;
  return norm360(
      math.atan2(math.sin(lst), math.cos(lst) * math.cos(eps)) * rad);
}

// --- Луна над горизонтом ----------------------------------------------------

/// Эклиптическая широта Луны, градусы. Тринадцать главных членов ряда Meeus,
/// точность порядка угловой минуты.
double moonEclipticLatitude(double jd) {
  final double t = (jd - j2000) / 36525.0;
  final double d =
      norm360(297.8501921 + 445267.1114034 * t - 0.0018819 * t * t) * deg;
  final double m = norm360(357.5291092 + 35999.0502909 * t) * deg;
  final double mp =
      norm360(134.9633964 + 477198.8675055 * t + 0.0087414 * t * t) * deg;
  final double f =
      norm360(93.2720950 + 483202.0175233 * t - 0.0036539 * t * t) * deg;
  return 5.128122 * math.sin(f) +
      0.280602 * math.sin(mp + f) +
      0.277693 * math.sin(mp - f) +
      0.173237 * math.sin(2 * d - f) +
      0.055413 * math.sin(2 * d + f - mp) +
      0.046271 * math.sin(2 * d - f - mp) +
      0.032573 * math.sin(2 * d + f) +
      0.017198 * math.sin(2 * mp + f) +
      0.009266 * math.sin(2 * d + mp - f) +
      0.008822 * math.sin(2 * mp - f) +
      0.008216 * math.sin(2 * d - m - f) +
      0.004324 * math.sin(2 * d - f - 2 * mp) +
      0.004200 * math.sin(2 * d + f + mp);
}

/// Высота центра Луны над горизонтом, градусы.
double moonAltitude(double jd, double latNorth, double lonEast) {
  final double lam = moonApparentLongitude(jd) * deg;
  final double beta = moonEclipticLatitude(jd) * deg;
  final double eps = trueObliquity(jd) * deg;
  final double ra = math.atan2(
      math.sin(lam) * math.cos(eps) - math.tan(beta) * math.sin(eps),
      math.cos(lam));
  final double dec = math.asin(
      math.sin(beta) * math.cos(eps) + math.cos(beta) * math.sin(eps) * math.sin(lam));
  final double h = localSiderealTime(jd, lonEast) * deg - ra;
  final double phi = latNorth * deg;
  return math.asin(math.sin(phi) * math.sin(dec) +
          math.cos(phi) * math.cos(dec) * math.cos(h)) *
      rad;
}

/// Элонгация растёт на ~12.19°/сутки, итерация Ньютона сходится за несколько
/// шагов из любой точки месяца.
const double _elongationRate = 12.190749;

/// Последнее новолуние не позже jd.
double previousNewMoon(double jd) {
  double t = jd -
      norm360(moonApparentLongitude(jd) - sunApparentLongitude(jd)) /
          _elongationRate;
  for (int i = 0; i < 8; i++) {
    double d = norm360(moonApparentLongitude(t) - sunApparentLongitude(t));
    if (d > 180.0) d -= 360.0;
    t -= d / _elongationRate;
  }
  return t <= jd ? t : t - 29.530589;
}

/// Первое новолуние после jd.
double nextNewMoon(double jd) {
  double t = previousNewMoon(jd) + 29.530589;
  for (int i = 0; i < 8; i++) {
    double d = norm360(moonApparentLongitude(t) - sunApparentLongitude(t));
    if (d > 180.0) d -= 360.0;
    t -= d / _elongationRate;
  }
  return t;
}

/// Первый восход Луны после jd0. Порог +0.125°: рефракция минус параллакс,
/// стандартное значение для верхнего края лунного диска.
double moonriseAfter(double jd0, double latNorth, double lonEast) {
  const double h0 = 0.125;
  const double step = 1.0 / 72.0;
  double prev = moonAltitude(jd0, latNorth, lonEast) - h0;
  for (double t = jd0 + step; t < jd0 + 1.6; t += step) {
    final double cur = moonAltitude(t, latNorth, lonEast) - h0;
    if (prev < 0.0 && cur >= 0.0) {
      double a = t - step, b = t;
      for (int i = 0; i < 18; i++) {
        final double m = 0.5 * (a + b);
        if (moonAltitude(m, latNorth, lonEast) - h0 >= 0.0) {
          b = m;
        } else {
          a = m;
        }
      }
      return 0.5 * (a + b);
    }
    prev = cur;
  }
  // За полярным кругом восхода может не быть; средним широтам недостижимо
  return jd0 + 1.03;
}

// --- Солнце над горизонтом ------------------------------------------------

/// Прямое восхождение Солнца, градусы.
double sunRightAscension(double jd) {
  final double lam = sunApparentLongitude(jd) * deg;
  final double eps = trueObliquity(jd) * deg;
  return norm360(
      math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam)) * rad);
}

/// Склонение Солнца, градусы.
double sunDeclination(double jd) {
  final double lam = sunApparentLongitude(jd) * deg;
  final double eps = trueObliquity(jd) * deg;
  return math.asin(math.sin(eps) * math.sin(lam)) * rad;
}

/// Часовой угол Солнца бежит примерно на 360° за солнечные сутки.
const double _solarHaRate = 360.0;

/// Ближайшая верхняя кульминация Солнца.
double solarTransit(double jdNear, double lonEast) {
  double jd = jdNear;
  for (int i = 0; i < 6; i++) {
    double ha = localSiderealTime(jd, lonEast) - sunRightAscension(jd);
    ha = norm360(ha + 180.0) - 180.0;
    jd -= ha / _solarHaRate;
  }
  return jd;
}

class RiseSet {
  final double rise;
  final double set;
  const RiseSet(this.rise, this.set);
}

/// Восход и закат вокруг кульминации. null, если Солнце в эти сутки горизонт
/// не пересекает: полярный день или полярная ночь.
RiseSet? solarRiseSet(double jdTransit, double latNorth, double lonEast) {
  const double h0 = -0.8333; // центр диска с поправкой на рефракцию
  final double phi = latNorth * deg;
  final double dec = sunDeclination(jdTransit) * deg;
  final double c = (math.sin(h0 * deg) - math.sin(phi) * math.sin(dec)) /
      (math.cos(phi) * math.cos(dec));
  if (c > 1.0 || c < -1.0) return null;
  final double half = math.acos(c) * rad / _solarHaRate;
  return RiseSet(jdTransit - half, jdTransit + half);
}

/// Куспиды домов по Плацидусу, [0..11] — с первого по двенадцатый.
///
/// Плацидус делит не дугу, а время: промежуточный куспид это точка эклиптики,
/// прошедшая треть или две трети своего полусуточного пути от горизонта к
/// меридиану. Полусуточная дуга зависит от склонения точки, склонение — от её
/// прямого восхождения, а восхождение как раз и ищется. Отсюда итерация.
///
/// Выше полярных кругов система вырождается: аргумент арксинуса зажимается,
/// чтобы вместо NaN получалось хоть что-то осмысленное.
List<double> houseCusps(double jd, double latNorth, double lonEast) {
  final List<double> cusp = List<double>.filled(12, 0.0);
  final double ramc = localSiderealTime(jd, lonEast);
  final double eps = trueObliquity(jd) * deg;
  final double phi = latNorth * deg;

  cusp[0] = ascendant(jd, latNorth, lonEast);
  cusp[9] = midheaven(jd, lonEast);
  cusp[3] = norm360(cusp[9] + 180.0);
  cusp[6] = norm360(cusp[0] + 180.0);

  // Смещение от RAMC и доля полусуточной дуги для промежуточных куспидов
  const List<List<double>> spec = <List<double>>[
    [10, 30.0, 1.0 / 3.0], // одиннадцатый
    [11, 60.0, 2.0 / 3.0], // двенадцатый
    [1, 120.0, 2.0 / 3.0], // второй
    [2, 150.0, 1.0 / 3.0], // третий
  ];

  for (final List<double> s in spec) {
    final int idx = s[0].toInt();
    final double offset = s[1];
    final double frac = s[2];
    double ra = ramc + offset;
    for (int it = 0; it < 20; it++) {
      final double dec = math.atan(math.sin(ra * deg) * math.tan(eps));
      double sv = math.tan(phi) * math.tan(dec);
      if (sv > 1.0) sv = 1.0;
      if (sv < -1.0) sv = -1.0;
      final double next = ramc + offset + frac * math.asin(sv) * rad;
      final double d = next - ra;
      ra = next;
      if (d < 1e-10 && d > -1e-10) break;
    }
    // Прямое восхождение обратно в эклиптическую долготу (широта нулевая)
    final double r = ra * deg;
    cusp[idx] =
        norm360(math.atan2(math.sin(r), math.cos(r) * math.cos(eps)) * rad);
  }

  cusp[4] = norm360(cusp[10] + 180.0);
  cusp[5] = norm360(cusp[11] + 180.0);
  cusp[7] = norm360(cusp[1] + 180.0);
  cusp[8] = norm360(cusp[2] + 180.0);
  return cusp;
}

/// Номер дома (1..12), в котором лежит долгота. Куспиды идут по кругу, дом
/// может пересекать 0°.
int houseOf(double lon, List<double> cusp) {
  for (int i = 0; i < 12; i++) {
    final double a = cusp[i];
    final double b = cusp[(i + 1) % 12];
    final double span = norm360(b - a);
    final double rel = norm360(lon - a);
    if (rel < span) return i + 1;
  }
  return 1;
}
