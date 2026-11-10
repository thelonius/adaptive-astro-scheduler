/// Отрисовка растров 13×13 с часов на Canvas Flutter.
library;

import 'package:flutter/material.dart';

import 'glyphs.dart';

/// Затемнение долей 0..1, как AstroUI::fade.
Color fadeColor(Color c, double k) {
  if (k >= 1.0) return c;
  if (k <= 0.0) k = 0.0;
  return Color.fromARGB(
    c.alpha,
    (c.red * k).round().clamp(0, 255),
    (c.green * k).round().clamp(0, 255),
    (c.blue * k).round().clamp(0, 255),
  );
}

/// Целые доли, как AstroUI::dim(c, num, den).
Color dimColor(Color c, int num, int den) => fadeColor(c, num / den);

void blitGlyph(
  Canvas canvas,
  List<int> rows,
  Offset center,
  Color color,
  double pixel,
) {
  final double x0 = center.dx - glyphSize * pixel / 2;
  final double y0 = center.dy - glyphSize * pixel / 2;
  final Paint paint = Paint()..color = color;
  for (int row = 0; row < rows.length; row++) {
    final int bits = rows[row];
    if (bits == 0) continue;
    for (int col = 0; col < glyphSize; col++) {
      if (bits & (1 << (glyphSize - 1 - col)) != 0) {
        canvas.drawRect(
          Rect.fromLTWH(x0 + col * pixel, y0 + row * pixel, pixel, pixel),
          paint,
        );
      }
    }
  }
}

void drawSignGlyph(
  Canvas canvas,
  int signIndex,
  Offset center,
  Color color,
  double pixel,
) {
  if (signIndex < 0 || signIndex > 11) return;
  blitGlyph(canvas, signGlyphBits[signIndex], center, color, pixel);
}

void drawPlanetGlyph(
  Canvas canvas,
  PlanetGlyph glyph,
  Offset center,
  Color color,
  double pixel,
) {
  blitGlyph(canvas, planetGlyphBits[glyph.index], center, color, pixel);
}

/// Кольцо безкурсовой Луны, как AstroUI::voidRing.
void drawVoidRing(Canvas canvas, Offset center, Color color, double pixel,
    {required double bright}) {
  final Color c = fadeColor(color, 0.25 + 0.75 * bright);
  final Paint stroke = Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = pixel
    ..color = c;
  canvas.drawCircle(center, pixel * 10, stroke);
  canvas.drawCircle(center, pixel * 11, stroke..color = fadeColor(c, 0.4));
}
