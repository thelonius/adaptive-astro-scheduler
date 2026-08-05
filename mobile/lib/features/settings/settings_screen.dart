/// Настройки: натальные данные, место наблюдения, адрес бэкенда, офлайн.
///
/// У часов всё это прибивалось build-флагами, потому что клавиатуры у них
/// нет. Здесь то же самое редактируется руками и переживает перезапуск.
library;

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../data/interpretation/cache_store.dart';
import '../../data/settings.dart';
import '../wheel/wheel_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  int? _cacheCount;

  @override
  Widget build(BuildContext context) {
    final AppScope scope = AppScope.of(context);
    final Settings settings = scope.settings;

    return AnimatedBuilder(
      animation: settings,
      builder: (BuildContext context, _) {
        final NatalData n = settings.natal;
        return SafeArea(
          child: ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: <Widget>[
              _section(context, 'Натальная карта'),
              ListTile(
                title: const Text('Дата и время рождения'),
                subtitle: Text('${n.day.toString().padLeft(2, '0')}.'
                    '${n.month.toString().padLeft(2, '0')}.${n.year}, '
                    '${n.hour.toString().padLeft(2, '0')}:'
                    '${n.minute.toString().padLeft(2, '0')}'),
                onTap: () => _editNatalMoment(context, settings),
              ),
              ListTile(
                title: const Text('Смещение от UTC при рождении'),
                subtitle: Text('${n.utcOffset >= 0 ? '+' : ''}${n.utcOffset} ч '
                    '— то, что действовало в месте и в момент рождения, '
                    'с декретным и летним временем'),
                onTap: () => _editNumber(
                  context,
                  title: 'Смещение от UTC',
                  initial: n.utcOffset,
                  onDone: (double v) =>
                      settings.setNatal(n.copyWith(utcOffset: v)),
                ),
              ),
              ListTile(
                title: const Text('Место рождения'),
                subtitle: Text('${n.lat.toStringAsFixed(4)}°, '
                    '${n.lonEast.toStringAsFixed(4)}°'),
                onTap: () => _editLatLon(
                  context,
                  lat: n.lat,
                  lon: n.lonEast,
                  onDone: (double lat, double lon) =>
                      settings.setNatal(n.copyWith(lat: lat, lonEast: lon)),
                ),
              ),

              _section(context, 'Где вы сейчас'),
              ListTile(
                title: Text(settings.place.title),
                subtitle: Text('${settings.place.lat.toStringAsFixed(4)}°, '
                    '${settings.place.lonEast.toStringAsFixed(4)}° — '
                    'от этого зависят дома, планетарные часы и границы '
                    'лунных суток'),
                onTap: () => _editLatLon(
                  context,
                  lat: settings.place.lat,
                  lon: settings.place.lonEast,
                  onDone: (double lat, double lon) => settings
                      .setPlace(Place(settings.place.title, lat, lon)),
                ),
              ),

              _section(context, 'Оформление'),
              ListTile(
                title: const Text('Тема'),
                subtitle: Text(settings.theme == 0
                    ? 'живая: hue от управителя дня и планетарного часа'
                    : fixedThemes[settings.theme - 1].name),
                trailing: const Icon(Icons.palette_outlined),
                onTap: () => settings.setTheme((settings.theme + 1) % 9),
              ),

              _section(context, 'Толкования'),
              SwitchListTile(
                title: const Text('Только офлайн'),
                subtitle: const Text(
                    'Не ходить в сеть за корпусом. Карта, транзиты, '
                    'лунные сутки и планетарные часы считаются локально '
                    'в любом случае'),
                value: settings.offlineOnly,
                onChanged: settings.setOfflineOnly,
              ),
              ListTile(
                title: const Text('Адрес бэкенда'),
                subtitle: Text(settings.apiBase),
                enabled: !settings.offlineOnly,
                onTap: () => _editText(
                  context,
                  title: 'Адрес бэкенда',
                  initial: settings.apiBase,
                  onDone: settings.setApiBase,
                ),
              ),
              ListTile(
                title: const Text('Сохранено локально'),
                subtitle: Text(_cacheCount == null
                    ? 'посчитать'
                    : '$_cacheCount текстов доступны без сети'),
                trailing: const Icon(Icons.storage_outlined),
                onTap: () => _countCache(scope.cache),
              ),
              if (_cacheCount != null && _cacheCount! > 0)
                ListTile(
                  title: const Text('Очистить кэш толкований'),
                  textColor: const Color(0xFFFF9A3C),
                  onTap: () => _clearCache(scope.cache),
                ),

              _section(context, 'О расчётах'),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 4, 16, 16),
                child: Text(
                  'Планеты считаются методом Standish, Солнце и Луна — рядами '
                  'Meeus, дома по Плацидусу. Сверено со swisseph на сетке '
                  '1955–2050: Солнце 0.008°, Луна 0.015°, худшие Юпитер '
                  'и Сатурн 0.18°. Асцендент и МС сходятся до 0.1″.',
                  style: TextStyle(fontSize: 12, height: 1.4),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _section(BuildContext context, String title) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 4),
        child: Text(
          title.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                letterSpacing: 1.2,
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
      );

  Future<void> _countCache(LocalInterpretationStore cache) async {
    final int n = await cache.count();
    if (mounted) setState(() => _cacheCount = n);
  }

  Future<void> _clearCache(LocalInterpretationStore cache) async {
    await cache.clear();
    if (mounted) setState(() => _cacheCount = 0);
  }

  Future<void> _editNatalMoment(
      BuildContext context, Settings settings) async {
    final NatalData n = settings.natal;
    final DateTime? date = await showDatePicker(
      context: context,
      initialDate: DateTime(n.year, n.month, n.day),
      firstDate: DateTime(1900),
      lastDate: DateTime(2100),
    );
    if (date == null || !context.mounted) return;

    final TimeOfDay? time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: n.hour, minute: n.minute),
    );
    if (time == null) return;

    await settings.setNatal(n.copyWith(
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour,
      minute: time.minute,
    ));
  }

  Future<void> _editNumber(
    BuildContext context, {
    required String title,
    required double initial,
    required ValueChanged<double> onDone,
  }) async {
    final TextEditingController c =
        TextEditingController(text: '$initial');
    final double? v = await showDialog<double>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: c,
          keyboardType: const TextInputType.numberWithOptions(
              decimal: true, signed: true),
          autofocus: true,
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () =>
                Navigator.pop(context, double.tryParse(c.text.trim())),
            child: const Text('Готово'),
          ),
        ],
      ),
    );
    if (v != null) onDone(v);
  }

  Future<void> _editText(
    BuildContext context, {
    required String title,
    required String initial,
    required ValueChanged<String> onDone,
  }) async {
    final TextEditingController c = TextEditingController(text: initial);
    final String? v = await showDialog<String>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: Text(title),
        content: TextField(
            controller: c, autofocus: true, keyboardType: TextInputType.url),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, c.text.trim()),
            child: const Text('Готово'),
          ),
        ],
      ),
    );
    if (v != null && v.isNotEmpty) onDone(v);
  }

  Future<void> _editLatLon(
    BuildContext context, {
    required double lat,
    required double lon,
    required void Function(double, double) onDone,
  }) async {
    final TextEditingController la = TextEditingController(text: '$lat');
    final TextEditingController lo = TextEditingController(text: '$lon');
    final bool? ok = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Координаты'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            TextField(
              controller: la,
              decoration: const InputDecoration(labelText: 'Широта, +север'),
              keyboardType: const TextInputType.numberWithOptions(
                  decimal: true, signed: true),
            ),
            TextField(
              controller: lo,
              decoration: const InputDecoration(labelText: 'Долгота, +восток'),
              keyboardType: const TextInputType.numberWithOptions(
                  decimal: true, signed: true),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Готово'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final double? a = double.tryParse(la.text.trim());
    final double? b = double.tryParse(lo.text.trim());
    if (a != null && b != null) onDone(a, b);
  }
}
