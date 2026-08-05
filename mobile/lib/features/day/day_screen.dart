/// Разбор дня. Ради этого экрана всё и затевалось: часы показывают карту,
/// а телефон объясняет, что на ней происходит.
library;

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../core/ephemeris/ephemeris.dart';
import '../../core/ephemeris/lunar.dart';
import '../../core/ephemeris/names.dart';
import '../../core/ephemeris/palette.dart';
import '../../core/ephemeris/transits.dart';
import '../../core/sky.dart';
import '../../data/interpretation/models.dart';
import '../../state/sky_controller.dart';
import '../interpretation/interpretation_sheet.dart';

String _hhmm(double jd) {
  final DateTime t = dateTimeFromJulianDay(jd).toLocal();
  return '${t.hour.toString().padLeft(2, '0')}:'
      '${t.minute.toString().padLeft(2, '0')}';
}

class DayScreen extends StatelessWidget {
  const DayScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final SkyController controller = AppScope.of(context).sky;

    return AnimatedBuilder(
      animation: controller,
      builder: (BuildContext context, _) {
        final SkySnapshot? sky = controller.sky;
        if (sky == null) {
          return const Center(child: CircularProgressIndicator());
        }
        final SlowSky? slow = controller.slow;

        return SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: <Widget>[
              _LunarCard(sky: sky, slow: slow),
              const SizedBox(height: 12),
              _HourCard(sky: sky),
              const SizedBox(height: 12),
              _MoonCard(sky: sky, slow: slow),
              const SizedBox(height: 12),
              _TopTransits(sky: sky),
            ],
          ),
        );
      },
    );
  }
}

class _Card extends StatelessWidget {
  final String title;
  final Widget child;
  final VoidCallback? onTap;

  const _Card({required this.title, required this.child, this.onTap});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      title.toUpperCase(),
                      style: theme.textTheme.labelSmall?.copyWith(
                        letterSpacing: 1.2,
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.55),
                      ),
                    ),
                  ),
                  if (onTap != null)
                    Icon(Icons.chevron_right,
                        size: 18,
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.4)),
                ],
              ),
              const SizedBox(height: 10),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

class _LunarCard extends StatelessWidget {
  final SkySnapshot sky;
  final SlowSky? slow;
  const _LunarCard({required this.sky, this.slow});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final LunarDay? d = slow?.lunarDay;

    if (d == null) {
      return const _Card(
        title: 'лунные сутки',
        child: Text('Считаются: до тридцати поисков восхода Луны.'),
      );
    }

    final LunarDayInfo info = d.info;
    final String tone = switch (info.tone) {
      1 => 'лёгкий',
      -1 => 'требует осторожности',
      _ => 'ровный',
    };

    return _Card(
      title: 'лунные сутки',
      onTap: () => showInterpretation(
        context,
        key: LunarDayKey(d.number),
        title: '${d.number}-е лунные сутки, «${info.title}»',
        subtitle: 'с ${_hhmm(d.startJd)} до ${_hhmm(d.endJd)}',
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('${d.number}-е · ${info.title}',
              style: theme.textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text('День $tone · с ${_hhmm(d.startJd)} до ${_hhmm(d.endJd)}',
              style: theme.textTheme.bodySmall),
          const SizedBox(height: 12),
          if (info.yes.isNotEmpty)
            _Spheres(
                label: 'подходит', spheres: info.yes, color: theme.colorScheme.primary),
          if (info.no.isNotEmpty) ...<Widget>[
            const SizedBox(height: 6),
            _Spheres(
                label: 'не затевать',
                spheres: info.no,
                color: const Color(0xFFFF9A3C)),
          ],
        ],
      ),
    );
  }
}

class _Spheres extends StatelessWidget {
  final String label;
  final List<Sphere> spheres;
  final Color color;

  const _Spheres(
      {required this.label, required this.spheres, required this.color});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        SizedBox(
          width: 96,
          child: Text(label,
              style: theme.textTheme.labelMedium?.copyWith(color: color)),
        ),
        Expanded(
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: <Widget>[
              for (final Sphere s in spheres)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    border: Border.all(color: color.withValues(alpha: 0.45)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(s.label, style: theme.textTheme.labelSmall),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HourCard extends StatelessWidget {
  final SkySnapshot sky;
  const _HourCard({required this.sky});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final PlanetaryHour h = sky.hour;
    final int nth = h.index < 12 ? h.index + 1 : h.index - 11;

    return _Card(
      title: 'планетарный час',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text(bodyGlyphs[h.ruler.index],
                  style: TextStyle(
                      fontSize: 30, color: theme.colorScheme.primary)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(bodyNamesRu[h.ruler.index],
                        style: theme.textTheme.titleMedium),
                    Text(
                      '$nth-й ${h.isDay ? 'дневной' : 'ночной'} час · '
                      'до ${_hhmm(h.endJd)}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Управитель дня — ${bodyNamesRu[h.dayRuler.index]}. '
            'От него берётся тон фона и текста, от управителя часа — акцент. '
            'Сутки здесь считаются от восхода, а не от полуночи.',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _MoonCard extends StatelessWidget {
  final SkySnapshot sky;
  final SlowSky? slow;
  const _MoonCard({required this.sky, this.slow});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final int sign = sky.moonSign;
    final bool isVoid = slow?.moonVoid ?? false;

    return _Card(
      title: 'луна',
      onTap: () => showInterpretation(
        context,
        key: PlanetInSignKey(Body.moon, sign),
        title: 'Луна в знаке ${signNamesRu[sign]}',
        subtitle: formatLongitude(sky.lon[Body.moon.index]),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            '${signGlyphs[sign]} ${signNamesRu[sign]} · '
            '${moonPhaseName(sky.jd).label}',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'освещённость ${(sky.moonPhase * 100).round()}% · '
            '${sky.natalHouseOfBody(Body.moon)}-й натальный дом',
            style: theme.textTheme.bodySmall,
          ),
          if (slow != null) ...<Widget>[
            const SizedBox(height: 10),
            Text(
              isVoid
                  ? 'Без курса до ${_hhmm(slow!.moonEgressJd)}: до выхода '
                      'из знака Луна не образует ни одного мажорного аспекта. '
                      'Начатое сейчас обычно не идёт дальше.'
                  : 'Знак меняется в ${_hhmm(slow!.moonEgressJd)}.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isVoid ? const Color(0xFFFF9A3C) : null,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TopTransits extends StatelessWidget {
  final SkySnapshot sky;
  const _TopTransits({required this.sky});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final List<Hit> top = sky.hits.take(3).toList();

    return _Card(
      title: 'самое точное сейчас',
      child: top.isEmpty
          ? Text('Транзитов в орбисе нет.', style: theme.textTheme.bodyMedium)
          : Column(
              children: <Widget>[
                for (final Hit h in top)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: InkWell(
                      onTap: () {
                        final AspectKey k = AspectKey(
                            h.transiting.index, h.natalPoint, h.kind);
                        showInterpretation(
                          context,
                          key: k,
                          title: aspectTitle(k),
                          subtitle: 'орбис ${formatOrb(h.orb)}'
                              '${h.applying ? ', сходится' : ', расходится'}',
                        );
                      },
                      child: Row(
                        children: <Widget>[
                          Text(
                            '${bodyGlyphs[h.transiting.index]} '
                            '${aspectGlyphs[h.kind]} '
                            '${natalPointGlyph(h.natalPoint)}',
                            style: const TextStyle(fontSize: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              '${bodyNamesRu[h.transiting.index]} '
                              '${aspectNamesRu[h.kind]} к '
                              '${natalPointNameRu(h.natalPoint)}',
                              style: theme.textTheme.bodyMedium,
                            ),
                          ),
                          Text(formatOrb(h.orb),
                              style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}
