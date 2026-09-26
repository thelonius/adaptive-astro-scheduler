// Хост-проверка lunar::computeMonth()/dayOf(): для каждого полудня те же сутки,
// что у полного lunar::compute().
//   c++ -std=c++17 -O2 -I src test/lunar_month_check.cpp -o /tmp/lmc && /tmp/lmc
#include <cmath>
#include <cstdio>

#include "../src/lunar.h"

int main() {
  const double lat = 55.75, lon = 37.62;
  double jd0 = 2461309.0 - 200;
  lunar::Month m;
  int bad = 0;
  for (int i = 0; i <= 400; i++) {
    double jd = jd0 + i;
    if (!lunar::contains(m, jd)) m = lunar::computeMonth(jd, lat, lon);
    lunar::Day a = lunar::compute(jd, lat, lon), b = lunar::dayOf(m, jd);
    if (a.number != b.number || std::fabs(a.startJD - b.startJD) > 1e-6 ||
        std::fabs(a.endJD - b.endJD) > 1e-6) {
      bad++;
      printf("день %d: полный %d [%.5f, %.5f)  месяц %d [%.5f, %.5f)\n", i, a.number,
             a.startJD, a.endJD, b.number, b.startJD, b.endJD);
    }
  }
  printf("%s: расхождений %d из 401\n", bad ? "FAIL" : "OK", bad);
  return bad ? 1 : 0;
}
