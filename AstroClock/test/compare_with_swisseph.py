#!/usr/bin/env python3
"""Сверяет расчёт прошивки со swisseph.

Собирает test/host_check.cpp (та же ephemeris.h и transits.h, что уходят в
образ), гоняет его и сравнивает каждую величину с pyswisseph во флаге MOSEPH.

    python3 test/compare_with_swisseph.py [JD]

Допуски выставлены по измеренной точности модели Standish: 0.2° по Юпитеру и
Сатурну, 0.06° по остальным телам.
"""
import subprocess, sys, os, tempfile
import swisseph as swe

HERE = os.path.dirname(os.path.abspath(__file__))
# Эпоха J2000 в Москве. Какая именно карта подставлена, для сверки долгот
# безразлично: сравниваются положения тел на заданный JD, а не аспекты к ней.
FLAGS = ['-DNATAL_YEAR=2000', '-DNATAL_MONTH=1', '-DNATAL_DAY=1', '-DNATAL_HOUR=12',
         '-DNATAL_MINUTE=0', '-DNATAL_UTC_OFFSET=0.0', '-DNATAL_LAT=55.7558',
         '-DNATAL_LON=37.6173', '-DHOME_LAT=55.7558', '-DHOME_LON=37.6173']
LAT, LON = 55.7558, 37.6173
NAMES = ['Солнце', 'Луна', 'Меркурий', 'Венера', 'Марс', 'Юпитер', 'Сатурн',
         'Уран', 'Нептун', 'Плутон']
IPL = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER,
       swe.SATURN, swe.URANUS, swe.NEPTUNE, swe.PLUTO]
TOL = {'Юпитер': 0.20, 'Сатурн': 0.20}
TOL_DEFAULT = 0.06

now_jd = float(sys.argv[1]) if len(sys.argv) > 1 else 2461248.0
exe = os.path.join(tempfile.mkdtemp(), 'hostcheck')
subprocess.run(['c++', '-O2', '-std=c++17'] + FLAGS + ['-o', exe,
                os.path.join(HERE, 'host_check.cpp')], check=True)
out = subprocess.run([exe, str(now_jd)], capture_output=True, text=True, check=True).stdout

data = {'NATAL': {}, 'TRANSIT': {}, 'HIT': []}
for line in out.strip().split('\n'):
    p = line.split()
    if p[0] == 'NATAL_JD': data['natal_jd'] = float(p[1])
    elif p[0] == 'NOW_JD': data['now_jd'] = float(p[1])
    elif p[0] == 'NATAL': data['NATAL'][int(p[1])] = float(p[2])
    elif p[0] == 'TRANSIT': data['TRANSIT'][int(p[1])] = (float(p[2]), float(p[3]))
    elif p[0] in ('ASC', 'MC'): data[p[0]] = float(p[1])
    elif p[0] == 'VOID': data['VOID'] = p[1] == '1'
    elif p[0] == 'HIT': data['HIT'].append(tuple(p[1:]))

def diff(a, b):
    return abs((a - b + 180) % 360 - 180)

fails = 0
def check(label, mine, ref, tol):
    global fails
    d = diff(mine, ref)
    ok = d <= tol
    if not ok: fails += 1
    print(f"  {label:<26}{mine:10.4f}{ref:10.4f}{d*3600:9.1f}\"  {'ok' if ok else 'ПРОВАЛ'}")

print(f"Натальная карта, JD {data['natal_jd']:.6f}")
print(f"  {'точка':<26}{'прошивка':>10}{'swisseph':>10}{'разница':>10}")
for i, name in enumerate(NAMES):
    ref, _ = swe.calc_ut(data['natal_jd'], IPL[i], swe.FLG_MOSEPH)
    check(name, data['NATAL'][i], ref[0], TOL.get(name, TOL_DEFAULT))
cusps, ascmc = swe.houses(data['natal_jd'], LAT, LON, b'P')
check('Асцендент', data['NATAL'][10], ascmc[0], 0.02)
check('МС', data['NATAL'][11], ascmc[1], 0.02)

print(f"\nТекущее небо, JD {data['now_jd']:.6f}")
print(f"  {'тело':<26}{'прошивка':>10}{'swisseph':>10}{'разница':>10}")
for i, name in enumerate(NAMES):
    ref, _ = swe.calc_ut(data['now_jd'], IPL[i], swe.FLG_MOSEPH | swe.FLG_SPEED)
    check(name, data['TRANSIT'][i][0], ref[0], TOL.get(name, TOL_DEFAULT))
    mine_retro = data['TRANSIT'][i][1] < 0
    ref_retro = ref[3] < 0
    if mine_retro != ref_retro:
        print(f"    ретроградность разошлась: прошивка {mine_retro}, swisseph {ref_retro}")
        fails += 1
cusps, ascmc = swe.houses(data['now_jd'], LAT, LON, b'P')
check('Асцендент', data['ASC'], ascmc[0], 0.02)
check('МС', data['MC'], ascmc[1], 0.02)

print(f"\nТранзиты к наталу (орбис, сходится/расходится): найдено {len(data['HIT'])}")
ASPECTS = [(0, 'соединение'), (60, 'секстиль'), (90, 'квадрат'), (120, 'трин'), (180, 'оппозиция')]
POINTS = NAMES + ['Асцендент', 'МС']
for h in data['HIT'][:8]:
    tb, np_, kind, orb, applying = int(h[0]), int(h[1]), int(h[2]), float(h[3]), h[4] == '1'
    # независимая проверка орбиса по swisseph
    ref, _ = swe.calc_ut(data['now_jd'], IPL[tb], swe.FLG_MOSEPH | swe.FLG_SPEED)
    if np_ < 10:
        nref, _ = swe.calc_ut(data['natal_jd'], IPL[np_], swe.FLG_MOSEPH)
        nlon = nref[0]
    else:
        _, a = swe.houses(data['natal_jd'], LAT, LON, b'P')
        nlon = a[0] if np_ == 10 else a[1]
    rel = (ref[0] - nlon + 180) % 360 - 180
    angle = ASPECTS[kind][0]
    # знаковое отклонение до ближайшей ветви аспекта
    cands = [angle] if angle in (0, 180) else [angle, -angle]
    dev = min((( rel - t + 180) % 360 - 180 for t in cands), key=abs)
    ref_orb = abs(dev)
    # аспект сходится, когда отклонение и скорость разнонаправлены
    ref_applying = (dev * ref[3]) < 0
    ok_orb = abs(ref_orb - orb) < 0.25
    ok_app = ref_applying == applying
    if not (ok_orb and ok_app):
        globals()['fails'] = globals().get('fails', 0) + 1
    mark = 'ok' if (ok_orb and ok_app) else (
        'ОРБИС' if not ok_orb else 'НАПРАВЛЕНИЕ: swisseph говорит '
        + ('сходится' if ref_applying else 'расходится'))
    print(f"  {NAMES[tb]:<10} {ASPECTS[kind][1]:<11} нат.{POINTS[np_]:<11}"
          f" орбис {orb:5.2f}° (swisseph {ref_orb:5.2f}°) "
          f"{'сходится' if applying else 'расходится':<11} {mark}")

print(f"\nЛуна без курса: {'да' if data['VOID'] else 'нет'}")
print(f"\n{'ВСЁ СОШЛОСЬ' if fails == 0 else str(fails) + ' ПРОВЕРОК ПРОВАЛЕНО'}")
sys.exit(1 if fails else 0)
