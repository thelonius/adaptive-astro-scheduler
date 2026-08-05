/// Эталоны для порта эфемерид.
///
/// Числа сняты с прошивки: AstroClock/test/grid_dump.cpp собран тем же
/// компилятором, что уходит в образ, и его вывод сверен со swisseph скриптом
/// tool/compare_port.py. Здесь они лежат затем, чтобы регрессию ловил обычный
/// `flutter test`, без pyswisseph и без сборки C++.
///
/// Полную сверку гонять так:
///   python3 tool/compare_port.py 250 138.7 2435108.5
library;

import 'package:astro_clock/core/ephemeris/ephemeris.dart';
import 'package:astro_clock/core/ephemeris/lunar.dart';
import 'package:astro_clock/core/ephemeris/palette.dart';
import 'package:astro_clock/core/ephemeris/transits.dart';
import 'package:flutter_test/flutter_test.dart';

const double lat = 55.7558;
const double lon = 37.6173;

/// Порт совпадает с прошивкой побитово, поэтому допуск здесь на уровне
/// печати эталона, а не модели.
const double eps = 1e-6;

void expectAngle(double got, double want, {String? reason}) {
  expect(angleDiff(got, want).abs(), lessThan(eps), reason: reason);
}

void main() {
  group('долготы тел', () {
    test('JD 2461248.0, то есть 2026-07-26 12:00 UT', () {
      const double jd = 2461248.0;
      const List<double> want = <double>[
        123.532728852, // Солнце
        269.129807357, // Луна
        106.635594474, // Меркурий
        168.282418288, // Венера
        79.331645660, // Марс
        125.762552877, // Юпитер
        14.825328319, // Сатурн
        64.825147772, // Уран
        4.309602706, // Нептун
        304.290821785, // Плутон
      ];
      for (int b = 0; b < bodyCount; b++) {
        expectAngle(longitude(Body.values[b], jd), want[b],
            reason: 'тело $b');
      }
    });

    test('опорная карта J2000: 2000-01-01 12:00 UTC', () {
      // Полдень UT ровно на эпохе, поэтому julianDayFromCivil обязан выдать
      // круглые 2451545.0. Своя карта в исходники не кладётся, репозиторий
      // публичный; она вводится в настройках приложения.
      final double jd = julianDayFromCivil(2000, 1, 1, 12, 0, 0.0);
      expect(jd, closeTo(2451545.0, 1e-9));

      const List<double> want = <double>[
        280.372554879,
        223.314813428,
        271.895523455,
        241.570960939,
        327.967785406,
        25.346784693,
        40.233823374,
        314.795006851,
        303.186157118,
        251.449126130,
      ];
      for (int b = 0; b < bodyCount; b++) {
        expectAngle(longitude(Body.values[b], jd), want[b],
            reason: 'тело $b');
      }
    });
  });

  group('скорости и ретроградность', () {
    test('на JD 2461248.0 ретроградны Нептун и Плутон', () {
      const double jd = 2461248.0;
      expect(speed(Body.sun, jd), closeTo(0.955392210, eps));
      expect(speed(Body.moon, jd), closeTo(11.887797461, eps));
      expect(speed(Body.neptune, jd), closeTo(-0.010066153, eps));

      final List<Body> retro = <Body>[
        for (final Body b in Body.values)
          if (isRetrograde(b, jd)) b
      ];
      expect(retro, <Body>[Body.neptune, Body.pluto]);
    });
  });

  group('дома по Плацидусу', () {
    test('асцендент и МС на JD 2461248.0', () {
      const double jd = 2461248.0;
      expectAngle(ascendant(jd, lat, lon), 227.498426107);
      expectAngle(midheaven(jd, lon), 160.302733554);
    });

    test('все двенадцать куспидов', () {
      const double jd = 2461248.0;
      const List<double> want = <double>[
        227.498426107,
        257.420651945,
        298.634108696,
        340.302733554,
        10.610290419,
        31.759473984,
        47.498426107,
        77.420651945,
        118.634108696,
        160.302733554,
        190.610290419,
        211.759473984,
      ];
      final List<double> cusp = houseCusps(jd, lat, lon);
      for (int i = 0; i < 12; i++) {
        expectAngle(cusp[i], want[i], reason: 'куспид ${i + 1}');
      }
    });

    test('противоположные куспиды расходятся ровно на 180°', () {
      final List<double> cusp = houseCusps(2461248.0, lat, lon);
      for (int i = 0; i < 6; i++) {
        expectAngle(cusp[i] + 180.0, cusp[i + 6], reason: 'пара ${i + 1}');
      }
    });

    test('houseOf кладёт куспид в его собственный дом', () {
      final List<double> cusp = houseCusps(2461248.0, lat, lon);
      for (int i = 0; i < 12; i++) {
        expect(houseOf(cusp[i] + 0.001, cusp), i + 1);
      }
    });
  });

  group('транзиты', () {
    test('найденные аспекты укладываются в свои орбисы и отсортированы', () {
      final NatalChart natal = NatalChart.compute(
          julianDayFromCivil(2000, 1, 1, 12, 0, 0.0), lat, lon);
      final List<Hit> hits = findTransits(natal, 2461248.0);

      for (final Hit h in hits) {
        expect(h.orb, lessThanOrEqualTo(aspectDefs[h.kind]!.orb));
        expect(h.orb, greaterThanOrEqualTo(0));
        // Аспект действительно есть: разность долгот отстоит от угла
        // аспекта не дальше орбиса
        final double rel = angleDiff(
            longitude(h.transiting, 2461248.0), natal.lon[h.natalPoint]);
        final double target = aspectDefs[h.kind]!.angle;
        final double dev = <double>[
          angleDiff(rel, target).abs(),
          angleDiff(rel, -target).abs(),
        ].reduce((double a, double b) => a < b ? a : b);
        expect(dev, closeTo(h.orb, 1e-9));
      }

      for (int i = 1; i < hits.length; i++) {
        expect(hits[i].orb, greaterThanOrEqualTo(hits[i - 1].orb));
      }
    });

    test('натальные ASC и MC берутся из первого и десятого куспида', () {
      final NatalChart n = NatalChart.compute(
          julianDayFromCivil(2000, 1, 1, 12, 0, 0.0), lat, lon);
      expectAngle(n.lon[natalAsc], 87.788313060);
      expectAngle(n.lon[natalMc], 315.613339645);
      expect(n.lon[natalAsc], n.cusp[0]);
      expect(n.lon[natalMc], n.cusp[9]);
    });
  });

  group('лунные сутки и Луна без курса', () {
    // Эталоны с `grid_dump 6 4.7 2461248.0 55.7558 37.6173 slow`. Шаг 4.7
    // суток нарочно не кратен лунному месяцу: точки ложатся в разные места
    // цикла, а не в одну и ту же его фазу.
    const List<(double, int, double, double, int, double, bool)> want =
        <(double, int, double, double, int, double, bool)>[
      (2461248.0, 12, 2461247.161865337, 2461248.197400880, 8, 0.912542343, true),
      (2461252.7, 17, 2461252.253965363, 2461253.259228317, 10, 0.975270450, true),
      (2461257.4, 22, 2461257.277704380, 2461258.285278935, 0, 0.632497370, true),
      (2461262.1, 26, 2461261.349798155, 2461262.401841590, 3, 0.134146884, false),
      (2461266.8, 3, 2461266.671050111, 2461267.732494072, 5, 0.032317422, true),
      (2461271.5, 7, 2461270.908200712, 2461271.965781232, 7, 0.391880900, false),
    ];

    test('номер, границы, знак и фаза', () {
      for (final (double jd, int n, double start, double end, int sign,
              double phase, bool _) in want) {
        final LunarDay d = computeLunarDay(jd, lat, lon);
        expect(d.number, n, reason: 'номер на JD $jd');
        // Границы суток это моменты восхода Луны, найденные бисекцией;
        // 1e-7 суток это девять миллисекунд
        expect(d.startJd, closeTo(start, 1e-7), reason: 'начало на JD $jd');
        expect(d.endJd, closeTo(end, 1e-7), reason: 'конец на JD $jd');
        expect(d.moonSign, sign, reason: 'знак на JD $jd');
        // Освещённость в прошивке лежит во float, в Dart это double, отсюда
        // разница в восьмом знаке. На проценты в интерфейсе не влияет
        expect(d.phase, closeTo(phase, 1e-7), reason: 'фаза на JD $jd');
        expect(d.covers(jd), isTrue, reason: 'сутки покрывают свой JD');
      }
    });

    test('Луна без курса совпадает с прошивкой', () {
      for (final (double jd, int _, double _, double _, int _, double _,
              bool isVoid) in want) {
        expect(moonIsVoid(jd), isVoid, reason: 'JD $jd');
      }
    });

    test('выход из знака лежит впереди и не дальше двух с половиной суток', () {
      for (final (double jd, int _, double _, double _, int sign, double _,
              bool _) in want) {
        final double egress = moonSignEgress(jd);
        expect(egress, greaterThan(jd));
        expect(egress - jd, lessThan(2.6));
        // В момент выхода Луна стоит ровно на границе следующего знака
        expect(angleDiff(longitude(Body.moon, egress), (sign + 1) * 30.0).abs(),
            lessThan(0.01));
      }
    });

    test('таблица тридцати дней согласована с масками', () {
      expect(lunarDayTable.length, 30);
      for (int i = 0; i < 30; i++) {
        final LunarDayInfo d = lunarDayTable[i];
        expect(d.number, i + 1);
        expect(d.title, isNotEmpty);
        expect(d.tone, inInclusiveRange(-1, 1));
        // Одна и та же сфера не может быть одновременно и к месту, и не к месту
        expect(d.yes.toSet().intersection(d.no.toSet()), isEmpty,
            reason: '${d.number}-й день');
      }
    });
  });

  group('палитра', () {
    test('управитель часа идёт по халдейскому ряду от управителя дня', () {
      const double jd = 2461248.0;
      final PlanetaryHour h = planetaryHour(jd, lat, lon);
      final int start = chaldean.indexOf(h.dayRuler);
      expect(start, isNonNegative);
      expect(h.ruler, chaldean[(start + h.index) % 7]);
      expect(h.index, inInclusiveRange(0, 23));
      expect(jd, inInclusiveRange(h.startJd, h.endJd));
    });

    test('OKLCH не уезжает за гамут', () {
      for (double hue = 0; hue < 360; hue += 7) {
        final c = oklch(0.75, 0.14, hue);
        expect(c.a, 1.0);
      }
    });

    test('модуляция от аспектов не превышает потолков библиотеки', () {
      for (double jd = 2461248.0; jd < 2461248.0 + 40; jd += 1.3) {
        final Modulation m = aspectModulation(jd);
        expect(m.chromaBoost, inInclusiveRange(0.0, 0.04));
        expect(m.lightnessBoost, inInclusiveRange(0.0, 3.0));
      }
    });
  });

  group('углы', () {
    test('norm360 и angleDiff', () {
      expect(norm360(-1.0), closeTo(359.0, 1e-12));
      expect(norm360(721.0), closeTo(1.0, 1e-12));
      expect(angleDiff(10.0, 350.0), closeTo(20.0, 1e-12));
      expect(angleDiff(350.0, 10.0), closeTo(-20.0, 1e-12));
    });

    test('юлианская дата туда и обратно', () {
      // Опорная точка J2000: полдень 1 января 2000 года по UT
      final DateTime t = DateTime.utc(2000, 1, 1, 12, 0, 0);
      final double jd = julianDayFromDateTime(t);
      expect(jd, closeTo(j2000, 1e-9));
      expect(dateTimeFromJulianDay(jd), t);
      expect(julianDayFromCivil(2000, 1, 1, 12, 0, 0.0), closeTo(j2000, 1e-9));
    });
  });
}
