/// Темы колеса. Нулевая живая, дальше восемь фиксированных — те же, что
/// перебирает длинное нажатие кнопки на часах.
library;

import 'package:flutter/painting.dart';

import '../../core/ephemeris/ephemeris.dart';
import '../../core/ephemeris/palette.dart';
import '../../core/ephemeris/transits.dart';

/// RGB565 в обычный цвет. Таблицы тем оставлены в исходном формате прошивки:
/// так их видно построчно рядом с C++ и не надо сверять пересчитанные числа.
Color from565(int c) {
  final int r = (c >> 11) & 0x1F;
  final int g = (c >> 5) & 0x3F;
  final int b = c & 0x1F;
  return Color.fromARGB(
    255,
    (r * 255 / 31).round(),
    (g * 255 / 63).round(),
    (b * 255 / 31).round(),
  );
}

class WheelTheme {
  final String name;
  final Color bg, ring, fire, earth, air, water, text;

  /// Цвета знаков зодиака. В живой палитре знак красится собственной
  /// долготой, и кольцо становится плавным цветовым кругом; в фиксированных
  /// темах остаётся стихия.
  final List<Color>? signColors;

  /// Цвета тел. null — берётся цвет стихии знака, где тело стоит.
  final List<Color>? bodyColors;

  const WheelTheme({
    required this.name,
    required this.bg,
    required this.ring,
    required this.fire,
    required this.earth,
    required this.air,
    required this.water,
    required this.text,
    this.signColors,
    this.bodyColors,
  });

  Color signColor(int sign) {
    final List<Color>? sc = signColors;
    if (sc != null) return sc[sign % 12];
    return switch (sign % 4) {
      0 => fire,
      1 => earth,
      2 => air,
      _ => water,
    };
  }

  Color bodyColor(Body b, double lon) {
    final List<Color>? bc = bodyColors;
    if (bc != null) return bc[b.index];
    return signColor((lon / 30.0).floor());
  }

  static WheelTheme fromPalette(LivePalette p) => WheelTheme(
        name: 'живая',
        bg: p.bg,
        ring: p.border,
        fire: p.accent,
        earth: p.accent,
        air: p.accent,
        water: p.accent,
        text: p.text,
        signColors: p.sign,
        bodyColors: p.body,
      );
}

/// Восемь фиксированных тем в том же порядке, что в AstroUI.
final List<WheelTheme> fixedThemes = <WheelTheme>[
  _fixed('Classic', 0x0000, 0xCE79, 0xF800, 0x07E0, 0xFFE0, 0x001F, 0xFFFF),
  _fixed('Cyber', 0x0008, 0x07FF, 0xF81F, 0x07E0, 0x07FF, 0x001F, 0xFFFF),
  _fixed('Blood Moon', 0x1000, 0xF800, 0xA000, 0x4000, 0x6000, 0x2000, 0xDEFB),
  _fixed('Emerald', 0x0000, 0x07E0, 0x0400, 0x07E0, 0x0600, 0x0200, 0xE7FF),
  _fixed('Vaporwave', 0x2008, 0xF81F, 0x07FF, 0xF81F, 0xFFE0, 0x780F, 0xFFFF),
  _fixed('Solar', 0x2000, 0xFD20, 0xF800, 0xFD20, 0xFFE0, 0xFFFF, 0xFFFF),
  _fixed('Deep Sea', 0x0005, 0x07FF, 0x03FF, 0x07FF, 0x05FF, 0x001F, 0xFFFF),
  _fixed('Nebula', 0x0000, 0x780F, 0xF81F, 0x780F, 0x07FF, 0x001F, 0xFFFF),
];

WheelTheme _fixed(String name, int bg, int ring, int fire, int earth, int air,
        int water, int text) =>
    WheelTheme(
      name: name,
      bg: from565(bg),
      ring: from565(ring),
      fire: from565(fire),
      earth: from565(earth),
      air: from565(air),
      water: from565(water),
      text: from565(text),
    );

/// Цвет аспектной линии. Гармоничные синие, напряжённые красные: hue от
/// долготы стёр бы это различие, поэтому здесь цвета остались смысловыми.
Color aspectColor(AspectKind kind) => switch (kind) {
      AspectKind.conjunction => from565(0x07FF),
      AspectKind.sextile => from565(0x04FF),
      AspectKind.trine => from565(0x02DF),
      AspectKind.square => from565(0xF800),
      AspectKind.opposition => from565(0xFB00),
    };
