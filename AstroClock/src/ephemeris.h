#pragma once
// Автономные эфемериды: видимые геоцентрические эклиптические долготы на дату.
// Сети и файлов данных не требует, всё считается на месте.
//
// Планеты — метод Standish (JPL, приближённые кеплеровы элементы с вековыми
// скоростями), полная трёхмерная задача с наклонением и узлом. Плоская
// проекция на эклиптику, как в astro-palette, даёт по Марсу больше градуса и
// разваливается на Плутоне с его наклонением 17°.
//
// Солнце и Луна — ряды Meeus напрямую в геоцентрике.
//
// Заголовок намеренно не зависит от Arduino: тот же код собирается на хосте и
// сверяется со swisseph (см. test/).

#include <math.h>

namespace ephem {

enum Body {
  SUN = 0, MOON, MERCURY, VENUS, MARS,
  JUPITER, SATURN, URANUS, NEPTUNE, PLUTO,
  BODY_COUNT
};

constexpr double J2000 = 2451545.0;
constexpr double DEG = 0.017453292519943295;  // рад в градусе
constexpr double RAD = 57.29577951308232;     // градусов в радиане

inline double norm360(double x) {
  x = fmod(x, 360.0);
  return x < 0 ? x + 360.0 : x;
}

// Разность углов, приведённая к (-180, 180].
inline double angleDiff(double a, double b) {
  double d = fmod(a - b + 180.0, 360.0);
  if (d < 0) d += 360.0;
  return d - 180.0;
}

inline double julianDayFromUnix(long long unixSeconds) {
  return unixSeconds / 86400.0 + 2440587.5;
}

// --- нутация и наклон эклиптики -------------------------------------------

// Нутация по долготе, градусы. Четыре главных члена, остаток меньше 0.5".
inline double nutationInLongitude(double jd) {
  double T = (jd - J2000) / 36525.0;
  double Om = (125.04452 - 1934.136261 * T) * DEG;
  double L = (280.4665 + 36000.7698 * T) * DEG;
  double Lp = (218.3165 + 481267.8813 * T) * DEG;
  double dpsi = -17.20 * sin(Om) - 1.32 * sin(2 * L)
                - 0.23 * sin(2 * Lp) + 0.21 * sin(2 * Om);
  return dpsi / 3600.0;
}

// Средний наклон эклиптики, градусы.
inline double meanObliquity(double jd) {
  double T = (jd - J2000) / 36525.0;
  return 23.439291111 - 0.0130041667 * T - 1.638889e-7 * T * T
         + 5.036111e-7 * T * T * T;
}

inline double trueObliquity(double jd) {
  double T = (jd - J2000) / 36525.0;
  double Om = (125.04452 - 1934.136261 * T) * DEG;
  double L = (280.4665 + 36000.7698 * T) * DEG;
  double Lp = (218.3165 + 481267.8813 * T) * DEG;
  double deps = 9.20 * cos(Om) + 0.57 * cos(2 * L)
                + 0.10 * cos(2 * Lp) - 0.09 * cos(2 * Om);
  return meanObliquity(jd) + deps / 3600.0;
}

// Общая прецессия по долготе от J2000 к эклиптике даты, градусы.
inline double precessionFromJ2000(double jd) {
  double T = (jd - J2000) / 36525.0;
  return (5028.796195 * T + 1.1054348 * T * T) / 3600.0;
}

// --- Солнце (Meeus, гл. 25) -----------------------------------------------

// Видимая долгота Солнца с учётом нутации и аберрации.
inline double sunApparentLongitude(double jd) {
  double T = (jd - J2000) / 36525.0;
  double L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  double M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  double C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
             + (0.019993 - 0.000101 * T) * sin(2 * M)
             + 0.000289 * sin(3 * M);
  double trueLong = L0 + C;
  double Om = (125.04 - 1934.136 * T) * DEG;
  // -0.00569° — аберрация, -0.00478 sin Ω — нутация в упрощённой форме
  return norm360(trueLong - 0.00569 - 0.00478 * sin(Om));
}

// Расстояние до Солнца, а.е. Нужно для фазы Луны и светового запаздывания.
inline double sunRadiusVector(double jd) {
  double T = (jd - J2000) / 36525.0;
  double M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  double e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  double C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
             + (0.019993 - 0.000101 * T) * sin(2 * M)
             + 0.000289 * sin(3 * M);
  double nu = M + C * DEG;
  return 1.000001018 * (1 - e * e) / (1 + e * cos(nu));
}

// --- Луна (Meeus, гл. 47) --------------------------------------------------

struct MoonTerm { int8_t d, m, mp, f; int32_t l; };

// Ряд Σl, коэффициенты в 1e-6 градуса. Усечён на членах меньше 300e-6:
// остаток ряда даёт вклад в пределах 0.001°, что на порядок ниже нужного.
inline const MoonTerm* moonTerms(int& count) {
  static const MoonTerm T[] = {
    { 0, 0,  1,  0, 6288774}, { 2, 0, -1,  0, 1274027},
    { 2, 0,  0,  0,  658314}, { 0, 0,  2,  0,  213618},
    { 0, 1,  0,  0, -185116}, { 0, 0,  0,  2, -114332},
    { 2, 0, -2,  0,   58793}, { 2,-1, -1,  0,   57066},
    { 2, 0,  1,  0,   53322}, { 2,-1,  0,  0,   45758},
    { 0, 1, -1,  0,  -40923}, { 1, 0,  0,  0,  -34720},
    { 0, 1,  1,  0,  -30383}, { 2, 0,  0, -2,   15327},
    { 0, 0,  1,  2,  -12528}, { 0, 0,  1, -2,   10980},
    { 4, 0, -1,  0,   10675}, { 0, 0,  3,  0,   10034},
    { 4, 0, -2,  0,    8548}, { 2, 1, -1,  0,   -7888},
    { 2, 1,  0,  0,   -6766}, { 1, 0, -1,  0,   -5163},
    { 1, 1,  0,  0,    4987}, { 2,-1,  1,  0,    4036},
    { 2, 0,  2,  0,    3994}, { 4, 0,  0,  0,    3861},
    { 2, 0, -3,  0,    3665}, { 0, 1, -2,  0,   -2689},
    { 2, 0, -1,  2,   -2602}, { 2,-1, -2,  0,    2390},
    { 1, 0,  1,  0,   -2348}, { 2,-2,  0,  0,    2236},
    { 0, 1,  2,  0,   -2120}, { 0, 2,  0,  0,   -2069},
    { 2,-2, -1,  0,    2048}, { 2, 0,  1, -2,   -1773},
    { 2, 0,  0,  2,   -1595}, { 4,-1, -1,  0,    1215},
    { 0, 0,  2,  2,   -1110}, { 3, 0, -1,  0,    -892},
    { 2, 1,  1,  0,    -810}, { 4,-1, -2,  0,     759},
    { 0, 2, -1,  0,    -713}, { 2, 2, -1,  0,    -700},
    { 2, 1, -2,  0,     691}, { 2,-1,  0, -2,     596},
    { 4, 0,  1,  0,     549}, { 0, 0,  4,  0,     537},
    { 4,-1,  0,  0,     520}, { 1, 0, -2,  0,    -487},
    { 2, 1,  0, -2,    -399}, { 0, 0,  2, -2,    -381},
    { 1, 1,  1,  0,     351}, { 3, 0, -2,  0,    -340},
    { 4, 0, -3,  0,     330}, { 2,-1,  2,  0,     327},
    { 0, 2,  1,  0,    -323}, { 1, 1, -1,  0,     299},
    { 2, 0,  3,  0,     294},
  };
  count = sizeof(T) / sizeof(T[0]);
  return T;
}

// Видимая геоцентрическая долгота Луны.
inline double moonApparentLongitude(double jd) {
  double T = (jd - J2000) / 36525.0;
  double T2 = T * T, T3 = T2 * T, T4 = T3 * T;

  double Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2
              + T3 / 538841.0 - T4 / 65194000.0;
  double D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2
             + T3 / 545868.0 - T4 / 113065000.0;
  double M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000.0;
  double Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2
              + T3 / 69699.0 - T4 / 14712000.0;
  double F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2
             - T3 / 3526000.0 + T4 / 863310000.0;

  double A1 = 119.75 + 131.849 * T;
  double A2 = 53.09 + 479264.290 * T;
  // Эксцентриситет земной орбиты: члены с M и 2M ослабевают со временем
  double E = 1.0 - 0.002516 * T - 0.0000074 * T2;

  int n;
  const MoonTerm* terms = moonTerms(n);
  double sigmaL = 0.0;
  for (int i = 0; i < n; i++) {
    const MoonTerm& t = terms[i];
    double arg = (t.d * D + t.m * M + t.mp * Mp + t.f * F) * DEG;
    double coeff = t.l;
    int am = t.m < 0 ? -t.m : t.m;
    if (am == 1) coeff *= E;
    else if (am == 2) coeff *= E * E;
    sigmaL += coeff * sin(arg);
  }
  // Аддитивные поправки: Венера, Юпитер и уплощение Земли
  sigmaL += 3958.0 * sin(A1 * DEG)
            + 1962.0 * sin((Lp - F) * DEG)
            + 318.0 * sin(A2 * DEG);

  return norm360(Lp + sigmaL / 1000000.0 + nutationInLongitude(jd));
}

// --- планеты (Standish, JPL approximate elements) --------------------------

struct KeplerElements {
  double a, e, I, L, varpi, Om;        // на эпоху J2000
  double da, de, dI, dL, dvarpi, dOm;  // скорости за юлианское столетие
};

// Таблица для интервала 1800–2050. Элементы в а.е. и градусах.
inline const KeplerElements* keplerTable() {
  static const KeplerElements K[] = {
    // Меркурий
    {0.38709927, 0.20563593,  7.00497902, 252.25032350,  77.45779628,  48.33076593,
     0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081},
    // Венера
    {0.72333566, 0.00677672,  3.39467605, 181.97909950, 131.60246718,  76.67984255,
     0.00000390,-0.00004107, -0.00078890,  58517.81538729, 0.00268329, -0.27769418},
    // Земля / барицентр системы Земля-Луна
    {1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193,   0.0,
     0.00000562,-0.00004392, -0.01294668,  35999.37244981, 0.32327364,  0.0},
    // Марс
    {1.52371034, 0.09339410,  1.84969142,  -4.55343205, -23.94362959,  49.55953891,
     0.00001847, 0.00007882, -0.00813131,  19140.30268499, 0.44441088, -0.29257343},
    // Юпитер
    {5.20288700, 0.04838624,  1.30439695,  34.39644051,  14.72847983, 100.47390909,
    -0.00011607,-0.00013253, -0.00183714,   3034.74612775, 0.21252668,  0.20469106},
    // Сатурн
    {9.53667594, 0.05386179,  2.48599187,  49.95424423,  92.59887831, 113.66242448,
    -0.00125060,-0.00050991,  0.00193609,   1222.49362201,-0.41897216, -0.28867794},
    // Уран
    {19.18916464,0.04725744,  0.77263783, 313.23810451, 170.95427630,  74.01692503,
    -0.00196176,-0.00004397, -0.00242939,    428.48202785, 0.40805281,  0.04240589},
    // Нептун
    {30.06992276,0.00859048,  1.77004347, -55.12002969,  44.96476227, 131.78422574,
     0.00026291, 0.00005105,  0.00035372,    218.45945325,-0.32241464, -0.00508664},
    // Плутон
    {39.48211675,0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684,
    -0.00031596, 0.00005170,  0.00004818,    145.20780515,-0.04062942, -0.01183482},
  };
  return K;
}

struct Vec3 { double x, y, z; };

// Гелиоцентрические прямоугольные координаты в эклиптике J2000.
inline Vec3 heliocentricJ2000(int idx, double jd) {
  const KeplerElements& k = keplerTable()[idx];
  double T = (jd - J2000) / 36525.0;

  double a = k.a + k.da * T;
  double e = k.e + k.de * T;
  double I = (k.I + k.dI * T) * DEG;
  double L = k.L + k.dL * T;
  double varpi = k.varpi + k.dvarpi * T;
  double Om = (k.Om + k.dOm * T) * DEG;

  double omega = varpi * DEG - Om;
  double M = norm360(L - varpi);
  if (M > 180.0) M -= 360.0;
  M *= DEG;

  // Кеплер: E - e sin E = M. Ньютон сходится за 4 итерации даже на Плутоне.
  double E = M + e * sin(M);
  for (int i = 0; i < 6; i++) {
    double dM = M - (E - e * sin(E));
    double dE = dM / (1.0 - e * cos(E));
    E += dE;
    if (dE < 1e-12 && dE > -1e-12) break;
  }

  double xp = a * (cos(E) - e);
  double yp = a * sqrt(1.0 - e * e) * sin(E);

  double co = cos(omega), so = sin(omega);
  double cO = cos(Om), sO = sin(Om);
  double cI = cos(I), sI = sin(I);

  Vec3 v;
  v.x = (co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp;
  v.y = (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp;
  v.z = (so * sI) * xp + (co * sI) * yp;
  return v;
}

// Индекс в таблице Кеплера по Body. Земля стоит третьей и телом не является.
inline int keplerIndex(Body b) {
  switch (b) {
    case MERCURY: return 0;
    case VENUS:   return 1;
    case MARS:    return 3;
    case JUPITER: return 4;
    case SATURN:  return 5;
    case URANUS:  return 6;
    case NEPTUNE: return 7;
    case PLUTO:   return 8;
    default:      return -1;
  }
}

constexpr int EARTH_INDEX = 2;
constexpr double LIGHT_DAYS_PER_AU = 0.005775518;

// Видимая геоцентрическая долгота планеты на эклиптику даты.
inline double planetApparentLongitude(Body b, double jd) {
  int idx = keplerIndex(b);
  Vec3 earth = heliocentricJ2000(EARTH_INDEX, jd);
  Vec3 p = heliocentricJ2000(idx, jd);

  // Световое запаздывание: одна итерация уносит ошибку ниже угловой секунды
  double dx = p.x - earth.x, dy = p.y - earth.y, dz = p.z - earth.z;
  double dist = sqrt(dx * dx + dy * dy + dz * dz);
  p = heliocentricJ2000(idx, jd - dist * LIGHT_DAYS_PER_AU);
  dx = p.x - earth.x;
  dy = p.y - earth.y;

  double lonJ2000 = atan2(dy, dx) * RAD;
  return norm360(lonJ2000 + precessionFromJ2000(jd) + nutationInLongitude(jd));
}

// --- общий вход ------------------------------------------------------------

// Видимая геоцентрическая эклиптическая долгота тела, градусы.
inline double longitude(Body b, double jd) {
  if (b == SUN) return sunApparentLongitude(jd);
  if (b == MOON) return moonApparentLongitude(jd);
  return planetApparentLongitude(b, jd);
}

// Скорость по долготе, градусов в сутки. Отрицательная — ретроградность.
inline double speed(Body b, double jd) {
  double h = (b == MOON) ? 0.05 : 0.5;
  return angleDiff(longitude(b, jd + h), longitude(b, jd - h)) / (2 * h);
}

inline bool isRetrograde(Body b, double jd) {
  return b != SUN && b != MOON && speed(b, jd) < 0.0;
}

// Освещённая доля диска Луны, 0..1.
inline double moonIllumination(double jd) {
  double elong = angleDiff(moonApparentLongitude(jd), sunApparentLongitude(jd));
  return (1.0 - cos(elong * DEG)) / 2.0;
}

// Растёт ли Луна.
inline bool moonWaxing(double jd) {
  double elong = norm360(moonApparentLongitude(jd) - sunApparentLongitude(jd));
  return elong < 180.0;
}

// --- дома ------------------------------------------------------------------

// Среднее звёздное время по Гринвичу, градусы.
inline double greenwichSiderealTime(double jd) {
  double T = (jd - J2000) / 36525.0;
  double gst = 280.46061837 + 360.98564736629 * (jd - J2000)
               + 0.000387933 * T * T - T * T * T / 38710000.0;
  return norm360(gst);
}

// Истинное местное звёздное время с учётом нутации, градусы.
inline double localSiderealTime(double jd, double lonEast) {
  double eq = nutationInLongitude(jd) * cos(trueObliquity(jd) * DEG);
  return norm360(greenwichSiderealTime(jd) + eq + lonEast);
}

// Асцендент, градусы эклиптической долготы.
inline double ascendant(double jd, double latNorth, double lonEast) {
  double lst = localSiderealTime(jd, lonEast) * DEG;
  double eps = trueObliquity(jd) * DEG;
  double phi = latNorth * DEG;
  double asc = atan2(-cos(lst), sin(lst) * cos(eps) + tan(phi) * sin(eps)) * RAD;
  return norm360(asc + 180.0);
}

// Середина неба, градусы эклиптической долготы.
inline double midheaven(double jd, double lonEast) {
  double lst = localSiderealTime(jd, lonEast) * DEG;
  double eps = trueObliquity(jd) * DEG;
  return norm360(atan2(sin(lst), cos(lst) * cos(eps)) * RAD);
}

// --- Луна над горизонтом ----------------------------------------------------

// Эклиптическая широта Луны, градусы. Тринадцать главных членов ряда Meeus,
// точность порядка угловой минуты — для времени восхода это меньше десяти
// секунд ошибки.
inline double moonEclipticLatitude(double jd) {
  double T = (jd - J2000) / 36525.0;
  double D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * DEG;
  double M = norm360(357.5291092 + 35999.0502909 * T) * DEG;
  double Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * DEG;
  double F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) * DEG;
  return 5.128122 * sin(F)
       + 0.280602 * sin(Mp + F)
       + 0.277693 * sin(Mp - F)
       + 0.173237 * sin(2 * D - F)
       + 0.055413 * sin(2 * D + F - Mp)
       + 0.046271 * sin(2 * D - F - Mp)
       + 0.032573 * sin(2 * D + F)
       + 0.017198 * sin(2 * Mp + F)
       + 0.009266 * sin(2 * D + Mp - F)
       + 0.008822 * sin(2 * Mp - F)
       + 0.008216 * sin(2 * D - M - F)
       + 0.004324 * sin(2 * D - F - 2 * Mp)
       + 0.004200 * sin(2 * D + F + Mp);
}

// Высота центра Луны над горизонтом, градусы.
inline double moonAltitude(double jd, double latNorth, double lonEast) {
  double lam = moonApparentLongitude(jd) * DEG;
  double beta = moonEclipticLatitude(jd) * DEG;
  double eps = trueObliquity(jd) * DEG;
  double ra = atan2(sin(lam) * cos(eps) - tan(beta) * sin(eps), cos(lam));
  double dec = asin(sin(beta) * cos(eps) + cos(beta) * sin(eps) * sin(lam));
  double H = localSiderealTime(jd, lonEast) * DEG - ra;
  double phi = latNorth * DEG;
  return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)) * RAD;
}

// Элонгация растёт на ~12.19°/сутки, итерация Ньютона сходится за несколько
// шагов из любой точки месяца.
constexpr double ELONGATION_RATE = 12.190749;

// Последнее новолуние не позже jd.
inline double previousNewMoon(double jd) {
  double t = jd - norm360(moonApparentLongitude(jd) - sunApparentLongitude(jd))
                      / ELONGATION_RATE;
  for (int i = 0; i < 8; i++) {
    double d = norm360(moonApparentLongitude(t) - sunApparentLongitude(t));
    if (d > 180.0) d -= 360.0;
    t -= d / ELONGATION_RATE;
  }
  return t <= jd ? t : t - 29.530589;
}

// Первое новолуние после jd.
inline double nextNewMoon(double jd) {
  double t = previousNewMoon(jd) + 29.530589;
  for (int i = 0; i < 8; i++) {
    double d = norm360(moonApparentLongitude(t) - sunApparentLongitude(t));
    if (d > 180.0) d -= 360.0;
    t -= d / ELONGATION_RATE;
  }
  return t;
}

// Первый восход Луны после jd0. Порог +0.125°: рефракция минус параллакс,
// стандартное значение для верхнего края лунного диска. Ищется сканированием
// по 20 минут и добивается бисекцией; окно 1.6 суток покрывает интервал между
// восходами с запасом.
inline double moonriseAfter(double jd0, double latNorth, double lonEast) {
  const double H0 = 0.125;
  const double STEP = 1.0 / 72.0;
  double prev = moonAltitude(jd0, latNorth, lonEast) - H0;
  for (double t = jd0 + STEP; t < jd0 + 1.6; t += STEP) {
    double cur = moonAltitude(t, latNorth, lonEast) - H0;
    if (prev < 0.0 && cur >= 0.0) {
      double a = t - STEP, b = t;
      for (int i = 0; i < 18; i++) {
        double m = 0.5 * (a + b);
        if (moonAltitude(m, latNorth, lonEast) - H0 >= 0.0) b = m;
        else a = m;
      }
      return 0.5 * (a + b);
    }
    prev = cur;
  }
  // За полярным кругом восхода может не быть; средним широтам недостижимо
  return jd0 + 1.03;
}

// --- Солнце над горизонтом ------------------------------------------------

// Прямое восхождение Солнца, градусы.
inline double sunRightAscension(double jd) {
  double lam = sunApparentLongitude(jd) * DEG;
  double eps = trueObliquity(jd) * DEG;
  return norm360(atan2(cos(eps) * sin(lam), cos(lam)) * RAD);
}

// Склонение Солнца, градусы.
inline double sunDeclination(double jd) {
  double lam = sunApparentLongitude(jd) * DEG;
  double eps = trueObliquity(jd) * DEG;
  return asin(sin(eps) * sin(lam)) * RAD;
}

// Часовой угол Солнца бежит примерно на 360° за солнечные сутки: звёздное
// время уходит вперёд на 360.9856°, но и само Солнце смещается по эклиптике
// почти на градус за то же время.
constexpr double SOLAR_HA_RATE = 360.0;

// Ближайшая верхняя кульминация Солнца.
inline double solarTransit(double jdNear, double lonEast) {
  double jd = jdNear;
  for (int i = 0; i < 6; i++) {
    double ha = localSiderealTime(jd, lonEast) - sunRightAscension(jd);
    ha = norm360(ha + 180.0) - 180.0;
    jd -= ha / SOLAR_HA_RATE;
  }
  return jd;
}

// Восход и закат вокруг кульминации. Ложь, если Солнце в эти сутки горизонт
// не пересекает: полярный день или полярная ночь.
inline bool solarRiseSet(double jdTransit, double latNorth, double lonEast,
                         double* rise, double* set) {
  const double H0 = -0.8333;  // центр диска с поправкой на рефракцию
  double phi = latNorth * DEG;
  double dec = sunDeclination(jdTransit) * DEG;
  double c = (sin(H0 * DEG) - sin(phi) * sin(dec)) / (cos(phi) * cos(dec));
  if (c > 1.0 || c < -1.0) return false;
  double half = acos(c) * RAD / SOLAR_HA_RATE;
  *rise = jdTransit - half;
  *set = jdTransit + half;
  return true;
}

// Куспиды домов по Плацидусу, cusp[0..11] — с первого по двенадцатый.
//
// Плацидус делит не дугу, а время: промежуточный куспид это точка эклиптики,
// прошедшая треть или две трети своего полусуточного пути от горизонта к
// меридиану. Полусуточная дуга зависит от склонения точки, склонение — от её
// прямого восхождения, а восхождение как раз и ищется. Отсюда итерация.
//
// Выше полярных кругов система вырождается: полусуточной дуги у приполярных
// градусов нет. Аргумент арксинуса зажимается, чтобы вместо NaN получалось
// хоть что-то осмысленное.
inline void houseCusps(double jd, double latNorth, double lonEast, double* cusp) {
  double ramc = localSiderealTime(jd, lonEast);
  double eps = trueObliquity(jd) * DEG;
  double phi = latNorth * DEG;

  cusp[0] = ascendant(jd, latNorth, lonEast);
  cusp[9] = midheaven(jd, lonEast);
  cusp[3] = norm360(cusp[9] + 180.0);
  cusp[6] = norm360(cusp[0] + 180.0);

  // Смещение от RAMC и доля полусуточной дуги для промежуточных куспидов
  struct Spec { int idx; double offset; double frac; };
  static const Spec SPEC[4] = {
    {10,  30.0, 1.0 / 3.0},  // одиннадцатый
    {11,  60.0, 2.0 / 3.0},  // двенадцатый
    { 1, 120.0, 2.0 / 3.0},  // второй
    { 2, 150.0, 1.0 / 3.0},  // третий
  };

  for (int i = 0; i < 4; i++) {
    double ra = ramc + SPEC[i].offset;
    for (int it = 0; it < 20; it++) {
      double dec = atan(sin(ra * DEG) * tan(eps));
      double s = tan(phi) * tan(dec);
      if (s > 1.0) s = 1.0;
      if (s < -1.0) s = -1.0;
      double next = ramc + SPEC[i].offset + SPEC[i].frac * asin(s) * RAD;
      double d = next - ra;
      ra = next;
      if (d < 1e-10 && d > -1e-10) break;
    }
    // Прямое восхождение обратно в эклиптическую долготу (широта нулевая)
    double r = ra * DEG;
    cusp[SPEC[i].idx] = norm360(atan2(sin(r), cos(r) * cos(eps)) * RAD);
  }

  cusp[4] = norm360(cusp[10] + 180.0);
  cusp[5] = norm360(cusp[11] + 180.0);
  cusp[7] = norm360(cusp[1] + 180.0);
  cusp[8] = norm360(cusp[2] + 180.0);
}

}  // namespace ephem
