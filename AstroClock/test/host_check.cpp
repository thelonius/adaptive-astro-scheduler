// Хост-проверка: та же логика, что в прошивке, но с выводом в текст.
// Сверяется со swisseph скриптом test/compare_with_swisseph.py.
#include <cstdio>
#include <cstdlib>

#include "../src/config.h"
#include "../src/ephemeris.h"
#include "../src/transits.h"

int main(int argc, char** argv) {
  double nowJD = (argc > 1) ? atof(argv[1]) : 2461248.0;
  double natalJD = config::natalJulianDay();

  printf("NATAL_JD %.9f\n", natalJD);
  transit::NatalChart natal;
  natal.compute(natalJD, NATAL_LAT, NATAL_LON);
  for (int p = 0; p < transit::NATAL_POINTS; p++)
    printf("NATAL %d %.6f\n", p, natal.lon[p]);

  printf("NOW_JD %.9f\n", nowJD);
  for (int b = 0; b < ephem::BODY_COUNT; b++)
    printf("TRANSIT %d %.6f %.6f\n", b, ephem::longitude((ephem::Body)b, nowJD),
           ephem::speed((ephem::Body)b, nowJD));
  printf("ASC %.6f\nMC %.6f\n", ephem::ascendant(nowJD, HOME_LAT, HOME_LON),
         ephem::midheaven(nowJD, HOME_LON));
  printf("VOID %d\n", transit::moonIsVoid(nowJD) ? 1 : 0);

  transit::Hit hits[24];
  int n = transit::find(natal, nowJD, hits, 24);
  for (int i = 0; i < n; i++)
    printf("HIT %d %d %d %.4f %d\n", hits[i].transiting, hits[i].natalPoint,
           hits[i].kind, hits[i].orb, hits[i].applying ? 1 : 0);
  return 0;
}
