// Дамп расчёта на сетке дат. Формат совпадает с AstroClock/test/grid_dump.cpp,
// чтобы порт можно было сверить с прошивкой построчно, и разбирается
// tool/compare_port.py, который дополнительно сверяет всё со swisseph.
//
//   dart run tool/dump_grid.dart [count] [step] [startJD] [lat] [lon] [slow]
//
// Шестой аргумент `slow` добавляет лунные сутки и Луну без курса. По умолчанию
// их нет: одна такая точка стоит трёх десятков поисков восхода Луны.

import 'dart:io';

import 'package:astro_clock/core/ephemeris/ephemeris.dart';
import 'package:astro_clock/core/ephemeris/lunar.dart';
import 'package:astro_clock/core/ephemeris/transits.dart';

void main(List<String> args) {
  final int count = args.isNotEmpty ? int.parse(args[0]) : 200;
  final double step = args.length > 1 ? double.parse(args[1]) : 173.7;
  // 1955-01-01, нижняя граница замеров в README часов
  final double start = args.length > 2 ? double.parse(args[2]) : 2435108.5;
  final double lat = args.length > 3 ? double.parse(args[3]) : 55.7558;
  final double lon = args.length > 4 ? double.parse(args[4]) : 37.6173;
  final bool slow = args.length > 5 && args[5] == 'slow';

  final StringBuffer out = StringBuffer();
  for (int i = 0; i < count; i++) {
    final double jd = start + i * step;
    out.writeln('JD ${jd.toStringAsFixed(9)}');
    for (int b = 0; b < bodyCount; b++) {
      final Body body = Body.values[b];
      out.writeln('L $b ${longitude(body, jd).toStringAsFixed(9)} '
          '${speed(body, jd).toStringAsFixed(9)}');
    }
    out.writeln('ASC ${ascendant(jd, lat, lon).toStringAsFixed(9)}');
    out.writeln('MC ${midheaven(jd, lon).toStringAsFixed(9)}');
    final List<double> cusp = houseCusps(jd, lat, lon);
    for (int c = 0; c < 12; c++) {
      out.writeln('C $c ${cusp[c].toStringAsFixed(9)}');
    }
    if (slow) {
      final LunarDay d = computeLunarDay(jd, lat, lon);
      out.writeln('LD ${d.number} ${d.startJd.toStringAsFixed(9)} '
          '${d.endJd.toStringAsFixed(9)} ${d.moonSign} '
          '${d.phase.toStringAsFixed(9)}');
      out.writeln('VOID ${moonIsVoid(jd) ? 1 : 0}');
    }
  }
  stdout.write(out.toString());
}
