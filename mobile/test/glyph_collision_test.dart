library;

import 'package:astro_clock/features/wheel/glyph_collision.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('buildGlyphGroups объединяет близкие тела', () {
    final GlyphGroups g = buildGlyphGroups(
      <double>[0, 2, 90],
      3,
      79,
      13,
    );
    expect(g.any, isTrue);
    expect(g.of[0], g.of[1]);
    expect(g.of[2], isNot(g.of[0]));
  });

  test('glyphLevel пульсирует между low и 1', () {
    final GlyphGroups g = buildGlyphGroups(
      <double>[0, 1],
      2,
      79,
      13,
    );
    final double a = glyphLevel(g, 0, 0, low: 0.3);
    final double b = glyphLevel(g, 1, 0, low: 0.3);
    expect(a, closeTo(1.0, 0.01));
    expect(b, closeTo(0.3, 0.01));
  });
}
