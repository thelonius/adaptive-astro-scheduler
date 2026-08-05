/// Состояние неба: пересчитывает снимок по таймеру и держит натальную карту.
///
/// Натальная карта считается один раз при смене натальных данных: двенадцать
/// точек и двенадцать куспидов, дальше живут в памяти. Быстрая часть снимка
/// пересчитывается каждые полминуты, медленная — только когда время выходит
/// за границы лунных суток или Луна меняет знак.
library;

import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/ephemeris/ephemeris.dart';
import '../core/ephemeris/transits.dart';
import '../core/sky.dart';
import '../data/settings.dart';

class SkyController extends ChangeNotifier {
  final Settings settings;

  SkyController(this.settings) {
    settings.addListener(_onSettingsChanged);
    _rebuildNatal();
    refresh();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => refresh());
  }

  Timer? _timer;
  NatalChart? _natal;
  SkySnapshot? _sky;
  SlowSky? _slow;
  bool _slowPending = false;

  /// Момент, на который смотрим. null — сейчас.
  DateTime? _pinned;

  SkySnapshot? get sky => _sky;
  SlowSky? get slow => _slow;
  NatalChart? get natal => _natal;
  DateTime? get pinned => _pinned;
  bool get isLive => _pinned == null;

  DateTime get moment => _pinned ?? DateTime.now();

  void _onSettingsChanged() {
    _rebuildNatal();
    // Место сменилось — прошлые лунные сутки и Луна без курса больше
    // не относятся к делу
    _slow = null;
    refresh();
  }

  void _rebuildNatal() {
    final NatalData n = settings.natal;
    _natal = NatalChart.compute(n.julianDay, n.lat, n.lonEast);
  }

  /// Сдвинуть точку наблюдения. Полезно, чтобы посмотреть вечер сегодняшнего
  /// дня или завтрашнее утро, не дожидаясь их.
  void pin(DateTime? moment) {
    _pinned = moment;
    _slow = null;
    refresh();
  }

  void shift(Duration d) => pin((_pinned ?? DateTime.now()).add(d));

  void refresh() {
    final NatalChart? natal = _natal;
    if (natal == null) return;

    final double jd = julianDayFromDateTime(moment);
    final Place p = settings.place;
    _sky = SkySnapshot.compute(jd, natal, p.lat, p.lonEast);
    notifyListeners();

    final SlowSky? slow = _slow;
    if (slow == null || !slow.covers(jd)) _refreshSlow(jd, p);
  }

  Future<void> _refreshSlow(double jd, Place p) async {
    if (_slowPending) return;
    _slowPending = true;
    try {
      final SlowSky s = await computeSlowSky(jd, p.lat, p.lonEast);
      _slow = s;
      notifyListeners();
    } finally {
      _slowPending = false;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    settings.removeListener(_onSettingsChanged);
    super.dispose();
  }
}
