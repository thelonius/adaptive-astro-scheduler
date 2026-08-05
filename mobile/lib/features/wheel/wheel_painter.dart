/// Колесо: зодиак снаружи, транзитные планеты, натальные приглушённые,
/// линии аспектов между ними.
///
/// Геометрия повторяет часы (AstroUI.h), только в долях от радиуса вместо
/// пикселей 240×240. Асцендент прибит к левому краю, долгота растёт против
/// часовой стрелки. Отсюда метка Солнца на ободе работает суточной стрелкой:
/// вверху около полудня, справа на закате, внизу в полночь, слева на восходе.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/ephemeris/ephemeris.dart';
import '../../core/ephemeris/names.dart';
import '../../core/ephemeris/transits.dart';
import '../../core/sky.dart';
import 'wheel_theme.dart';

enum WheelMode {
  /// Зодиак, транзитные планеты, натальные, линии аспектов.
  biwheel('биwheel'),

  /// То же без натального слоя.
  sky('небо');

  final String label;
  const WheelMode(this.label);
}

/// Радиусы в долях от половины стороны. Числа те же, что в layout:: часов,
/// поделённые на 120.
class WheelGeometry {
  static const double ringOut = 117 / 120;
  static const double ringIn = 91 / 120;
  static const double sign = 104 / 120;
  static const double transit = 79 / 120;
  static const double natalRing = 64 / 120;
  static const double natal = 56 / 120;
  static const double aspect = 45 / 120;

  final Offset center;
  final double radius;
  final double ascendant;

  const WheelGeometry({
    required this.center,
    required this.radius,
    required this.ascendant,
  });

  /// Долгота в экранный угол в радианах.
  double angle(double longitude) {
    double a = 180.0 - (longitude - ascendant);
    while (a < 0) {
      a += 360.0;
    }
    while (a >= 360) {
      a -= 360.0;
    }
    return a * math.pi / 180.0;
  }

  Offset at(double longitude, double r) {
    final double a = angle(longitude);
    return Offset(
      center.dx + radius * r * math.cos(a),
      center.dy + radius * r * math.sin(a),
    );
  }
}

/// Приглушение цвета долей, как dim() в прошивке.
Color _dim(Color c, double f) => Color.fromARGB(
      c.a > 0 ? (c.a * 255).round() : 255,
      (c.r * 255 * f).round().clamp(0, 255),
      (c.g * 255 * f).round().clamp(0, 255),
      (c.b * 255 * f).round().clamp(0, 255),
    );

/// TextPainter'ы глифов переживают кадр: колесо перерисовывается раз в
/// секунду, и раскладывать те же три десятка символов заново незачем.
final Map<String, TextPainter> _glyphCache = <String, TextPainter>{};

TextPainter _glyph(String text, Color color, double size,
    {FontWeight weight = FontWeight.w400}) {
  final String key =
      '$text|${color.toARGB32()}|${size.toStringAsFixed(1)}|${weight.value}';
  final TextPainter? cached = _glyphCache[key];
  if (cached != null) return cached;

  final TextPainter tp = TextPainter(
    text: TextSpan(
      text: text,
      style: TextStyle(color: color, fontSize: size, fontWeight: weight, height: 1.0),
    ),
    textDirection: TextDirection.ltr,
  )..layout();
  // Кэш растёт только при смене темы или размера экрана, но подстраховка
  // от бесконечного роста нужна: цвет живой палитры плывёт каждую минуту
  if (_glyphCache.length > 512) _glyphCache.clear();
  _glyphCache[key] = tp;
  return tp;
}

void _drawGlyph(Canvas canvas, String text, Offset at, Color color, double size,
    {FontWeight weight = FontWeight.w400}) {
  final TextPainter tp = _glyph(text, color, size, weight: weight);
  tp.paint(canvas, at - Offset(tp.width / 2, tp.height / 2));
}

class WheelPainter extends CustomPainter {
  final SkySnapshot sky;
  final SlowSky? slow;
  final WheelTheme theme;
  final WheelMode mode;

  /// Подсвеченный транзит: его участники обводятся, остальные линии гаснут.
  final Hit? selected;

  const WheelPainter({
    required this.sky,
    required this.theme,
    required this.mode,
    this.slow,
    this.selected,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final double radius = math.min(size.width, size.height) / 2;
    final WheelGeometry g = WheelGeometry(
      center: Offset(size.width / 2, size.height / 2),
      radius: radius,
      ascendant: sky.ascendant,
    );
    final double px = radius / 120; // толщина «пикселя» часов в точках экрана

    _paintZodiac(canvas, g, px);
    if (mode == WheelMode.biwheel) {
      _paintCusps(canvas, g, px);
      _paintAspects(canvas, g, px);
      _paintNatal(canvas, g, px);
    }
    _paintTransits(canvas, g, px);
    _paintSunMark(canvas, g, px);
  }

  // --- зодиакальное кольцо --------------------------------------------------

  void _paintZodiac(Canvas canvas, WheelGeometry g, double px) {
    final Color ringCol = _dim(theme.ring, 1 / 3);
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
        ..color = _dim(theme.ring, 1 / 5),
    );

    for (int i = 0; i < 12; i++) {
      final double edge = i * 30.0;
      canvas.drawLine(
        g.at(edge, WheelGeometry.ringIn),
        g.at(edge, WheelGeometry.ringOut),
        stroke,
      );
      _drawGlyph(
        canvas,
        signGlyphs[i],
        g.at(edge + 15.0, WheelGeometry.sign),
        theme.signColor(i),
        px * 15,
      );
    }
  }

  // --- куспиды --------------------------------------------------------------

  /// Засечки двенадцати натальных куспидов в свободном кольце между
  /// натальными и транзитными глифами. Угловые длиннее: их читают первыми.
  void _paintCusps(Canvas canvas, WheelGeometry g, double px) {
    for (int i = 0; i < 12; i++) {
      final bool angular = i == 0 || i == 3 || i == 6 || i == 9;
      final Paint p = Paint()
        ..strokeWidth = px
        ..color = angular ? _dim(theme.ring, 0.8) : _dim(theme.ring, 0.35);
      final double r0 = angular ? 65 / 120 : 66 / 120;
      final double r1 = angular ? 77 / 120 : 71 / 120;
      canvas.drawLine(
        g.at(sky.natal.cusp[i], r0),
        g.at(sky.natal.cusp[i], r1),
        p,
      );
    }
  }

  // --- аспекты --------------------------------------------------------------

  void _paintAspects(Canvas canvas, WheelGeometry g, double px) {
    for (final Hit h in sky.hits.reversed) {
      final bool isSelected = selected != null &&
          selected!.transiting == h.transiting &&
          selected!.natalPoint == h.natalPoint &&
          selected!.kind == h.kind;
      // Когда что-то выбрано, остальное уходит в фон, но не исчезает:
      // карта должна оставаться картой
      final double emphasis = selected == null ? 1.0 : (isSelected ? 1.0 : 0.25);

      final double tLon = sky.lon[h.transiting.index];
      final double nLon = sky.natal.lon[h.natalPoint];
      final Color base = aspectColor(h.kind);

      if (h.kind == AspectKind.conjunction) {
        _paintConjunction(canvas, g, px, tLon, nLon, base, h.slack, emphasis);
      } else {
        // Чем точнее аспект, тем ярче линия
        final double f = (1.0 - 0.8 * h.slack) * emphasis;
        canvas.drawLine(
          g.at(tLon, WheelGeometry.aspect),
          g.at(nLon, WheelGeometry.aspect),
          Paint()
            ..strokeWidth = px * (isSelected ? 2.0 : 1.0)
            ..color = _dim(base, f.clamp(0.2, 1.0)),
        );
      }
    }
  }

  /// У соединения углы транзитной и натальной точки почти совпадают, и хорда
  /// на радиусе аспектов вырождается в точку. Поэтому соединение рисуется
  /// радиальной перемычкой между кольцами: она заодно прямо показывает, какая
  /// пара тел сошлась.
  void _paintConjunction(Canvas canvas, WheelGeometry g, double px,
      double tLon, double nLon, Color base, double slack, double emphasis) {
    final double f = ((1.0 - 0.6 * slack) * emphasis).clamp(0.2, 1.0);
    final Offset a = g.at(nLon, (56 + 6) / 120);
    final Offset b = g.at(tLon, (79 - 7) / 120);
    final Paint p = Paint()
      ..strokeWidth = px * 2
      ..color = _dim(base, f);
    canvas.drawLine(a, b, p);
  }

  // --- натальный слой -------------------------------------------------------

  void _paintNatal(Canvas canvas, WheelGeometry g, double px) {
    for (int b = 0; b < bodyCount; b++) {
      final double lon = sky.natal.lon[b];
      // Натальная планета работает фоном, событие происходит снаружи. Ниже
      // трёх пятых глиф не приглушается: на часах там начиналась каша из-за
      // квантования RGB565, и хотя телефону это не грозит, кольца должны
      // читаться одинаково на обоих устройствах
      _drawGlyph(
        canvas,
        bodyGlyphs[b],
        g.at(lon, WheelGeometry.natal),
        _dim(theme.bodyColor(Body.values[b], lon), 0.6),
        px * 13,
      );
    }

    _paintNatalAngle(canvas, g, px, sky.natal.lon[natalAsc], isAsc: true);
    _paintNatalAngle(canvas, g, px, sky.natal.lon[natalMc], isAsc: false);
  }

  /// Асцендент и МС рисуются засечкой, а не глифом.
  void _paintNatalAngle(Canvas canvas, WheelGeometry g, double px, double lon,
      {required bool isAsc}) {
    final Paint p = Paint()
      ..strokeWidth = px * 1.5
      ..color = _dim(theme.text, 0.7);
    canvas.drawLine(
      g.at(lon, (56 - 6) / 120),
      g.at(lon, WheelGeometry.natalRing),
      p,
    );
    if (isAsc) {
      canvas.drawCircle(
        g.at(lon, (56 - 10) / 120),
        px * 2,
        Paint()..color = _dim(theme.text, 0.7),
      );
    }
  }

  // --- транзитный слой ------------------------------------------------------

  void _paintTransits(Canvas canvas, WheelGeometry g, double px) {
    // Участники аспектов обводятся кружком
    final Set<int> highlighted = <int>{
      for (final Hit h in sky.hits) h.transiting.index
    };

    for (int b = 0; b < bodyCount; b++) {
      final double lon = sky.lon[b];
      final Color color = theme.bodyColor(Body.values[b], lon);
      final Offset at = g.at(lon, WheelGeometry.transit);

      if (highlighted.contains(b)) {
        canvas.drawCircle(
          at,
          px * 9,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = px
            ..color = _dim(color, 0.5),
        );
      }

      _drawGlyph(canvas, bodyGlyphs[b], at, color, px * 15,
          weight: FontWeight.w500);

      // Ретроградность помечается точкой под глифом: буква R на этом размере
      // нечитаема
      if (sky.retrograde[b]) {
        canvas.drawCircle(
            at + Offset(0, px * 10), px * 1.6, Paint()..color = color);
      }

      // Луна без курса: статичное двойное кольцо. Мигание перерисовывало
      // весь кадр дважды в секунду и мешало разглядеть карту
      if (b == Body.moon.index && (slow?.moonVoid ?? false)) {
        for (final (double r, double f) in <(double, double)>[
          (10, 0.6),
          (11.5, 0.2)
        ]) {
          canvas.drawCircle(
            at,
            px * r,
            Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = px
              ..color = _dim(color, f),
          );
        }
      }
    }
  }

  /// Метка текущего положения Солнца на внешнем ободе: суточная стрелка.
  void _paintSunMark(Canvas canvas, WheelGeometry g, double px) {
    final double lon = sky.lon[Body.sun.index];
    canvas.drawLine(
      g.at(lon, WheelGeometry.ringOut),
      g.at(lon, 1.0),
      Paint()
        ..strokeWidth = px * 2
        ..color = theme.text,
    );
  }

  @override
  bool shouldRepaint(WheelPainter old) =>
      old.sky != sky ||
      old.slow != slow ||
      old.theme != theme ||
      old.mode != mode ||
      old.selected != selected;
}
