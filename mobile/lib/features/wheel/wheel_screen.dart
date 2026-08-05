/// Экран карты. Три режима часов сведены к двум: биwheel и небо. Список
/// транзитов переехал на свою вкладку, где ему хватает места на текст.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../core/ephemeris/ephemeris.dart';
import '../../core/ephemeris/names.dart';
import '../../core/ephemeris/transits.dart';
import '../../core/sky.dart';
import '../../data/interpretation/models.dart';
import '../../data/settings.dart';
import '../../state/sky_controller.dart';
import '../interpretation/interpretation_sheet.dart';
import 'wheel_painter.dart';
import 'wheel_theme.dart';

class WheelScreen extends StatefulWidget {
  const WheelScreen({super.key});

  @override
  State<WheelScreen> createState() => _WheelScreenState();
}

class _WheelScreenState extends State<WheelScreen> {
  WheelMode _mode = WheelMode.biwheel;
  Hit? _selected;

  @override
  Widget build(BuildContext context) {
    final AppScope scope = AppScope.of(context);
    final SkyController controller = scope.sky;
    final Settings settings = scope.settings;

    return AnimatedBuilder(
      animation: Listenable.merge(<Listenable>[controller, settings]),
      builder: (BuildContext context, _) {
        final SkySnapshot? sky = controller.sky;
        if (sky == null) {
          return const Center(child: CircularProgressIndicator());
        }

        final WheelTheme theme = settings.theme == 0
            ? WheelTheme.fromPalette(sky.palette)
            : fixedThemes[settings.theme - 1];

        return SafeArea(
          child: Column(
            children: <Widget>[
              _Header(controller: controller),
              Expanded(
                child: LayoutBuilder(
                  builder: (BuildContext context, BoxConstraints c) {
                    final double side =
                        math.min(c.maxWidth, c.maxHeight) - 16;
                    return Center(
                      child: GestureDetector(
                        onTapUp: (TapUpDetails d) =>
                            _onTap(context, d, sky, side),
                        child: SizedBox(
                          width: side,
                          height: side,
                          child: CustomPaint(
                            painter: WheelPainter(
                              sky: sky,
                              slow: controller.slow,
                              theme: theme,
                              mode: _mode,
                              selected: _selected,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              _Footer(
                mode: _mode,
                onMode: (WheelMode m) => setState(() {
                  _mode = m;
                  _selected = null;
                }),
                themeIndex: settings.theme,
                onTheme: () => settings.setTheme((settings.theme + 1) % 9),
                themeName: settings.theme == 0
                    ? 'живая'
                    : fixedThemes[settings.theme - 1].name,
              ),
            ],
          ),
        );
      },
    );
  }

  /// Попадание по глифу планеты. Радиус попадания шире самого глифа: пальцем
  /// в тринадцать точек не попасть.
  void _onTap(
      BuildContext context, TapUpDetails d, SkySnapshot sky, double side) {
    final WheelGeometry g = WheelGeometry(
      center: Offset(side / 2, side / 2),
      radius: side / 2,
      ascendant: sky.ascendant,
    );
    final double grab = (side / 240) * 22;
    final Offset p = d.localPosition;

    for (int b = 0; b < bodyCount; b++) {
      if ((g.at(sky.lon[b], WheelGeometry.transit) - p).distance < grab) {
        _openTransitBody(context, sky, Body.values[b]);
        return;
      }
    }

    if (_mode == WheelMode.biwheel) {
      for (int b = 0; b < bodyCount; b++) {
        if ((g.at(sky.natal.lon[b], WheelGeometry.natal) - p).distance < grab) {
          _openNatalBody(context, sky, Body.values[b]);
          return;
        }
      }
    }

    setState(() => _selected = null);
  }

  void _openTransitBody(BuildContext context, SkySnapshot sky, Body body) {
    final List<Hit> hits =
        sky.hits.where((Hit h) => h.transiting == body).toList();
    setState(() => _selected = hits.isEmpty ? null : hits.first);

    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext context) => _BodySheet(
        title: 'Транзитный ${bodyNamesRu[body.index]}',
        subtitle: '${formatLongitude(sky.lon[body.index])}'
            '${sky.retrograde[body.index] ? ', ретроградный' : ''}'
            ' · ${sky.natalHouseOfBody(body)}-й натальный дом',
        hits: hits,
        onHit: (Hit h) {
          Navigator.of(context).pop();
          showInterpretation(
            context,
            key: AspectKey(h.transiting.index, h.natalPoint, h.kind),
            title: aspectTitle(AspectKey(h.transiting.index, h.natalPoint, h.kind)),
            subtitle: 'орбис ${formatOrb(h.orb)}'
                '${h.applying ? ', сходится' : ', расходится'}',
          );
        },
        onSelf: () {
          Navigator.of(context).pop();
          final int sign = (sky.lon[body.index] / 30.0).floor();
          showInterpretation(
            context,
            key: PlanetInSignKey(body, sign),
            title: '${bodyNamesRu[body.index]} в знаке ${signNamesRu[sign]}',
            subtitle: formatLongitude(sky.lon[body.index]),
          );
        },
      ),
    );
  }

  void _openNatalBody(BuildContext context, SkySnapshot sky, Body body) {
    final double lon = sky.natal.lon[body.index];
    final int sign = (lon / 30.0).floor();
    final int house = houseOf(lon, sky.natal.cusp);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ListTile(
              title: Text('Натальный ${bodyNamesRu[body.index]}'),
              subtitle: Text('${formatLongitude(lon)} · $house-й дом'),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.auto_awesome_outlined),
              title: Text('В знаке ${signNamesRu[sign]}'),
              onTap: () {
                Navigator.of(context).pop();
                showInterpretation(
                  context,
                  key: PlanetInSignKey(body, sign),
                  title:
                      '${bodyNamesRu[body.index]} в знаке ${signNamesRu[sign]}',
                  subtitle: formatLongitude(lon),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.home_outlined),
              title: Text('В $house-м доме'),
              onTap: () {
                Navigator.of(context).pop();
                showInterpretation(
                  context,
                  key: PlanetInHouseKey(body, house),
                  title: '${bodyNamesRu[body.index]} в $house-м доме',
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _BodySheet extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<Hit> hits;
  final void Function(Hit) onHit;
  final VoidCallback onSelf;

  const _BodySheet({
    required this.title,
    required this.subtitle,
    required this.hits,
    required this.onHit,
    required this.onSelf,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          ListTile(title: Text(title), subtitle: Text(subtitle)),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.auto_awesome_outlined),
            title: const Text('Положение в знаке'),
            onTap: onSelf,
          ),
          if (hits.isEmpty)
            const ListTile(
              dense: true,
              title: Text('Аспектов к наталу сейчас нет'),
            )
          else
            for (final Hit h in hits)
              ListTile(
                leading: Text(aspectGlyphs[h.kind]!,
                    style: const TextStyle(fontSize: 20)),
                title: Text('${aspectNamesRu[h.kind]} к '
                    '${natalPointNameRu(h.natalPoint)}'),
                subtitle: Text('орбис ${formatOrb(h.orb)}'
                    '${h.applying ? ', сходится' : ', расходится'}'),
                onTap: () => onHit(h),
              ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final SkyController controller;
  const _Header({required this.controller});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final DateTime m = controller.moment;
    final String hhmm = '${m.hour.toString().padLeft(2, '0')}:'
        '${m.minute.toString().padLeft(2, '0')}';
    final String date = '${m.day.toString().padLeft(2, '0')}.'
        '${m.month.toString().padLeft(2, '0')}.${m.year}';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: <Widget>[
          IconButton(
            icon: const Icon(Icons.chevron_left),
            tooltip: 'На час назад',
            onPressed: () => controller.shift(const Duration(hours: -1)),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => controller.pin(null),
              child: Column(
                children: <Widget>[
                  Text(hhmm, style: theme.textTheme.headlineSmall),
                  Text(
                    controller.isLive ? date : '$date · зафиксировано',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: controller.isLive
                          ? null
                          : theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            tooltip: 'На час вперёд',
            onPressed: () => controller.shift(const Duration(hours: 1)),
          ),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  final WheelMode mode;
  final ValueChanged<WheelMode> onMode;
  final int themeIndex;
  final VoidCallback onTheme;
  final String themeName;

  const _Footer({
    required this.mode,
    required this.onMode,
    required this.themeIndex,
    required this.onTheme,
    required this.themeName,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          SegmentedButton<WheelMode>(
            segments: <ButtonSegment<WheelMode>>[
              for (final WheelMode m in WheelMode.values)
                ButtonSegment<WheelMode>(value: m, label: Text(m.label)),
            ],
            selected: <WheelMode>{mode},
            onSelectionChanged: (Set<WheelMode> s) => onMode(s.first),
            showSelectedIcon: false,
          ),
          TextButton.icon(
            icon: const Icon(Icons.palette_outlined, size: 18),
            label: Text(themeName),
            onPressed: onTheme,
          ),
        ],
      ),
    );
  }
}
