#!/usr/bin/env python3
"""Сверяет порт эфемерид на Dart с прошивкой и со swisseph.

Две проверки, и они отвечают на разные вопросы.

1. Dart против C++. Тот же алгоритм, тот же тип double, поэтому расхождение
   должно быть на уровне порядка операций, а не модели. Допуск 1e-7°, то есть
   0.0004″. Это и есть проверка порта.

2. Dart против swisseph во флаге MOSEPH. Здесь работает уже точность самой
   модели Standish, и допуски те же, что в test/compare_with_swisseph.py:
   0.2° по Юпитеру и Сатурну, 0.06° по остальным телам. Асцендент, МС
   и куспиды по Плацидусу сверяются жёстко.

    python3 tool/compare_port.py [count] [step] [startJD]
"""
import os
import subprocess
import sys
import tempfile

import swisseph as swe

HERE = os.path.dirname(os.path.abspath(__file__))
MOBILE = os.path.dirname(HERE)
CLOCK = os.path.join(os.path.dirname(MOBILE), 'AstroClock')

COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 200
STEP = float(sys.argv[2]) if len(sys.argv) > 2 else 173.7
START = float(sys.argv[3]) if len(sys.argv) > 3 else 2435108.5
LAT, LON = 55.7558, 37.6173

NAMES = ['Солнце', 'Луна', 'Меркурий', 'Венера', 'Марс', 'Юпитер', 'Сатурн',
         'Уран', 'Нептун', 'Плутон']
IPL = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER,
       swe.SATURN, swe.URANUS, swe.NEPTUNE, swe.PLUTO]

TOL_MODEL = {'Юпитер': 0.20, 'Сатурн': 0.20}
TOL_MODEL_DEFAULT = 0.06
TOL_PORT = 1e-7
# Асцендент упирается не в порт, а в четырёхчленную нутацию из ephemeris.h:
# остаток ряда порядка полусекунды дуги и целиком уходит в местное звёздное
# время. Пиксель экрана на кольцах часов это 0.76°, так что разница невидима.
TOL_ANGLES = 1e-3          # 3.6″
TOL_CUSPS = 2e-3           # промежуточные куспиды по Плацидусу

ARGS = [str(COUNT), str(STEP), str(START), str(LAT), str(LON)]


def parse(text):
    """Разбирает дамп в список словарей по одному на момент сетки."""
    frames, cur = [], None
    for line in text.strip().split('\n'):
        p = line.split()
        if p[0] == 'JD':
            cur = {'jd': float(p[1]), 'L': {}, 'C': {}}
            frames.append(cur)
        elif p[0] == 'L':
            cur['L'][int(p[1])] = (float(p[2]), float(p[3]))
        elif p[0] == 'C':
            cur['C'][int(p[1])] = float(p[2])
        else:
            cur[p[0]] = float(p[1])
    return frames


def diff(a, b):
    return abs((a - b + 180) % 360 - 180)


def run_cpp():
    exe = os.path.join(tempfile.mkdtemp(), 'grid_dump')
    subprocess.run(
        ['c++', '-O2', '-std=c++17', '-o', exe,
         os.path.join(CLOCK, 'test', 'grid_dump.cpp')],
        check=True)
    return parse(subprocess.run([exe] + ARGS, capture_output=True, text=True,
                                check=True).stdout)


def run_dart():
    out = subprocess.run(
        ['dart', 'run', 'tool/dump_grid.dart'] + ARGS,
        cwd=MOBILE, capture_output=True, text=True, check=True).stdout
    return parse(out)


class Report:
    def __init__(self):
        self.fails = 0
        self.worst = {}

    def check(self, group, label, mine, ref, tol):
        d = diff(mine, ref)
        key = (group, label)
        if d > self.worst.get(key, -1):
            self.worst[key] = d
        if d > tol:
            self.fails += 1
            if self.fails <= 20:
                print(f'  ✗ {group} {label}: {mine:.6f} против {ref:.6f}, '
                      f'Δ {d * 3600:.3f}″ при допуске {tol * 3600:.3f}″')

    def summary(self, title):
        print(f'\n{title}')
        for (group, label), d in sorted(self.worst.items(),
                                        key=lambda kv: -kv[1])[:14]:
            print(f'  {group:9} {label:10} худшее Δ {d:.6f}° ({d * 3600:.3f}″)')


def main():
    print(f'Сетка: {COUNT} точек с шагом {STEP} сут от JD {START}')
    print('Сборка C++...')
    cpp = run_cpp()
    print('Запуск Dart...')
    dart = run_dart()

    if len(cpp) != len(dart):
        print(f'РАЗНАЯ ДЛИНА: C++ {len(cpp)}, Dart {len(dart)}')
        return 1

    # --- 1. порт против прошивки ---
    port = Report()
    for fc, fd in zip(cpp, dart):
        assert abs(fc['jd'] - fd['jd']) < 1e-6
        for b, name in enumerate(NAMES):
            port.check('долгота', name, fd['L'][b][0], fc['L'][b][0], TOL_PORT)
            port.check('скорость', name, fd['L'][b][1], fc['L'][b][1], TOL_PORT)
        port.check('угол', 'ASC', fd['ASC'], fc['ASC'], TOL_PORT)
        port.check('угол', 'MC', fd['MC'], fc['MC'], TOL_PORT)
        for c in range(12):
            port.check('куспид', f'{c + 1}', fd['C'][c], fc['C'][c], TOL_PORT)
    port.summary('Dart против прошивки')

    # --- 2. порт против swisseph ---
    swe.set_ephe_path(None)
    ref = Report()
    for fd in dart:
        jd = fd['jd']
        for b, name in enumerate(NAMES):
            tol = TOL_MODEL.get(name, TOL_MODEL_DEFAULT)
            lon = swe.calc_ut(jd, IPL[b], swe.FLG_MOSEPH)[0][0]
            ref.check('долгота', name, fd['L'][b][0], lon, tol)
        cusps, ascmc = swe.houses_ex(jd, LAT, LON, b'P', swe.FLG_MOSEPH)
        ref.check('угол', 'ASC', fd['ASC'], ascmc[0], TOL_ANGLES)
        ref.check('угол', 'MC', fd['MC'], ascmc[1], TOL_ANGLES)
        for c in range(12):
            ref.check('куспид', f'{c + 1}', fd['C'][c], cusps[c], TOL_CUSPS)
    ref.summary('Dart против swisseph (MOSEPH)')

    total = port.fails + ref.fails
    print(f'\nОтклонений сверх допуска: порт {port.fails}, модель {ref.fails}')
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main())
