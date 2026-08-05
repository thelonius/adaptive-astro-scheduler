/// Живая палитра: цвета интерфейса выводятся из положения светил, а не пишутся
/// руками. Порт AstroClock/src/palette.h, он же порт packages/astro-palette.
///
/// Схема: hue фона, текста и рамки приходит от управителя дня, hue акцента —
/// от управителя планетарного часа. Источник hue геоцентрический, то есть это
/// прямо эклиптическая долгота планеты. Аспекты между семью классическими
/// планетами подмешивают насыщенность (гармоничные) и контраст фона
/// (напряжённые).
///
/// От прошивки отличается разрядностью: там RGB565 на 240×240, здесь полный
/// ARGB8888. Сама конверсия OKLCH одна и та же.
library;

import 'dart:math' as math;
import 'dart:ui' show Color;

import 'ephemeris.dart';

// --- OKLCH в sRGB ----------------------------------------------------------

/// L долей единицы, C в единицах OKLCH, hue в градусах.
Color oklch(double l, double c, double hueDeg) {
  final double h = hueDeg * 0.01745329252;
  final double a = c * math.cos(h), b = c * math.sin(h);

  final double lCube = l + 0.3963377774 * a + 0.2158037573 * b;
  final double mCube = l - 0.1055613458 * a - 0.0638541728 * b;
  final double sCube = l - 0.0894841775 * a - 1.2914855480 * b;
  final double ll = lCube * lCube * lCube;
  final double mm = mCube * mCube * mCube;
  final double ss = sCube * sCube * sCube;

  final double lr = 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
  final double lg = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
  final double lb = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss;

  return Color.fromARGB(255, _enc(lr), _enc(lg), _enc(lb));
}

/// Гамма sRGB плюс обрезание по гамуту: OKLCH умеет уезжать за пределы
/// отображаемого, и тогда компонента просто прижимается к краю.
int _enc(double c) {
  if (c <= 0.0) return 0;
  if (c >= 1.0) return 255;
  double v = (c <= 0.0031308) ? 12.92 * c : 1.055 * math.pow(c, 1.0 / 2.4) - 0.055;
  if (v < 0.0) v = 0.0;
  if (v > 1.0) v = 1.0;
  return (v * 255.0 + 0.5).toInt();
}

// --- планетарные часы ------------------------------------------------------

/// Халдейский ряд, от медленных к быстрым.
const List<Body> chaldean = <Body>[
  Body.saturn,
  Body.jupiter,
  Body.mars,
  Body.sun,
  Body.venus,
  Body.mercury,
  Body.moon,
];

/// День недели (0 — воскресенье) в управителя дня.
const List<Body> _weekdayRulers = <Body>[
  Body.sun,
  Body.moon,
  Body.mars,
  Body.mercury,
  Body.jupiter,
  Body.venus,
  Body.saturn,
];

Body weekdayRuler(int wday) => _weekdayRulers[wday % 7];

class PlanetaryHour {
  final Body dayRuler;
  final Body ruler;

  /// 0..23 от восхода.
  final int index;

  /// Границы текущего часа в JD.
  final double startJd;
  final double endJd;

  const PlanetaryHour({
    required this.dayRuler,
    required this.ruler,
    required this.index,
    required this.startJd,
    required this.endJd,
  });

  bool get isDay => index < 12;
}

/// Воскресенье — 0, как в tm_wday.
int weekdayOf(double jd) {
  final DateTime t = dateTimeFromJulianDay(jd).toLocal();
  return t.weekday % 7;
}

/// Астрологические сутки начинаются с восхода, а не с полуночи: двенадцать
/// неравных дневных часов от восхода до заката, затем двенадцать ночных до
/// следующего восхода. Первым дневным часом правит управитель дня недели,
/// дальше идёт халдейский ряд по кругу.
PlanetaryHour planetaryHour(double jd, double lat, double lonEast) {
  final double tr = solarTransit(jd, lonEast);
  double rise, set, nextRise;

  final RiseSet? rs = solarRiseSet(tr, lat, lonEast);
  if (rs == null) {
    // Полярный день или ночь: делить нечего, сетка становится равномерной
    rise = tr - 0.5;
    set = tr;
    nextRise = tr + 0.5;
  } else if (jd < rs.rise) {
    // До восхода идут ещё вчерашние сутки
    nextRise = rs.rise;
    final double trPrev = solarTransit(tr - 1.0, lonEast);
    final RiseSet? prev = solarRiseSet(trPrev, lat, lonEast);
    if (prev == null) {
      rise = trPrev - 0.5;
      set = trPrev;
    } else {
      rise = prev.rise;
      set = prev.set;
    }
  } else {
    rise = rs.rise;
    set = rs.set;
    final double trNext = solarTransit(tr + 1.0, lonEast);
    final RiseSet? next = solarRiseSet(trNext, lat, lonEast);
    nextRise = next == null ? set + 0.5 : next.rise;
  }

  int idx;
  double hourStart, hourLen;
  if (jd < set) {
    hourLen = (set - rise) / 12.0;
    idx = ((jd - rise) / hourLen).floor();
    hourStart = rise + idx * hourLen;
  } else {
    hourLen = (nextRise - set) / 12.0;
    idx = 12 + ((jd - set) / hourLen).floor();
    hourStart = set + (idx - 12) * hourLen;
  }
  if (idx < 0) idx = 0;
  if (idx > 23) idx = 23;

  final Body dayRuler = weekdayRuler(weekdayOf(rise));
  int start = 0;
  for (int i = 0; i < 7; i++) {
    if (chaldean[i] == dayRuler) start = i;
  }

  return PlanetaryHour(
    dayRuler: dayRuler,
    ruler: chaldean[(start + idx) % 7],
    index: idx,
    startJd: hourStart,
    endJd: hourStart + hourLen,
  );
}

// --- модуляция от аспектов -------------------------------------------------

class Modulation {
  /// Насыщеннее акцент.
  final double chromaBoost;

  /// Фон дальше от текста.
  final double lightnessBoost;
  const Modulation(this.chromaBoost, this.lightnessBoost);
}

const List<Body> _classical = <Body>[
  Body.sun,
  Body.moon,
  Body.mercury,
  Body.venus,
  Body.mars,
  Body.jupiter,
  Body.saturn,
];

/// Аспекты между семью классическими планетами, орб 5°. Вес обратен орбису:
/// точный аспект тянет сильнее. Потолки те же, что в библиотеке, иначе цвет
/// уезжает за гамут.
Modulation aspectModulation(double jd) {
  const List<double> ang = <double>[0.0, 60.0, 90.0, 120.0, 180.0];
  const List<int> harm = <int>[1, 1, -1, 1, -1];
  const double orb = 5.0;

  final List<double> lon =
      <double>[for (final Body b in _classical) longitude(b, jd)];

  double cb = 0.0, lb = 0.0;
  for (int i = 0; i < 7; i++) {
    for (int j = i + 1; j < 7; j++) {
      double d = norm360(lon[i] - lon[j]);
      if (d > 180.0) d = 360.0 - d;

      int best = -1;
      double bestDist = 1e9;
      for (int k = 0; k < 5; k++) {
        final double dist = (d - ang[k]).abs();
        if (dist <= orb && dist < bestDist) {
          bestDist = dist;
          best = k;
        }
      }
      if (best < 0) continue;

      final double tight = 1.0 - bestDist / orb;
      if (harm[best] > 0) {
        cb += 0.012 * tight;
      } else {
        lb += 1.2 * tight;
      }
    }
  }
  if (cb > 0.04) cb = 0.04;
  if (lb > 3.0) lb = 3.0;
  return Modulation(cb, lb);
}

// --- сборка ----------------------------------------------------------------

/// Роли из PALETTE_SPEC.dark библиотеки. Светлая схема на просвет не нужна.
class LivePalette {
  final Color bg, surface, text, muted, accent, border;
  final List<Color> sign;
  final List<Color> body;
  final Body dayRuler, hourRuler;
  final int hourIndex;
  final double chromaBoost, lightnessBoost;

  const LivePalette({
    required this.bg,
    required this.surface,
    required this.text,
    required this.muted,
    required this.accent,
    required this.border,
    required this.sign,
    required this.body,
    required this.dayRuler,
    required this.hourRuler,
    required this.hourIndex,
    required this.chromaBoost,
    required this.lightnessBoost,
  });
}

/// Цвет позиционной сущности: hue равен её долготе. По этому же правилу
/// библиотека берёт hue управителя дня и часа.
Color positional(double lonDeg, double l, double c) =>
    oklch(l, c, norm360(lonDeg));

LivePalette computePalette(double jd, double lat, double lonEast) {
  final PlanetaryHour h = planetaryHour(jd, lat, lonEast);
  final Modulation m = aspectModulation(jd);

  final double dayHue = longitude(h.dayRuler, jd);
  final double hourHue = longitude(h.ruler, jd);
  final double cb = m.chromaBoost, lb = m.lightnessBoost;

  return LivePalette(
    // В тёмной схеме напряжённые аспекты уводят фон и рамку вниз, дальше от
    // текста: контраст жёстче
    bg: oklch((14.0 - lb) / 100.0, 0.012, dayHue),
    surface: oklch(0.19, 0.018, dayHue),
    text: oklch(0.92, 0.005, dayHue),
    muted: oklch(0.68, 0.020, dayHue),
    accent: oklch(0.75, 0.140 + cb, hourHue),
    border: oklch((30.0 - lb) / 100.0, 0.018, dayHue),
    // Всё, у чего есть место на эклиптике, красится своей долготой: знак —
    // серединой сектора, тело — тем градусом, где оно стоит
    sign: <Color>[
      for (int i = 0; i < 12; i++) oklch(0.75, 0.140 + cb, i * 30.0 + 15.0)
    ],
    body: <Color>[
      for (int b = 0; b < bodyCount; b++)
        positional(longitude(Body.values[b], jd), 0.75, 0.140 + cb)
    ],
    dayRuler: h.dayRuler,
    hourRuler: h.ruler,
    hourIndex: h.index,
    chromaBoost: cb,
    lightnessBoost: lb,
  );
}
