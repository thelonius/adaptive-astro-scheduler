// Хост-проверка lunar::advance(): цепочка сдвигов от сегодняшних суток должна
// давать те же сутки, что полный lunar::compute() на каждый полдень.
//   c++ -std=c++17 -O2 -I src test/lunar_advance_check.cpp -o /tmp/lac && /tmp/lac
#include <cmath>
#include <cstdio>

#include "../src/lunar.h"

int main() {
  const double lat = 55.75, lon = 37.62;
  double jd0 = 2461309.0;  // 2026-09-25 полдень UT
  lunar::Day chained = lunar::compute(jd0, lat, lon);
  int bad = 0;
  for (int i = 1; i <= 400; i++) {
    double jd = jd0 + i;
    lunar::Day full = lunar::compute(jd, lat, lon);
    if (jd >= chained.endJD) chained = lunar::advance(chained, jd, lat, lon);
    bool same = full.number == chained.number &&
                std::fabs(full.startJD - chained.startJD) < 1e-6 &&
                std::fabs(full.endJD - chained.endJD) < 1e-6;
    if (!same) {
      bad++;
      printf("день +%d: полный %d [%.5f, %.5f)  цепочка %d [%.5f, %.5f)\n", i,
             full.number, full.startJD, full.endJD, chained.number,
             chained.startJD, chained.endJD);
    }
  }
  printf("%s: расхождений %d из 400\n", bad ? "FAIL" : "OK", bad);
  return bad ? 1 : 0;
}
