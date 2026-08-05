// Дамп расчёта прошивки на сетке дат. Формат совпадает с
// mobile/tool/dump_grid.dart: этим сверяется, что порт на Dart считает ровно
// то же, что уходит в образ.
//
//   ./grid_dump [count] [step] [startJD] [lat] [lon] [slow]
//
// Шестой аргумент `slow` добавляет к каждой точке лунные сутки и Луну без
// курса. По умолчанию их нет: одна такая точка стоит трёх десятков поисков
// восхода Луны, и на сетке в двести пятьдесят дат сверка встала бы намертво.

#include <cstdio>
#include <cstdlib>
#include <cstring>

#include "../src/ephemeris.h"
#include "../src/lunar.h"
#include "../src/transits.h"

int main(int argc, char** argv) {
  int count = (argc > 1) ? atoi(argv[1]) : 200;
  double step = (argc > 2) ? atof(argv[2]) : 173.7;
  double start = (argc > 3) ? atof(argv[3]) : 2435108.5;
  double lat = (argc > 4) ? atof(argv[4]) : 55.7558;
  double lon = (argc > 5) ? atof(argv[5]) : 37.6173;
  bool slow = (argc > 6) && strcmp(argv[6], "slow") == 0;

  for (int i = 0; i < count; i++) {
    double jd = start + i * step;
    printf("JD %.9f\n", jd);
    for (int b = 0; b < ephem::BODY_COUNT; b++)
      printf("L %d %.9f %.9f\n", b, ephem::longitude((ephem::Body)b, jd),
             ephem::speed((ephem::Body)b, jd));
    printf("ASC %.9f\n", ephem::ascendant(jd, lat, lon));
    printf("MC %.9f\n", ephem::midheaven(jd, lon));
    double cusp[12];
    ephem::houseCusps(jd, lat, lon, cusp);
    for (int c = 0; c < 12; c++) printf("C %d %.9f\n", c, cusp[c]);
    if (slow) {
      lunar::Day d = lunar::compute(jd, lat, lon);
      printf("LD %d %.9f %.9f %d %.9f\n", d.number, d.startJD, d.endJD,
             d.moonSign, d.phase);
      printf("VOID %d\n", transit::moonIsVoid(jd) ? 1 : 0);
    }
  }
  return 0;
}
