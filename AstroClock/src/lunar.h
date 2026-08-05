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

}  // namespace lunar
