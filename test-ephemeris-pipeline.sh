#!/usr/bin/env bash
# =============================================================
# Сквозной тест: Ephemeris → Calendar Day Pipeline
# Показывает как данные эфемерид собираются в финальный CalendarDay
#
# Использует:
#   - Python ephemeris сервис (по умолчанию localhost:8088)
#   - Node.js бэкенд (по умолчанию localhost:3000)
# Переопределяется через EPHEM_URL и BACKEND_URL.
# =============================================================

set -e
EPHEM="${EPHEM_URL:-http://localhost:8088}"
BACKEND="${BACKEND_URL:-http://localhost:3000}"
DATE="2026-04-23"
LAT="55.75"
LON="37.61"
TZ="Europe%2FMoscow"
SEP="─────────────────────────────────────────────────────────"

ok()   { echo "  ✓ $1"; }
info() { echo "  → $1"; }
head_() { echo -e "\n$SEP\n  $1\n$SEP"; }

# ─── LAYER 0: Проверка сервисов ─────────────────────────────
head_ "LAYER 0 — Доступность сервисов"

ephem_health=$(curl -sf "$EPHEM/api/v1/ephemeris/planets?date=${DATE}T12:00:00&latitude=$LAT&longitude=$LON&timezone=Europe/Moscow" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"OK ({len(d['planets'])} планет)\")" 2>/dev/null || echo "НЕДОСТУПЕН")
ok "Ephemeris API (local :8088): $ephem_health"

backend_health=$(curl -sf "$BACKEND/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "НЕДОСТУПЕН")
ok "Backend API (remote :3000): $backend_health"

# ─── LAYER 1: Сырые эфемеридные данные ───────────────────────
head_ "LAYER 1 — Сырые эфемеридные данные (Python / Swiss Ephemeris)"

echo ""
echo "  [1a] Позиции планет:"
curl -sf "$EPHEM/api/v1/ephemeris/planets?date=${DATE}T12:00:00&latitude=$LAT&longitude=$LON&timezone=Europe/Moscow" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for p in d['planets'][:5]:
    retro = ' ℞' if p.get('is_retrograde') else ''
    print(f\"    {p['name']:<10} {p['zodiac_sign']:<12} {p['longitude']:>8.2f}°  speed={p['speed']:>+.3f}°/d{retro}\")
print(f\"    ... (всего {len(d['planets'])} планет)\")
"

echo ""
echo "  [1b] Лунный день:"
curl -sf "$EPHEM/api/v1/ephemeris/lunar-day?date=${DATE}T12:00:00&latitude=$LAT&longitude=$LON&timezone=Europe/Moscow" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"    Лунный день: {d['number']}  |  Фаза: {d['lunar_phase']}  |  Длительность: {d.get('duration_hours','?'):.1f}h\")
"

echo ""
echo "  [1c] Аспекты (топ-5 по точности):"
curl -sf "$EPHEM/api/v1/ephemeris/aspects?date=$DATE&time=12:00:00" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
aspects = d if isinstance(d, list) else d.get('aspects', [])
aspects.sort(key=lambda x: abs(x.get('orb', 99)))
for a in aspects[:5]:
    print(f\"    {a.get('planet1','?'):<10} {a.get('aspect_type','?'):<15} {a.get('planet2','?'):<10} орб={a.get('orb',0):>+.2f}°\")
print(f\"    ... (всего {len(aspects)} аспектов)\")
" 2>/dev/null || info "аспекты недоступны"

echo ""
echo "  [1d] Ретроградные планеты:"
curl -sf "$EPHEM/api/v1/ephemeris/retrogrades?date=$DATE" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
retros = d if isinstance(d, list) else d.get('retrogradePlanets', [])
if retros:
    names = [r.get('name','?') for r in retros]
    print(f\"    ℞  {', '.join(names)}\")
else:
    print('    Нет ретроградных планет')
"

echo ""
echo "  [1e] Void of Course Moon:"
curl -sf "$EPHEM/api/v1/planning/void-of-course?start=${DATE}T00:00:00&end=${DATE}T23:59:59" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
windows = d.get('windows', [])
if windows:
    for w in windows:
        print(f\"    VoC: {w.get('voc_start','?')} → {w.get('voc_end','?')}  ({w.get('duration_hours',0):.1f}h)\")
else:
    print('    VoC Moon не активен')
" 2>/dev/null

echo ""
echo "  [1f] Планетарные часы (первые 4):"
curl -sf "$EPHEM/api/v1/ephemeris/planetary-hours?date=${DATE}T12:00:00&latitude=$LAT&longitude=$LON&timezone=Europe/Moscow" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
hours = d.get('hours', [])
for h in hours[:4]:
    print(f\"    Час {h.get('hour_number',h.get('hour','?')):>2}: {h.get('planet','?'):<10} {h.get('start_time','?')}\")
" 2>/dev/null

# ─── LAYER 2: Нормализация в Node.js адаптере ────────────────
head_ "LAYER 2 — Нормализованные данные (Node.js Adapter + Cache)"

echo ""
echo "  [2a] Нормализованные планеты через бэкенд:"
curl -sf "$BACKEND/api/ephemeris/planets?date=$DATE&latitude=$LAT&longitude=$LON&timezone=Europe/Moscow" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
planets = d.get('planets', d) if isinstance(d, dict) else d
for p in (planets[:5] if isinstance(planets, list) else []):
    retro = ' ℞' if p.get('is_retrograde', p.get('isRetrograde')) else ''
    sign = p.get('zodiac_sign', p.get('zodiacSign', '?'))
    lon = p.get('longitude', 0)
    print(f\"    {p.get('name','?'):<10} {sign:<12} {lon:>8.2f}°{retro}\")
" 2>/dev/null || info "используем локальный ephemeris"

echo ""
echo "  [2b] Moon phase (illumination 0.0–1.0):"
curl -sf "$BACKEND/api/ephemeris/moon-phase?date=$DATE&latitude=$LAT&longitude=$LON&timezone=Europe/Moscow" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
illum = d.get('moonPhase', d.get('illumination', '?'))
pct = float(illum)*100 if isinstance(illum, (int,float)) else '?'
print(f\"    Освещённость: {pct:.1f}%\")
" 2>/dev/null

# ─── LAYER 3: Сборка CalendarDay ─────────────────────────────
head_ "LAYER 3 — Собранный CalendarDay (бизнес-логика бэкенда)"

echo ""
echo "  [3a] Полный CalendarDay:"
curl -sf "$BACKEND/api/calendar/day?date=$DATE&latitude=$LAT&longitude=$LON&timezone=Europe/Moscow" \
  | python3 -c "
import sys, json
resp = json.load(sys.stdin)
d = resp.get('data', resp)

# Lunar
lunar = d.get('lunarDay', {})
print(f\"    Лунный день:  {lunar.get('number','?')}  ({lunar.get('energy','?')}  /  {lunar.get('lunarPhase','?')})\")

# Score — реальное поле: recommendations.strength (0.0–1.0)
recs = d.get('recommendations', {})
strength = recs.get('strength', '?')
score_str = f'{strength:.2f}' if isinstance(strength, (int, float)) else str(strength)
print(f\"    Day score:    {score_str}  (strength 0.0–1.0)\")

# Retrograde — реальное поле: retrogradesActive (массив CelestialBody)
retros = d.get('retrogradesActive', [])
if isinstance(retros, list) and retros:
    print(f\"    Ретроград:    {', '.join(r.get('name','?') for r in retros)}\")
else:
    # Fallback: isRetrograde в transits
    transits = d.get('transits', {})
    retro_t = [k for k, v in transits.items() if isinstance(v, dict) and v.get('isRetrograde')]
    if retro_t:
        print(f\"    Ретроград:    {', '.join(retro_t)}  (из transits, retrogradesActive пуст)\")
    else:
        print('    Ретроград:    нет данных')

# Recommendations
if recs:
    best = recs.get('bestFor', [])
    avoid = recs.get('avoidFor', [])
    reasons = recs.get('reasons', [])
    print(f\"    Лучшее для:  {', '.join(best[:3]) if best else '—'}\")
    print(f\"    Избегать:    {', '.join(avoid[:3]) if avoid else '—'}\")
    if reasons:
        print(f\"    Причины:     {'; '.join(reasons[:2])}\")
    warnings = recs.get('warnings', [])
    if warnings:
        print(f\"    ⚠ Предупреждение: {warnings[0][:80]}\")

# VoC
voc = d.get('voidOfCourseMoon')
if voc:
    print(f\"    🌑 VoC Moon активен!\")
else:
    print(f\"    VoC Moon:    не активен сейчас\")
"

# ─── LAYER 4: Optimal Timing ─────────────────────────────────
head_ "LAYER 4 — Optimal Timing (намерение + скоринг)"

echo ""
echo "  [4a] Доступные намерения:"
curl -sf "$BACKEND/api/optimal-timing/intentions" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
intents = d.get('intentions', d) if isinstance(d, dict) else d
print(f\"    {', '.join(intents)}\")
" 2>/dev/null

echo ""
echo "  [4b] Оптимальные окна для 'start-project' (следующие 7 дней):"
curl -sf -X POST "$BACKEND/api/optimal-timing/find" \
  -H "Content-Type: application/json" \
  -d "{\"intention\":\"start-project\",\"startDate\":\"$DATE\",\"endDate\":\"2026-04-30\",\"location\":{\"latitude\":$LAT,\"longitude\":$LON,\"timezone\":\"Europe/Moscow\"}}" \
  | python3 -c "
import sys, json
resp = json.load(sys.stdin)
windows = resp.get('windows', [])
count = resp.get('count', len(windows))
print(f\"    Найдено окон: {count}\")
for w in windows[:3]:
    # date — это DateTime объект {date: ..., timezone: ..., location: ...}
    dt = w.get('date', {})
    date_str = dt.get('date', str(dt))[:10] if isinstance(dt, dict) else str(dt)[:10]
    score = w.get('score', '?')
    suggestions = w.get('suggestions', [])
    warnings = w.get('warnings', [])
    moon = w.get('moonPhase', '')
    s_str = ', '.join(suggestions[:2]) if suggestions else w.get('summary', '')
    print(f\"    {date_str}  score={score}  фаза={moon}  {s_str[:60]}\")
    if warnings:
        print(f\"      ⚠ {warnings[0][:60]}\")
" 2>/dev/null || info "намерения недоступны"

# ─── ИТОГ ───────────────────────────────────────────────────
head_ "ИТОГ — Схема потока данных"
echo ""
echo "  [Python :8088]              [Node.js :3000]              [Клиент]"
echo "  Swiss Ephemeris"
echo "  + Skyfield JPL    →→→  EphemerisAdapter        →→→  /api/calendar/day"
echo "  de421.bsp                   CachedEphemerisCalculator    CalendarDay"
echo "                              CalendarGenerator            dayScore"
echo "                              OptimalTimingService         recommendations"
echo "                              TransitCalculator (natal)"
echo ""
echo "  Данные на $DATE:"
echo "    Источник эфемерид: Swiss Ephemeris (Skyfield fallback)"
echo "    Кэш: InMemoryCache (TTL∞ прошлое / 1h текущее / 24h будущее)"
echo "    Скоринг: rule-based (timing-rules.ts) + optional AI (GPT-4/Claude)"
echo ""
