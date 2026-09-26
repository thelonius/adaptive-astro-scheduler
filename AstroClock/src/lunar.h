#pragma once
// Лунные сутки. Первый день месяца идёт от новолуния до первого восхода Луны,
// каждый следующий — от восхода до восхода. Дней получается 29 или 30;
// тридцатый, когда случается, обрезается новолунием.

#include "ephemeris.h"

namespace lunar {

struct Day {
  int number;      // 1..30
  double startJD;
  double endJD;
  int moonSign;    // знак Луны в запрошенный момент
  float phase;     // освещённость диска, 0..1
};

// Считает с нуля, без кэша: до трёх десятков поисков восхода. На ESP32-C3
// без FPU это сотни миллисекунд, поэтому вызывающий обязан кэшировать
// результат и пересчитывать только при выходе jd за [startJD, endJD).
inline Day compute(double jd, double lat, double lonEast) {
  double nm = ephem::previousNewMoon(jd);
  double nmNext = ephem::nextNewMoon(jd);

  int n = 1;
  double start = nm;
  double rise = ephem::moonriseAfter(nm, lat, lonEast);
  while (rise <= jd && n < 30) {
    n++;
    start = rise;
    // Между восходами 24ч49м плюс-минус полчаса, окно поиска сужено
    rise = ephem::moonriseAfter(rise + 0.8, lat, lonEast);
  }

  Day d;
  d.number = n;
  d.startJD = start;
  d.endJD = rise < nmNext ? rise : nmNext;
  d.moonSign = (int)(ephem::longitude(ephem::MOON, jd) / 30.0);
  d.phase = (float)ephem::moonIllumination(jd);
  return d;
}

// Следующие лунные сутки после уже посчитанных d, вплоть до тех, что
// содержат jd (jd >= d.endJD). Сутки начинаются ровно там, где кончились
// предыдущие, поэтому на каждый шаг нужен один поиск восхода, а не весь путь
// от новолуния: листание календаря вперёд перестаёт стоить секунду на день.
// Совпадение с compute() проверено на хосте, см. test/lunar_advance_check.cpp
inline Day advance(Day d, double jd, double lat, double lonEast) {
  while (jd >= d.endJD) {
    double start = d.endJD;
    // Новолуние, которым кончается текущий месяц, ищется от конца суток чуть
    // назад, а не от их начала: у первых суток начало и есть новолуние, и
    // nextNewMoon() на нулевой элонгации возвращал его же вместо следующего,
    // отчего первые сутки месяца шли дважды
    double nmNext = ephem::nextNewMoon(d.endJD - 1e-3);
    int n;
    double rise;
    // Сутки, оборванные новолунием, сменяются первыми: они идут от
    // новолуния до первого восхода
    if (start >= nmNext - 1e-6) {
      n = 1;
      nmNext = ephem::nextNewMoon(start + 1.0);
      rise = ephem::moonriseAfter(start, lat, lonEast);
    } else {
      n = d.number + 1;
      if (n > 30) return compute(jd, lat, lonEast);
      rise = ephem::moonriseAfter(start + 0.8, lat, lonEast);
    }
    d.number = n;
    d.startJD = start;
    d.endJD = (n < 30 && rise < nmNext) ? rise : nmNext;
  }
  d.moonSign = (int)(ephem::longitude(ephem::MOON, jd) / 30.0);
  d.phase = (float)ephem::moonIllumination(jd);
  return d;
}

// Весь лунный месяц разом: начала всех суток от новолуния до следующего.
// Считается около секунды (до тридцати поисков восхода), зато потом любой
// день месяца достаётся без счёта, и листать календарь можно в обе стороны.
// Граница суток та же, что в compute(), это сверено на хосте
// (test/lunar_month_check.cpp)
struct Month {
  double nm = 0, nmNext = 0;
  int count = 0;       // сколько суток в месяце, 29 или 30
  double start[31];    // начало суток n хранится в start[n-1]
};

// pause вызывается между поисками восхода: в фоновой задаче прошивки он
// отдаёт ядро, иначе секунда счёта подряд будит сторожевой таймер ядра
inline Month computeMonth(double jd, double lat, double lonEast, void (*pause)() = nullptr) {
  Month m;
  m.nm = ephem::previousNewMoon(jd);
  m.nmNext = ephem::nextNewMoon(jd);
  m.start[0] = m.nm;
  m.count = 1;
  double rise = ephem::moonriseAfter(m.nm, lat, lonEast);
  while (rise < m.nmNext && m.count < 30) {
    m.start[m.count++] = rise;
    if (pause) pause();
    rise = ephem::moonriseAfter(rise + 0.8, lat, lonEast);
  }
  return m;
}

inline bool contains(const Month& m, double jd) { return m.count > 0 && jd >= m.nm && jd < m.nmNext; }

// Сутки из готового месяца. jd обязан лежать внутри него
inline Day dayOf(const Month& m, double jd) {
  int i = m.count - 1;
  while (i > 0 && jd < m.start[i]) i--;
  Day d;
  d.number = i + 1;
  d.startJD = m.start[i];
  d.endJD = (i + 1 < m.count) ? m.start[i + 1] : m.nmNext;
  d.moonSign = (int)(ephem::longitude(ephem::MOON, jd) / 30.0);
  d.phase = (float)ephem::moonIllumination(jd);
  return d;
}

}  // namespace lunar
