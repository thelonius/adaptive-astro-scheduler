"""Подставляет в сборку то, чего не должно быть в исходниках.

Момент сборки нужен как стартовое время: пока NTP не ответил (или если сети
нет вовсе), часы идут от него.

Учётные данные WiFi берутся из переменных окружения и в репозиторий не
попадают. Прошлый раз пароль лежал прямо в main.cpp и уехал в публичный
репозиторий вместе с ним.

    export ASTRO_WIFI_SSID=...
    export ASTRO_WIFI_PASS=...
    pio run -t upload

Без ASTRO_WIFI_SSID макрос WIFI_SSID не определяется, config.h не включает
ASTRO_USE_WIFI, и стек WiFi в образ не линкуется совсем.

OTA — отдельный флаг поверх WiFi, а не часть его. Обычная USB-сборка про него
не знает: радио включается на пару секунд ради NTP и гасится, как и раньше.
С ASTRO_OTA=1 радио остаётся включённым всё время работы часов, чтобы можно
было шить по воздуху — удобно на время разработки, дорого по батарее и флешу
на постоянной основе. Ожидаемо временное решение, отсюда отдельный флаг: его
легко выключить одной переменной, не трогая код.

    export ASTRO_WIFI_SSID=...
    export ASTRO_WIFI_PASS=...
    export ASTRO_OTA=1
    pio run -e ota -t upload
"""

import os
import time

Import("env")  # noqa: F821  (внедряется PlatformIO)

env.Append(CPPDEFINES=[("BUILD_UNIX_TIME", int(time.time()))])

ssid = os.environ.get("ASTRO_WIFI_SSID", "").strip()
if ssid:
    env.Append(CPPDEFINES=[
        ("WIFI_SSID", env.StringifyMacro(ssid)),
        ("WIFI_PASS", env.StringifyMacro(os.environ.get("ASTRO_WIFI_PASS", ""))),
    ])
    print("build_flags: WiFi включён, NTP будет использован")
else:
    print("build_flags: ASTRO_WIFI_SSID не задан, сборка без WiFi и NTP")

if os.environ.get("ASTRO_OTA", "").strip():
    if not ssid:
        print("build_flags: ASTRO_OTA задан без ASTRO_WIFI_SSID — сети нет, "
              "OTA включить не во что, пропускаю")
    else:
        env.Append(CPPDEFINES=[
            ("ASTRO_ENABLE_OTA", 1),
            ("OTA_PASS", env.StringifyMacro(os.environ.get("ASTRO_OTA_PASS", ""))),
        ])
        print("build_flags: OTA включён, радио останется на весь аптайм "
              "(hostname astroclock.local)")
