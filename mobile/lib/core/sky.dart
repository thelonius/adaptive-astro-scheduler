/// Снимок неба на момент: положения, транзиты к наталу, лунные сутки,
/// планетарный час, живая палитра.
///
/// Делится на две части нарочно. Положения, транзиты и палитра считаются
/// за единицы миллисекунд и живут в UI-потоке. Лунные сутки и Луна без курса
/// стоят на порядки дороже: первое ищет до тридцати восходов Луны, второе
/// сканирует трое суток с шагом полчаса. Их считает изолят, и результат из
/// него возвращается примитивами, чтобы не зависеть от того, какие объекты
/// переживают пересылку между изолятами.
library;

import 'package:flutter/foundation.dart';

import 'ephemeris/ephemeris.dart';
import 'ephemeris/lunar.dart';
import 'ephemeris/palette.dart';
import 'ephemeris/transits.dart';

/// Быстрая часть: всё, что считается на месте.
class SkySnapshot {
  final double jd;
  final NatalChart natal;

  /// Долготы транзитных тел, индексы совпадают с Body.
  final List<double> lon;
  final List<double> speedPerDay;
  final List<bool> retrograde;

  /// Куспиды домов на месте наблюдателя сейчас.
  final List<double> cusp;

  /// Транзиты к наталу, самый точный первым.
  final List<Hit> hits;

  final PlanetaryHour hour;
  final LivePalette palette;

  /// Асцендент текущего неба. Он прибивает карту к левому краю экрана.
  final double ascendant;

  const SkySnapshot({
    required this.jd,
    required this.natal,
    required this.lon,
    required this.speedPerDay,
    required this.retrograde,
    required this.cusp,
    required this.hits,
    required this.hour,
    required this.palette,
    required this.ascendant,
  });

  double get moonPhase => moonIllumination(jd);
  int get moonSign => (lon[Body.moon.index] / 30.0).floor();
  int get sunSign => (lon[Body.sun.index] / 30.0).floor();

  /// Дом, в котором стоит транзитное тело.
  int houseOfBody(Body b) => houseOf(lon[b.index], cusp);

  /// Дом натальной карты, в котором стоит транзитное тело. Именно это
  /// показывают в разборе дня: событие приходит в конкретную сферу жизни.
  int natalHouseOfBody(Body b) => houseOf(lon[b.index], natal.cusp);

  static SkySnapshot compute(
    double jd,
    NatalChart natal,
    double lat,
    double lonEast,
  ) {
    final List<double> lon = <double>[
      for (int b = 0; b < bodyCount; b++) longitude(Body.values[b], jd)
    ];
    final List<double> spd = <double>[
      for (int b = 0; b < bodyCount; b++) speed(Body.values[b], jd)
    ];
    // Первый куспид это и есть асцендент, отдельно считать его незачем
    final List<double> cusp = houseCusps(jd, lat, lonEast);
    return SkySnapshot(
      jd: jd,
      natal: natal,
      lon: lon,
      speedPerDay: spd,
      // Солнце и Луна ретроградными не бывают, знак их скорости проверять
      // незачем
      retrograde: <bool>[
        for (int b = 0; b < bodyCount; b++)
          b != Body.sun.index && b != Body.moon.index && spd[b] < 0.0
      ],
      cusp: cusp,
      hits: findTransits(natal, jd),
      hour: planetaryHour(jd, lat, lonEast),
      palette: computePalette(jd, lat, lonEast),
      ascendant: cusp[0],
    );
  }
}

/// Медленная часть. Пересчитывается только при выходе времени за границы
/// лунных суток, а не каждую минуту.
class SlowSky {
  final LunarDay lunarDay;
  final bool moonVoid;

  /// Момент выхода Луны из знака. У безкурсовой Луны это и есть конец
  /// периода.
  final double moonEgressJd;

  const SlowSky({
    required this.lunarDay,
    required this.moonVoid,
    required this.moonEgressJd,
  });

  /// Ещё актуален ли снимок на момент jd.
  bool covers(double jd) => lunarDay.covers(jd) && jd < moonEgressJd;
}

/// Аргументы для изолята: только числа, чтобы пересылка была заведомо
/// безопасной.
typedef _SlowRequest = (double jd, double lat, double lonEast);
typedef _SlowReply = (int number, double startJd, double endJd, int moonSign,
    double phase, bool moonVoid, double egressJd);

_SlowReply _slowWorker(_SlowRequest req) {
  final (double jd, double lat, double lonEast) = req;
  final LunarDay d = computeLunarDay(jd, lat, lonEast);
  return (
    d.number,
    d.startJd,
    d.endJd,
    d.moonSign,
    d.phase,
    moonIsVoid(jd),
    moonSignEgress(jd),
  );
}

Future<SlowSky> computeSlowSky(double jd, double lat, double lonEast) async {
  final _SlowReply r = await compute(_slowWorker, (jd, lat, lonEast));
  return SlowSky(
    lunarDay: LunarDay(
      number: r.$1,
      startJd: r.$2,
      endJd: r.$3,
      moonSign: r.$4,
      phase: r.$5,
    ),
    moonVoid: r.$6,
    moonEgressJd: r.$7,
  );
}
