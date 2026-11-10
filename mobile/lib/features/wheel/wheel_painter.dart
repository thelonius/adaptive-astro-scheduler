/// Колесо: зодиак снаружи, транзитные планеты, натальные приглушённые,
/// линии аспектов между ними.
///
/// Отрисовка повторяет [renderBiwheel] из AstroClock/src/main.cpp и
/// AstroUI.h: растровые глифы 13×13, разведение наложений (collide.h),
/// те же радиусы колец.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/ephemeris/ephemeris.dart';
import '../../core/ephemeris/palette.dart';
import '../../core/ephemeris/transits.dart';
import '../../core/sky.dart';
import 'bitmap_glyph.dart';
import 'glyph_collision.dart';
import 'glyphs.dart';
import 'wheel_theme.dart';

enum WheelMode {
  biwheel('биwheel'),
  sky('небо');

  final String label;
  const WheelMode(this.label);
}

/// Радиусы в долях от половины стороны. Числа те же, что layout:: в часах,
/// поделённые на 120.
class WheelGeometry {
  static const double ringOut = 117 / 120;
  static const double ringIn = 91 / 120;
  static const double sign = 104 / 120;
  static const double transit = 79 / 120;
  static const double natalRing = 64 / 120;
  static const double natal = 56 / 120;
  static const double aspect = 45 / 120;

  static const double glyphPx = 13;

  final Offset center;
  final double radius;
  final double ascendant;

  const WheelGeometry({
    required this.center,
    required this.radius,
    required this.ascendant,
  });

  double angle(double longitude) {
    double a = 180.0 - (longitude - ascendant);
    while (a < 0) a += 360.0;
    while (a >= 360) a -= 360.0;
    return a * math.pi / 180.0;
  }

  Offset at(double longitude, double r) {
    final double a = angle(longitude);
    return Offset(
      center.dx + radius * r * math.cos(a),
      center.dy + radius * r * math.sin(a),
    );
  }

  double ringRadiusPx(double rFrac) => radius * rFrac;
}

class WheelPainter extends CustomPainter {
  final SkySnapshot sky;
  final SlowSky? slow;
  final WheelTheme theme;
  final WheelMode mode;
  final Hit? selected;

  /// Момент анимации разведения глифов (millis), как millis() на часах.
  final int animationMs;

  const WheelPainter({
    required this.sky,
    required this.theme,
    required this.mode,
    this.slow,
    this.selected,
    this.animationMs = 0,
  });

  double get _px => 1.0; // один «пиксель» часов = 1 logical px при radius/120

  @override
  void paint(Canvas canvas, Size size) {
    final double radius = math.min(size.width, size.height) / 2;
    final WheelGeometry g = WheelGeometry(
      center: Offset(size.width / 2, size.height / 2),
      radius: radius,
      ascendant: sky.ascendant,
    );
    final double px = radius / 120;

    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = theme.bg,
    );

    _paintZodiac(canvas, g, px);

    if (mode == WheelMode.biwheel) {
      _paintNatalLayer(canvas, g, px);
      _paintCusps(canvas, g, px);
      _paintAspects(canvas, g, px);
    }

    _paintTransitLayer(canvas, g, px);
    _paintSunMark(canvas, g, px);
  }

  void _paintZodiac(Canvas canvas, WheelGeometry g, double px) {
    final Color ringCol = dimColor(theme.ring, 1, 3);
    final Paint stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = px
      ..color = ringCol;

    canvas.drawCircle(g.center, g.radius * WheelGeometry.ringOut, stroke);
    canvas.drawCircle(g.center, g.radius * WheelGeometry.ringIn, stroke);
    canvas.drawCircle(
      g.center,
      g.radius * WheelGeometry.natalRing,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = px
        ..color = dimColor(theme.ring, 1, 5),
    );

    for (int i = 0; i < 12; i++) {
      final double edge = i * 30.0;
      canvas.drawLine(
        g.at(edge, WheelGeometry.ringIn),
        g.at(edge, WheelGeometry.ringOut),
        stroke,
      );
      drawSignGlyph(
        canvas,
        i,
        g.at(edge + 15.0, WheelGeometry.sign),
        theme.signColor(i),
        px,
      );
    }
  }

  void _paintNatalLayer(Canvas canvas, WheelGeometry g, double px) {
    final List<double> lons = sky.natal.lon.sublist(0, bodyCount);
    final GlyphGroups grp = buildGlyphGroups(
      lons,
      bodyCount,
      g.ringRadiusPx(WheelGeometry.natal),
      WheelGeometry.glyphPx * px,
    );

    for (int pass = 0; pass < 2; pass++) {
      for (int b = 0; b < bodyCount; b++) {
        final bool top = glyphOnTop(grp, b, animationMs);
        if (top != (pass == 1)) continue;
        final double k = glyphLevel(grp, b, animationMs, low: 0.7);
        final Color color = fadeColor(
          dimColor(theme.bodyColor(Body.values[b], lons[b]), 3, 5),
          k,
        );
        drawPlanetGlyph(
          canvas,
          planetGlyphIndex(Body.values[b], moonWaxing: moonWaxing(sky.jd)),
          g.at(lons[b], WheelGeometry.natal),
          color,
          px,
        );
      }
    }

    _paintNatalAngle(canvas, g, px, sky.natal.lon[natalAsc], isAsc: true);
    _paintNatalAngle(canvas, g, px, sky.natal.lon[natalMc], isAsc: false);
  }

  void _paintCusps(Canvas canvas, WheelGeometry g, double px) {
    for (int i = 0; i < 12; i++) {
      final bool angular = i % 3 == 0;
      final Color c = positional(
        sky.natal.cusp[i],
        angular ? 0.72 : 0.52,
        angular ? 0.13 : 0.07,
      );
      final double r0 = angular ? 65 / 120 : 66 / 120;
      final double r1 = angular ? 77 / 120 : 71 / 120;
      canvas.drawLine(
        g.at(sky.natal.cusp[i], r0),
        g.at(sky.natal.cusp[i], r1),
        Paint()
          ..strokeWidth = px
          ..color = c,
      );
    }
  }

  void _paintAspects(Canvas canvas, WheelGeometry g, double px) {
    for (final Hit h in sky.hits.reversed) {
      final bool isSelected = selected != null &&
          selected!.transiting == h.transiting &&
          selected!.natalPoint == h.natalPoint &&
          selected!.kind == h.kind;
      final double emphasis =
          selected == null ? 1.0 : (isSelected ? 1.0 : 0.25);

      final double tLon = sky.lon[h.transiting.index];
      final double nLon = sky.natal.lon[h.natalPoint];
      final Color base = aspectColor(h.kind);

      if (h.kind == AspectKind.conjunction) {
        _paintConjunctionLink(
          canvas,
          g,
          px,
          tLon,
          nLon,
          base,
          h.slack,
          emphasis,
        );
      } else {
        final int num =
            (5.0 - 4.0 * h.slack).floor().clamp(1, 5);
        final double f = (num / 5.0) * emphasis;
        canvas.drawLine(
          g.at(tLon, WheelGeometry.aspect),
          g.at(nLon, WheelGeometry.aspect),
          Paint()
            ..strokeWidth = px * (isSelected ? 2.0 : 1.0)
            ..color = dimColor(base, (f * 5).round().clamp(1, 5), 5),
        );
      }
    }
  }

  void _paintConjunctionLink(
    Canvas canvas,
    WheelGeometry g,
    double px,
    double tLon,
    double nLon,
    Color base,
    double slack,
    double emphasis,
  ) {
    int num = (5.0 - 3.0 * slack).floor();
    if (num < 2) num = 2;
    final Color c = dimColor(
      base,
      ((num / 5.0) * emphasis * 5).round().clamp(1, 5),
      5,
    );
    final Offset a = g.at(nLon, (56 + 6) / 120);
    final Offset b = g.at(tLon, (79 - 7) / 120);
    final Paint p = Paint()
      ..strokeWidth = px
      ..color = c;
    canvas.drawLine(a, b, p);
    final Offset d = b - a;
    final double len = d.distance;
    if (len > 0) {
      final Offset n = Offset(-d.dy / len, d.dx / len);
      canvas.drawLine(a + n, b + n, p);
    }
  }


  void _paintTransitLayer(Canvas canvas, WheelGeometry g, double px) {
    final List<double> lons = sky.lon;
    final GlyphGroups grp = buildGlyphGroups(
      lons,
      bodyCount,
      g.ringRadiusPx(WheelGeometry.transit),
      WheelGeometry.glyphPx * px,
    );

    final Set<int> involved = <int>{
      for (final Hit h in sky.hits) h.transiting.index
    };

    for (int pass = 0; pass < 2; pass++) {
      for (int b = 0; b < bodyCount; b++) {
        final bool top = glyphOnTop(grp, b, animationMs);
        if (top != (pass == 1)) continue;
        final double k = glyphLevel(grp, b, animationMs, low: 0.3);
        final Color color =
            fadeColor(theme.bodyColor(Body.values[b], lons[b]), k);
        final Offset at = g.at(lons[b], WheelGeometry.transit);

        if (involved.contains(b) && top) {
          canvas.drawCircle(
            at,
            px * 8,
            Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = px
              ..color = dimColor(color, 1, 2),
          );
        }

        drawPlanetGlyph(
          canvas,
          planetGlyphIndex(Body.values[b], moonWaxing: moonWaxing(sky.jd)),
          at,
          color,
          px,
        );
        if (sky.retrograde[b]) {
          canvas.drawCircle(
            at + Offset(0, px * 8),
            px,
            Paint()..color = color,
          );
        }
      }
    }

    if (slow?.moonVoid ?? false) {
      final double phase = (animationMs % 2400) / 2400.0;
      final double bright = 0.5 + 0.5 * math.sin(phase * math.pi * 2);
      drawVoidRing(
        canvas,
        g.at(lons[Body.moon.index], WheelGeometry.transit),
        theme.bodyColor(Body.moon, lons[Body.moon.index]),
        px,
        bright: bright,
      );
    }
  }

  void _paintNatalAngle(Canvas canvas, WheelGeometry g, double px, double lon,
      {required bool isAsc}) {
    final Color c = dimColor(theme.text, 7, 10);
    canvas.drawLine(
      g.at(lon, (56 - 6) / 120),
      g.at(lon, WheelGeometry.natalRing),
      Paint()
        ..strokeWidth = px * 1.5
        ..color = c,
    );
    if (isAsc) {
      canvas.drawCircle(
        g.at(lon, (56 - 10) / 120),
        px * 2,
        Paint()..color = c,
      );
    }
  }

  void _paintSunMark(Canvas canvas, WheelGeometry g, double px) {
    final double lon = sky.lon[Body.sun.index];
    canvas.drawLine(
      g.at(lon, WheelGeometry.ringOut),
      g.at(lon, 119 / 120),
      Paint()
        ..strokeWidth = px * 2
        ..color = theme.bodyColor(Body.sun, lon),
    );
  }

  @override
  bool shouldRepaint(WheelPainter old) =>
      old.sky != sky ||
      old.slow != slow ||
      old.theme != theme ||
      old.mode != mode ||
      old.selected != selected ||
      old.animationMs != animationMs;
}
