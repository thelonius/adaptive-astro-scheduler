/// Натальные данные, место наблюдения и адрес бэкенда.
///
/// У часов всё это задавалось build-флагами: клавиатуры у устройства нет,
/// владелец один. У телефона клавиатура есть, поэтому те же поля живут
/// в настройках и переживают перезапуск.
library;

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/ephemeris/ephemeris.dart';

/// Значения по умолчанию нейтральные: своя карта вводится на экране настроек
/// и живёт в SharedPreferences. У часов она задаётся build-флагами из
/// secrets.ini по той же причине — репозиторий публичный.
class NatalData {
  final int year, month, day, hour, minute;

  /// Смещение от UTC на момент рождения, с декретным и летним временем.
  /// Для Москвы сентября 1984 это UTC+4: летнее время отменили 30 сентября.
  final double utcOffset;
  final double lat;
  final double lonEast;

  const NatalData({
    required this.year,
    required this.month,
    required this.day,
    required this.hour,
    required this.minute,
    required this.utcOffset,
    required this.lat,
    required this.lonEast,
  });

  /// Эпоха J2000 в Гринвиче. Карта по ней осмысленна ровно настолько, чтобы
  /// экран нарисовался до того, как пользователь введёт свою.
  static const NatalData defaults = NatalData(
    year: 2000,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    utcOffset: 0.0,
    lat: 0.0,
    lonEast: 0.0,
  );

  double get julianDay =>
      julianDayFromCivil(year, month, day, hour, minute, utcOffset);

  NatalData copyWith({
    int? year,
    int? month,
    int? day,
    int? hour,
    int? minute,
    double? utcOffset,
    double? lat,
    double? lonEast,
  }) =>
      NatalData(
        year: year ?? this.year,
        month: month ?? this.month,
        day: day ?? this.day,
        hour: hour ?? this.hour,
        minute: minute ?? this.minute,
        utcOffset: utcOffset ?? this.utcOffset,
        lat: lat ?? this.lat,
        lonEast: lonEast ?? this.lonEast,
      );
}

/// Где стоит наблюдатель сейчас. От этого зависят дома, планетарные часы
/// и границы лунных суток.
class Place {
  final String title;
  final double lat;
  final double lonEast;
  const Place(this.title, this.lat, this.lonEast);

  static const Place moscow = Place('Москва', 55.7558, 37.6173);
}

class Settings extends ChangeNotifier {
  NatalData _natal = NatalData.defaults;
  Place _place = Place.moscow;
  String _apiBase = defaultApiBase;
  bool _offlineOnly = false;
  int _theme = 0;
  String? _pairedDeviceId;
  String? _pairedDeviceName;

  /// Прод стоит за Caddy соседнего стека, порт 4443 — не опечатка.
  static const String defaultApiBase = 'https://astro-31-130-130-11.sslip.io:4443';

  NatalData get natal => _natal;
  Place get place => _place;
  String get apiBase => _apiBase;

  /// Не ходить в сеть за толкованиями вообще. Карта от этого не меняется.
  bool get offlineOnly => _offlineOnly;

  /// 0 — живая палитра, дальше фиксированные, как на часах.
  int get theme => _theme;

  /// remoteId сопряжённых часов (MAC на Android), null — не сопряжено.
  String? get pairedDeviceId => _pairedDeviceId;
  String? get pairedDeviceName => _pairedDeviceName;

  Uri get apiUri => Uri.parse(_apiBase);

  static const String _kNatal = 'natal';
  static const String _kPlace = 'place';
  static const String _kApi = 'apiBase';
  static const String _kOffline = 'offlineOnly';
  static const String _kTheme = 'theme';
  static const String _kDeviceId = 'pairedDeviceId';
  static const String _kDeviceName = 'pairedDeviceName';

  Future<void> load() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    final List<String>? n = prefs.getStringList(_kNatal);
    if (n != null && n.length == 8) {
      _natal = NatalData(
        year: int.parse(n[0]),
        month: int.parse(n[1]),
        day: int.parse(n[2]),
        hour: int.parse(n[3]),
        minute: int.parse(n[4]),
        utcOffset: double.parse(n[5]),
        lat: double.parse(n[6]),
        lonEast: double.parse(n[7]),
      );
    }

    final List<String>? pl = prefs.getStringList(_kPlace);
    if (pl != null && pl.length == 3) {
      _place = Place(pl[0], double.parse(pl[1]), double.parse(pl[2]));
    }

    _apiBase = prefs.getString(_kApi) ?? defaultApiBase;
    _offlineOnly = prefs.getBool(_kOffline) ?? false;
    _theme = prefs.getInt(_kTheme) ?? 0;
    _pairedDeviceId = prefs.getString(_kDeviceId);
    _pairedDeviceName = prefs.getString(_kDeviceName);
    notifyListeners();
  }

  Future<void> setNatal(NatalData value) async {
    _natal = value;
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kNatal, <String>[
      '${value.year}',
      '${value.month}',
      '${value.day}',
      '${value.hour}',
      '${value.minute}',
      '${value.utcOffset}',
      '${value.lat}',
      '${value.lonEast}',
    ]);
  }

  Future<void> setPlace(Place value) async {
    _place = value;
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
        _kPlace, <String>[value.title, '${value.lat}', '${value.lonEast}']);
  }

  Future<void> setApiBase(String value) async {
    _apiBase = value.trim();
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kApi, _apiBase);
  }

  Future<void> setOfflineOnly(bool value) async {
    _offlineOnly = value;
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kOffline, value);
  }

  Future<void> setTheme(int value) async {
    _theme = value;
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kTheme, value);
  }

  /// id/name null разом — «забыть устройство».
  Future<void> setPairedDevice(String? id, String? name) async {
    _pairedDeviceId = id;
    _pairedDeviceName = name;
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    if (id == null) {
      await prefs.remove(_kDeviceId);
      await prefs.remove(_kDeviceName);
    } else {
      await prefs.setString(_kDeviceId, id);
      await prefs.setString(_kDeviceName, name ?? '');
    }
  }
}
