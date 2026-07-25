#!/usr/bin/env python3
"""
Верификация интеграции эфемерид: сравниваем данные между Python-сервисом и Node.js бэкендом.

Проверяет КОГЕРЕНТНОСТЬ — что одни и те же астрономические данные согласованы на всех уровнях:
  Python :8088  →  Node.js :3000  →  CalendarDay

Использование:
    python3 verify-integration.py [date]   # дата по умолчанию: сегодня

Адреса переопределяются через EPHEM_URL и BACKEND_URL.
"""
import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, date

# ─── Config ────────────────────────────────────────────────────
EPHEM   = os.environ.get("EPHEM_URL", "http://localhost:8088")
BACKEND = os.environ.get("BACKEND_URL", "http://localhost:3000")
DATE    = sys.argv[1] if len(sys.argv) > 1 else date.today().isoformat()
LAT, LON = 55.75, 37.61
TZ = "Europe/Moscow"

PASS = "✓"
FAIL = "✗"
WARN = "⚠"
SEP  = "─" * 60

# ─── Helpers ───────────────────────────────────────────────────
def fetch(url: str, method: str = "GET", body=None) -> dict | list | None:
    try:
        req = urllib.request.Request(url, method=method)
        if body:
            req.add_header("Content-Type", "application/json")
            req.data = json.dumps(body).encode()
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except Exception as e:
        return None

def check(ok: bool, msg: str):
    icon = PASS if ok else FAIL
    print(f"  {icon} {msg}")
    return ok

results = []

def section(title: str):
    print(f"\n{SEP}\n  {title}\n{SEP}")

def assert_check(label: str, condition: bool, detail: str = ""):
    icon = PASS if condition else FAIL
    suffix = f"  [{detail}]" if detail else ""
    print(f"  {icon} {label}{suffix}")
    results.append(condition)
    return condition


# ═══════════════════════════════════════════════════════════════
section(f"LAYER 0 — Доступность сервисов  [{DATE}]")

ephem_planets = fetch(f"{EPHEM}/api/v1/ephemeris/planets?date={DATE}T12:00:00&latitude={LAT}&longitude={LON}&timezone={TZ}")
assert_check("Python ephemeris сервис жив", ephem_planets is not None,
             f"{len(ephem_planets.get('planets', []))} планет" if ephem_planets else "НЕДОСТУПЕН")

backend_health = fetch(f"{BACKEND}/health")
assert_check("Node.js бэкенд жив", backend_health is not None,
             backend_health.get('status', '?') if backend_health else "НЕДОСТУПЕН")

if not ephem_planets or not backend_health:
    print("\n  Критические сервисы недоступны — прерываем проверку.")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════
section("LAYER 1 — Верификация данных Python-сервиса")

py_planets = ephem_planets.get('planets', [])
py_retros  = fetch(f"{EPHEM}/api/v1/ephemeris/retrogrades?date={DATE}")
py_lunar   = fetch(f"{EPHEM}/api/v1/ephemeris/lunar-day?date={DATE}T12:00:00&latitude={LAT}&longitude={LON}&timezone={TZ}")
py_aspects = fetch(f"{EPHEM}/api/v1/ephemeris/aspects?date={DATE}&time=12:00:00")

print()

# Планеты
assert_check("10 планет в ответе", len(py_planets) == 10, f"получено {len(py_planets)}")

sun = next((p for p in py_planets if p['name'] == 'Sun'), None)
moon = next((p for p in py_planets if p['name'] == 'Moon'), None)
assert_check("Sun присутствует", sun is not None,
             f"{sun['zodiac_sign']} {sun['longitude']:.1f}°" if sun else "нет")
assert_check("Moon присутствует", moon is not None,
             f"{moon['zodiac_sign']} {moon['longitude']:.1f}°" if moon else "нет")

# Ретроградные
py_retro_names = []
if isinstance(py_retros, list):
    py_retro_names = [r['name'] for r in py_retros]
elif isinstance(py_retros, dict):
    py_retro_names = [r['name'] for r in py_retros.get('retrogradePlanets', [])]

assert_check("Ретроградные планеты получены", len(py_retro_names) > 0,
             ', '.join(py_retro_names) if py_retro_names else "пусто")

# Лунный день
assert_check("Лунный день получен", py_lunar is not None and 'number' in py_lunar,
             f"день {py_lunar['number']} / {py_lunar.get('lunar_phase', '?')}" if py_lunar else "нет")

# Аспекты
py_aspect_list = py_aspects if isinstance(py_aspects, list) else (py_aspects or {}).get('aspects', [])
assert_check("Аспекты получены", len(py_aspect_list) > 0, f"{len(py_aspect_list)} аспектов")


# ═══════════════════════════════════════════════════════════════
section("LAYER 2 — Когерентность Python → Node.js")

nd_planets = fetch(f"{BACKEND}/api/ephemeris/planets?date={DATE}&latitude={LAT}&longitude={LON}&timezone={TZ}")
nd_moon    = fetch(f"{BACKEND}/api/ephemeris/moon-phase?date={DATE}&latitude={LAT}&longitude={LON}&timezone={TZ}")

print()

nd_planet_list = []
if nd_planets:
    nd_planet_list = nd_planets.get('planets', nd_planets) if isinstance(nd_planets, dict) else nd_planets

# Координаты Sun должны быть в пределах 1° от Python (разница из-за разного момента запроса)
nd_sun = next((p for p in nd_planet_list if p.get('name') == 'Sun'), None)
if sun and nd_sun:
    lon_diff = abs(sun['longitude'] - nd_sun.get('longitude', 0))
    assert_check("Sun.longitude совпадает ±1°", lon_diff < 1.0,
                 f"Python={sun['longitude']:.2f}° Node={nd_sun.get('longitude', '?'):.2f}° Δ={lon_diff:.3f}°")
else:
    assert_check("Sun доступен в обоих сервисах", False, "нет данных")

# Moon
nd_moon_planet = next((p for p in nd_planet_list if p.get('name') == 'Moon'), None)
if moon and nd_moon_planet:
    moon_diff = abs(moon['longitude'] - nd_moon_planet.get('longitude', 0))
    assert_check("Moon.longitude совпадает ±3° (быстро движется)", moon_diff < 3.0,
                 f"Python={moon['longitude']:.2f}° Node={nd_moon_planet.get('longitude', '?'):.2f}° Δ={moon_diff:.3f}°")

# Освещённость луны
if nd_moon:
    illum = nd_moon.get('moonPhase', nd_moon.get('illumination', None))
    if illum is not None:
        illum_pct = float(illum) * 100 if float(illum) <= 1.0 else float(illum)
        assert_check("Освещённость луны в диапазоне 0–100%", 0 <= illum_pct <= 100,
                     f"{illum_pct:.1f}%")


# ═══════════════════════════════════════════════════════════════
section("LAYER 3 — CalendarDay когерентность")

calendar = fetch(f"{BACKEND}/api/calendar/day?date={DATE}&latitude={LAT}&longitude={LON}&timezone={TZ}")
cd = calendar.get('data', calendar) if isinstance(calendar, dict) else {}

print()

# Лунный день совпадает с Python
cd_lunar = cd.get('lunarDay', {})
cd_lunar_num = cd_lunar.get('number')
py_lunar_num = py_lunar.get('number') if py_lunar else None
assert_check("Лунный день совпадает Python ↔ CalendarDay",
             cd_lunar_num == py_lunar_num,
             f"Python={py_lunar_num} CalendarDay={cd_lunar_num}")

# Score присутствует
recs = cd.get('recommendations', {})
strength = recs.get('strength')
assert_check("recommendations.strength присутствует", strength is not None,
             f"{strength:.3f}" if isinstance(strength, float) else str(strength))

# Ретроградные в CalendarDay vs Python
cd_retros = cd.get('retrogradesActive', [])
cd_retro_names = [r.get('name') for r in cd_retros]

# Также смотрим в transits
transits = cd.get('transits', {})
transit_retros = [k for k, v in transits.items() if isinstance(v, dict) and v.get('isRetrograde')]

print(f"\n  Ретроградные:")
print(f"    Python:         {', '.join(py_retro_names) or 'нет'} ({len(py_retro_names)})")
print(f"    retrogradesActive: {', '.join(cd_retro_names) or 'пусто'} ({len(cd_retro_names)})")
print(f"    transits (флаг): {', '.join(transit_retros) or 'нет'} ({len(transit_retros)})")

retro_coverage = len(cd_retro_names) + len(transit_retros)
assert_check("Ретроградные данные хоть где-то есть в CalendarDay",
             retro_coverage > 0,
             f"retrogradesActive={len(cd_retro_names)} + transits={len(transit_retros)}")

# retrogradesActive должен быть заполнен (фактическая проверка бага)
assert_check("retrogradesActive заполнен корректно",
             len(cd_retro_names) > 0,
             f"содержит {len(cd_retro_names)} из {len(py_retro_names)} ретроградных" if cd_retro_names
             else "ПУСТО (баг адаптера — нужно пересобрать образ)")

# Аспекты
cd_aspects = cd.get('aspects', [])
assert_check("Аспекты в CalendarDay присутствуют", len(cd_aspects) > 0,
             f"{len(cd_aspects)} аспектов")

# Планетарные часы
cd_hours = cd.get('planetaryHours', [])
assert_check("Планетарные часы присутствуют", len(cd_hours) > 0,
             f"{len(cd_hours)} часов")


# ═══════════════════════════════════════════════════════════════
section("LAYER 4 — Optimal Timing скоринг")

ot_resp = fetch(
    f"{BACKEND}/api/optimal-timing/find",
    method="POST",
    body={
        "intention": "start-project",
        "startDate": DATE,
        "endDate": "2026-04-30",
        "location": {"latitude": LAT, "longitude": LON, "timezone": TZ},
    }
)

print()

ot_windows = (ot_resp or {}).get('windows', [])
assert_check("Optimal timing вернул окна", ot_resp is not None, str(ot_resp)[:60] if ot_resp is None else "OK")
assert_check("Хотя бы одно окно найдено", len(ot_windows) > 0, f"{len(ot_windows)} окон")

scores = [w.get('score', 50) for w in ot_windows]
varied = max(scores) != min(scores) if scores else False
assert_check("Скоры окон варьируются (не все по 50)", varied,
             f"min={min(scores)} max={max(scores)}" if scores else "нет данных")

# Проверка что координаты учтены (location в ответных объектах не 0,0)
if ot_windows:
    first_w = ot_windows[0]
    w_date = first_w.get('date', {})
    w_loc = w_date.get('location', {}) if isinstance(w_date, dict) else {}
    loc_ok = w_loc.get('latitude', 0) != 0 or w_loc.get('longitude', 0) != 0
    print(f"\n  Локация в первом окне: lat={w_loc.get('latitude','?')} lon={w_loc.get('longitude','?')}")
    assert_check("Координаты переданы в окна (не 0,0)", loc_ok)


# ═══════════════════════════════════════════════════════════════
section("ИТОГ")

passed = sum(results)
total  = len(results)
pct    = int(passed / total * 100) if total else 0

print()
for i, r in enumerate(results):
    pass  # already printed inline

print(f"  Прошло: {passed}/{total} ({pct}%)")
print()

if passed == total:
    print("  Все проверки пройдены — интеграция работает корректно.")
elif passed >= total * 0.8:
    print("  Большинство проверок пройдено. Есть незначительные разрывы.")
else:
    print("  Критические проблемы интеграции — требуется исправление.")
print()

sys.exit(0 if passed == total else 1)
