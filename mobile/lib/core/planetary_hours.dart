/// Двадцать четыре планетарных часа календарного дня в месте наблюдения.
///
/// Сетка совпадает с [planetaryHour] в palette.dart: сутки от восхода до
/// следующего восхода, двенадцать неравных дневных и двенадцать ночных.
library;

import 'ephemeris/ephemeris.dart';
import 'ephemeris/palette.dart';
import '../data/settings.dart';

/// Короткие имена классических управителей для полоски часов.
const List<String> classicalShortNames = <String>[
  'Sun',
  'Moon',
  'Mer',
  'Ven',
  'Mars',
  'Jup',
  'Sat',
];

String rulerShortName(Body body) {
  if (body.index < classicalShortNames.length) {
    return classicalShortNames[body.index];
  }
  return body.name;
}

/// Смещение от UTC для места. Повторяет упрощение планировщика.
double utcOffsetForPlace(Place place) =>
    place.title == 'Москва' ? 3.0 : 0.0;

(int year, int month, int day) parseIsoDate(String iso) {
  final List<String> parts = iso.split('-');
  return (
    int.parse(parts[0]),
    int.parse(parts[1]),
    int.parse(parts[2]),
  );
}

class PlanetaryHourSlot {
  /// 0..23 от восхода.
  final int index;
  final Body ruler;
  final double startJd;
  final double endJd;
  final bool isDay;

  const PlanetaryHourSlot({
    required this.index,
    required this.ruler,
    required this.startJd,
    required this.endJd,
    required this.isDay,
  });

  /// Момент середины часа в UTC (для эфемерид).
  DateTime get momentUtc =>
      dateTimeFromJulianDay((startJd + endJd) / 2.0);

  /// Номер для UI: 1..24.
  int get displayNumber => index + 1;
}

class _DayBounds {
  final double rise;
  final double set;
  final double nextRise;

  const _DayBounds(this.rise, this.set, this.nextRise);
}

_DayBounds _boundsForNoon(double noonJd, double lat, double lonEast) {
  final double tr = solarTransit(noonJd, lonEast);
  final RiseSet? rs = solarRiseSet(tr, lat, lonEast);
  if (rs == null) {
    return _DayBounds(tr - 0.5, tr, tr + 0.5);
  }
  final double trNext = solarTransit(tr + 1.0, lonEast);
  final RiseSet? next = solarRiseSet(trNext, lat, lonEast);
  final double nextRise = next == null ? rs.set + 0.5 : next.rise;
  return _DayBounds(rs.rise, rs.set, nextRise);
}

/// Все двадцать четыре планетарных часа для календарной даты [isoDate]
/// (YYYY-MM-DD) в [place].
List<PlanetaryHourSlot> planetaryHoursForDay(String isoDate, Place place) {
  final (int year, int month, int day) = parseIsoDate(isoDate);
  final double offset = utcOffsetForPlace(place);
  final double noonJd =
      julianDayFromCivil(year, month, day, 12, 0, offset);
  final _DayBounds b = _boundsForNoon(noonJd, place.lat, place.lonEast);

  final double dayLen = (b.set - b.rise) / 12.0;
  final double nightLen = (b.nextRise - b.set) / 12.0;

  final Body dayRuler = weekdayRuler(weekdayOf(b.rise));
  int chaldeanStart = 0;
  for (int i = 0; i < chaldean.length; i++) {
    if (chaldean[i] == dayRuler) chaldeanStart = i;
  }

  final List<PlanetaryHourSlot> out = <PlanetaryHourSlot>[];
  for (int idx = 0; idx < 24; idx++) {
    final double start;
    final double len;
    if (idx < 12) {
      start = b.rise + idx * dayLen;
      len = dayLen;
    } else {
      start = b.set + (idx - 12) * nightLen;
      len = nightLen;
    }
    out.add(
      PlanetaryHourSlot(
        index: idx,
        ruler: chaldean[(chaldeanStart + idx) % 7],
        startJd: start,
        endJd: start + len,
        isDay: idx < 12,
      ),
    );
  }
  return out;
}
