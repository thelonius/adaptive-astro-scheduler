/// Натальная карта и транзиты к ней. Порт AstroClock/src/transits.h.
library;

import 'ephemeris.dart';

enum AspectKind { conjunction, sextile, square, trine, opposition }

class AspectDef {
  final double angle;
  final double orb;
  const AspectDef(this.angle, this.orb);
}

/// Орбисы транзитные, то есть заметно уже натальных. Мажорные аспекты только.
const Map<AspectKind, AspectDef> aspectDefs = <AspectKind, AspectDef>{
  AspectKind.conjunction: AspectDef(0.0, 2.0),
  AspectKind.sextile: AspectDef(60.0, 1.0),
  AspectKind.square: AspectDef(90.0, 1.5),
  AspectKind.trine: AspectDef(120.0, 1.5),
  AspectKind.opposition: AspectDef(180.0, 2.0),
};

const List<AspectKind> aspectKinds = AspectKind.values;

/// Натальные точки: десять тел плюс асцендент и середина неба.
const int natalAsc = bodyCount; // 10
const int natalMc = bodyCount + 1; // 11
const int natalPoints = bodyCount + 2; // 12

class NatalChart {
  /// Долготы натальных точек, индексы 0..9 — тела, 10 — ASC, 11 — MC.
  final List<double> lon;

  /// Куспиды по Плацидусу, аспекты к ним не ищутся.
  final List<double> cusp;
  final double jd;
  final double lat;
  final double lonEast;

  const NatalChart._(this.lon, this.cusp, this.jd, this.lat, this.lonEast);

  factory NatalChart.compute(double natalJd, double lat, double lonEast) {
    final List<double> lon = List<double>.filled(natalPoints, 0.0);
    for (int b = 0; b < bodyCount; b++) {
      lon[b] = longitude(Body.values[b], natalJd);
    }
    final List<double> cusp = houseCusps(natalJd, lat, lonEast);
    // Первый и десятый куспиды это и есть асцендент с серединой неба
    lon[natalAsc] = cusp[0];
    lon[natalMc] = cusp[9];
    return NatalChart._(lon, cusp, natalJd, lat, lonEast);
  }
}

class Hit {
  /// Индекс транзитного тела.
  final Body transiting;

  /// Индекс в NatalChart.lon.
  final int natalPoint;
  final AspectKind kind;

  /// Отклонение от точного, градусы, всегда >= 0.
  final double orb;

  /// Сходится (true) или расходится.
  final bool applying;

  const Hit(this.transiting, this.natalPoint, this.kind, this.orb, this.applying);

  /// 0 — точный аспект, 1 — на самой границе орбиса.
  double get slack => (orb / aspectDefs[kind]!.orb).clamp(0.0, 1.0);
}

/// Ищет активные транзиты. Результат отсортирован по орбису: самый точный
/// первым.
List<Hit> findTransits(NatalChart natal, double jd, {int maxOut = 64}) {
  final List<Hit> out = <Hit>[];

  for (int b = 0; b < bodyCount; b++) {
    final Body body = Body.values[b];
    final double tLon = longitude(body, jd);
    final double spd = speed(body, jd);

    for (int p = 0; p < natalPoints; p++) {
      // Разность знаковая: по модулю нельзя, иначе для соединения и оппозиции
      // теряется направление, а вместе с ним и схождение аспекта
      final double rel = angleDiff(tLon, natal.lon[p]);
      bool matched = false;

      for (final AspectKind k in aspectKinds) {
        if (matched) break;
        final AspectDef a = aspectDefs[k]!;
        for (int s = 0; s < 2; s++) {
          // Соединение и оппозиция симметричны, второй знак их дублирует
          if (s == 1 && (a.angle == 0.0 || a.angle == 180.0)) continue;
          final double target = (s == 0) ? a.angle : -a.angle;
          final double dev = angleDiff(rel, target);
          final double devAbs = dev.abs();
          if (devAbs > a.orb) continue;

          if (out.length < maxOut) {
            // Натальная точка неподвижна, поэтому отклонение меняется со
            // скоростью транзитного тела. Аспект сходится, когда отклонение
            // и скорость смотрят в разные стороны. Сравнивать орбис с орбисом
            // через шаг нельзя: за шаг тело перепрыгивает точный аспект
            out.add(Hit(body, p, k, devAbs, (dev * spd) < 0.0));
          }
          matched = true;
          break;
        }
      }
    }
  }

  out.sort((Hit a, Hit b) => a.orb.compareTo(b.orb));
  return out;
}

/// Луна без курса: до выхода из знака не образует ни одного мажорного аспекта
/// с планетами. Ошибка порта по Луне 0.015° даёт по времени около двух минут,
/// чего для границы периода достаточно.
bool moonIsVoid(double jd) {
  final double lon = longitude(Body.moon, jd);
  final int sign = (lon / 30.0).floor();
  final double egressLon = (sign + 1) * 30.0;

  // Луна проходит знак чуть меньше чем за 2.5 суток, шаг в полчаса ловит
  // прохождение точного аспекта без пропусков: относительная скорость не
  // превышает 15°/сутки, то есть 0.31° за шаг
  const double step = 1.0 / 48.0;
  const int slots = 5 * 2;

  // Аспект ищется по знаковой разности: угол между телами минус угол аспекта,
  // отдельно для опережения и отставания. Брать модуль разности нельзя —
  // для соединения он неотрицателен, для оппозиции неположителен, и смена
  // знака там не наступает никогда.
  final List<List<double>> prevDev = List<List<double>>.generate(
      bodyCount, (_) => List<double>.filled(slots, 0.0));
  bool havePrev = false;

  for (double t = jd; t < jd + 3.0; t += step) {
    final double mLon = longitude(Body.moon, t);
    if (t > jd && angleDiff(mLon, egressLon) >= 0.0) return true;

    for (int b = 0; b < bodyCount; b++) {
      if (b == Body.moon.index) continue;
      final double rel = angleDiff(mLon, longitude(Body.values[b], t));

      for (int ki = 0; ki < aspectKinds.length; ki++) {
        final AspectDef a = aspectDefs[aspectKinds[ki]]!;
        for (int s = 0; s < 2; s++) {
          final int slot = ki * 2 + s;
          // Соединение и оппозиция симметричны, второй знак их дублирует
          if (s == 1 && (a.angle == 0.0 || a.angle == 180.0)) {
            prevDev[b][slot] = 0.0;
            continue;
          }
          final double target = (s == 0) ? a.angle : -a.angle;
          final double dev = angleDiff(rel, target);
          if (havePrev) {
            final double p = prevDev[b][slot];
            final bool crossed = (p < 0 && dev >= 0) || (p > 0 && dev <= 0);
            // Отсечка по величине отбрасывает переход через ±180°, который
            // тоже меняет знак, но точным аспектом не является
            if (crossed && p < 6.0 && p > -6.0 && dev < 6.0 && dev > -6.0) {
              return false;
            }
          }
          prevDev[b][slot] = dev;
        }
      }
    }
    havePrev = true;
  }
  return false;
}

/// Момент, когда Луна выйдет из текущего знака.
double moonSignEgress(double jd) {
  final double lon = longitude(Body.moon, jd);
  final double egress = ((lon / 30.0).floor() + 1) * 30.0;
  double t = jd + angleDiff(egress, lon) / 13.176;
  for (int i = 0; i < 12; i++) {
    t -= angleDiff(longitude(Body.moon, t), egress % 360.0) / 13.176;
  }
  return t;
}
