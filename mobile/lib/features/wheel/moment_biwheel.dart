/// Неинтерактивный биwheel на произвольный момент — для планировщика и превью.
library;

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../core/ephemeris/ephemeris.dart';
import '../../core/ephemeris/transits.dart';
import '../../core/sky.dart';
import '../../data/settings.dart';
import 'wheel_painter.dart';
import 'wheel_theme.dart';

/// Высота превью в карточке планировщика.
const double momentBiwheelHeight = 200.0;

class MomentBiwheel extends StatelessWidget {
  final DateTime moment;

  const MomentBiwheel({super.key, required this.moment});

  @override
  Widget build(BuildContext context) {
    final AppScope scope = AppScope.of(context);
    final Settings settings = scope.settings;
    final NatalData natal = settings.natal;
    final Place place = settings.place;

    final NatalChart natalChart =
        NatalChart.compute(natal.julianDay, natal.lat, natal.lonEast);
    final double jd = julianDayFromDateTime(moment);
    final SkySnapshot sky =
        SkySnapshot.compute(jd, natalChart, place.lat, place.lonEast);

    final WheelTheme theme = settings.theme == 0
        ? WheelTheme.fromPalette(sky.palette)
        : fixedThemes[settings.theme - 1];

    return SizedBox(
      height: momentBiwheelHeight,
      width: double.infinity,
      child: CustomPaint(
        painter: WheelPainter(
          sky: sky,
          theme: theme,
          mode: WheelMode.biwheel,
          animationMs: DateTime.now().millisecondsSinceEpoch,
        ),
      ),
    );
  }
}
