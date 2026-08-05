#pragma once
// Персональная конфигурация часов. Всё задаётся build-флагами из secrets.ini
// (шаблон — secrets.ini.example), значения ниже только запасные, чтобы сборка
// не падала без него.
//
// Запасная карта — эпоха J2000 в Гринвиче: заведомо чужая, зато сразу видно,
// что secrets.ini не подхватился. Реальные натальные данные в исходники не
// возвращать, репозиторий публичный.
//
// Натальные данные вводятся один раз при прошивке: клавиатуры у устройства нет,
// а владелец у него один. Учётные данные WiFi сюда тоже не попадают, они
// приходят переменными окружения через tools/build_flags.py.

#include "ephemeris.h"

// --- натальная карта -------------------------------------------------------

#ifndef NATAL_YEAR
#define NATAL_YEAR 2000
#endif
#ifndef NATAL_MONTH
#define NATAL_MONTH 1
#endif
#ifndef NATAL_DAY
#define NATAL_DAY 1
#endif
#ifndef NATAL_HOUR
#define NATAL_HOUR 12
#endif
#ifndef NATAL_MINUTE
#define NATAL_MINUTE 0
#endif
// Смещение от UTC в часах на момент рождения, с учётом декретного и летнего
// времени. Для Москвы 1984 года это UTC+4 (MSD, летнее время действовало
// до 30 сентября).
#ifndef NATAL_UTC_OFFSET
#define NATAL_UTC_OFFSET 0.0
#endif
#ifndef NATAL_LAT
#define NATAL_LAT 0.0
#endif
#ifndef NATAL_LON
#define NATAL_LON 0.0
#endif

// --- место, где стоят часы -------------------------------------------------

#ifndef HOME_LAT
#define HOME_LAT NATAL_LAT
#endif
#ifndef HOME_LON
#define HOME_LON NATAL_LON
#endif
// Строка часового пояса в формате POSIX TZ, её понимает configTzTime.
// Москва: MSK-3. Амстердам: CET-1CEST,M3.5.0,M10.5.0/3
#ifndef HOME_TZ
#define HOME_TZ "UTC0"
#endif

// --- сеть ------------------------------------------------------------------
// Приходят из secrets.ini. Если его нет, стек WiFi в образ не попадает вообще:
// проверка препроцессорная, а не рантаймовая, иначе линкер всё равно втянет
// lwip и mbedtls на четыреста с лишним килобайт.

#ifdef WIFI_SSID
#define ASTRO_USE_WIFI 1
#ifndef WIFI_PASS
#define WIFI_PASS ""
#endif
#endif

// Момент сборки в unix-времени, подставляется скриптом из platformio.ini.
// Нужен как стартовое время, пока NTP не ответил.
#ifndef BUILD_UNIX_TIME
#define BUILD_UNIX_TIME 1769385600
#endif

namespace config {

// Юлианская дата рождения в UT.
inline double natalJulianDay() {
  int y = NATAL_YEAR, m = NATAL_MONTH;
  double day = NATAL_DAY + (NATAL_HOUR + NATAL_MINUTE / 60.0
                            - (NATAL_UTC_OFFSET)) / 24.0;
  if (m <= 2) { y -= 1; m += 12; }
  int a = y / 100;
  int b = 2 - a + a / 4;  // григорианский календарь
  return (int)(365.25 * (y + 4716)) + (int)(30.6001 * (m + 1))
         + day + b - 1524.5;
}

}  // namespace config
