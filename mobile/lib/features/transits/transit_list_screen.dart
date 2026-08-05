/// Список транзитов текстом. На часах он показывал пять самых точных: на
/// 240 пикселях больше не помещалось. Здесь помещается всё, и к каждому
/// транзиту прицеплено толкование.
library;

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../core/ephemeris/names.dart';
import '../../core/ephemeris/transits.dart';
import '../../core/sky.dart';
import '../../data/interpretation/models.dart';
import '../../data/interpretation/source.dart';
import '../../state/sky_controller.dart';
import '../interpretation/interpretation_sheet.dart';

class TransitListScreen extends StatefulWidget {
  const TransitListScreen({super.key});

  @override
  State<TransitListScreen> createState() => _TransitListScreenState();
}

class _TransitListScreenState extends State<TransitListScreen> {
  /// Какие ключи уже лежат в кэше со свежим текстом. Нужно, чтобы показать
  /// на строке, есть ли за ней разбор из корпуса.
  final Map<String, int> _counts = <String, int>{};
  bool _prefetched = false;

  @override
  Widget build(BuildContext context) {
    final AppScope scope = AppScope.of(context);
    final SkyController controller = scope.sky;

    return AnimatedBuilder(
      animation: controller,
      builder: (BuildContext context, _) {
        final SkySnapshot? sky = controller.sky;
        if (sky == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!_prefetched) {
          _prefetched = true;
          // Пакетный запрос вместо десятка одиночных: у корпуса под это
          // отдельный эндпойнт
          _prefetch(scope.interpretations, sky);
        }

        if (sky.hits.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: Text(
                'Активных транзитов к наталу сейчас нет. '
                'Орбисы здесь узкие: соединение и оппозиция 2°, '
                'квадрат и трин 1.5°, секстиль 1°.',
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        return SafeArea(
          child: ListView.separated(
            padding: const EdgeInsets.only(bottom: 24),
            itemCount: sky.hits.length + 1,
            separatorBuilder: (BuildContext context, int i) =>
                const Divider(height: 1),
            itemBuilder: (BuildContext context, int i) {
              if (i == 0) return _summary(context, sky);
              return _row(context, sky, sky.hits[i - 1]);
            },
          ),
        );
      },
    );
  }

  Widget _summary(BuildContext context, SkySnapshot sky) {
    final int applying = sky.hits.where((Hit h) => h.applying).length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        '${sky.hits.length} транзитов, из них $applying сходятся',
        style: Theme.of(context).textTheme.titleMedium,
      ),
    );
  }

  Widget _row(BuildContext context, SkySnapshot sky, Hit h) {
    final AspectKey key = AspectKey(h.transiting.index, h.natalPoint, h.kind);
    final int? corpus = _counts[key.cacheKey];
    final ThemeData theme = Theme.of(context);

    return ListTile(
      // Асцендент и МС подписаны словом, а не символом, поэтому строка глифов
      // ужимается по месту: иначе на них ряд разъезжается
      leading: SizedBox(
        width: 72,
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(bodyGlyphs[h.transiting.index],
                  style: const TextStyle(fontSize: 22)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Text(aspectGlyphs[h.kind]!,
                    style: TextStyle(
                        fontSize: 16, color: theme.colorScheme.primary)),
              ),
              Text(natalPointGlyph(h.natalPoint),
                  style: const TextStyle(fontSize: 22)),
            ],
          ),
        ),
      ),
      title: Text('${bodyNamesRu[h.transiting.index]} '
          '${aspectNamesRu[h.kind]} к ${natalPointNameRu(h.natalPoint)}'),
      subtitle: Text('орбис ${formatOrb(h.orb)}'
          '${h.applying ? ' · сходится' : ' · расходится'}'
          '${corpus != null && corpus > 0 ? ' · $corpus разбора в корпусе' : ''}'),
      trailing: Icon(
        h.applying ? Icons.trending_up : Icons.trending_down,
        size: 18,
        color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
      ),
      onTap: () => showInterpretation(
        context,
        key: key,
        title: aspectTitle(key),
        subtitle: 'орбис ${formatOrb(h.orb)}'
            '${h.applying ? ', сходится' : ', расходится'} · '
            '${formatLongitude(sky.lon[h.transiting.index])} → '
            '${formatLongitude(sky.natal.lon[h.natalPoint])}',
      ),
    );
  }

  Future<void> _prefetch(InterpretationSource source, SkySnapshot sky) async {
    final List<InterpretationKey> keys = <InterpretationKey>[
      for (final Hit h in sky.hits.take(20))
        AspectKey(h.transiting.index, h.natalPoint, h.kind)
    ];
    if (keys.isEmpty) return;
    try {
      final Map<String, List<Interpretation>> got =
          await source.lookupMany(keys, limit: 4);
      if (!mounted) return;
      setState(() {
        got.forEach((String k, List<Interpretation> v) {
          // Правило есть на каждый ключ, интересно именно то, что сверх него
          _counts[k] = v
              .where((Interpretation e) => e.provenance != Provenance.rule)
              .length;
        });
      });
    } catch (_) {
      // Сеть недоступна: строки останутся без пометки, толкования по
      // правилам всё равно откроются
    }
  }
}
