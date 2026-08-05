/// Толкования с бэкенда: корпус ZET в постгресе.
///
/// Единственный источник, которому нужна сеть. Всё, что он отдаёт, оседает
/// в кэше (см. [CompositeInterpretationSource]), поэтому один раз открытое
/// толкование остаётся доступным офлайн.
library;

import '../../core/ephemeris/ephemeris.dart';
import '../../core/ephemeris/names.dart';
import '../../core/ephemeris/transits.dart';
import '../api/astro_api.dart';
import 'models.dart';
import 'source.dart';

/// Имена в приложении и в корпусе не совпадают: shared-типы держат 'Sun',
/// корпус — 'SUN'. Бэкенд переводит сам, но ответ пакетного эндпойнта
/// возвращает ключ уже в корпусных именах, и его надо узнать обратно.
const List<String> _corpusNames = <String>[
  'SUN',
  'MOON',
  'MERCURY',
  'VENUS',
  'MARS',
  'JUPITER',
  'SATURN',
  'URANUS',
  'NEPTUNE',
  'PLUTO',
  'ASC',
  'MC',
];

String _corpusName(int point) =>
    point < _corpusNames.length ? _corpusNames[point] : '';

/// Пара планет симметрична по смыслу, и корпус хранит её в одном порядке.
String _pairKey(String a, String b, int deg) {
  final String lo = a.compareTo(b) < 0 ? a : b;
  final String hi = a.compareTo(b) < 0 ? b : a;
  return '$lo|$hi|$deg';
}

class RemoteInterpretationSource extends InterpretationSource {
  final AstroApi api;

  RemoteInterpretationSource(this.api);

  @override
  String get id => 'remote-corpus';

  @override
  bool get worksOffline => false;

  @override
  Future<List<Interpretation>> lookup(
    InterpretationKey key, {
    int limit = 4,
  }) async {
    switch (key) {
      case AspectKey k:
        final Map<String, List<Interpretation>> got =
            await lookupMany(<InterpretationKey>[k], limit: limit);
        return got[k.cacheKey] ?? const <Interpretation>[];

      case PlanetInSignKey k:
        return _entries(await api.corpusPlanetInSign(
          bodyNamesApi[k.body.index],
          signNamesApi[k.sign],
          limit: limit,
        ));

      case PlanetInHouseKey k:
        return _entries(await api.corpusPlanetInHouse(
          bodyNamesApi[k.body.index],
          k.house,
          limit: limit,
        ));

      case DegreeKey k:
        return _entries(await api.corpusDegree(k.absolute, limit: limit));

      case LunarDayKey _:
        // Лунные дни в корпусе лежат отдельным кодом, эндпойнта под них ещё
        // нет. Локальный источник закрывает этот ключ полностью.
        return const <Interpretation>[];
    }
  }

  @override
  Future<Map<String, List<Interpretation>>> lookupMany(
    List<InterpretationKey> keys, {
    int limit = 4,
  }) async {
    final List<AspectKey> aspects = keys.whereType<AspectKey>().toList();
    final List<InterpretationKey> rest =
        keys.where((InterpretationKey k) => k is! AspectKey).toList();

    final Map<String, List<Interpretation>> out =
        <String, List<Interpretation>>{};

    if (aspects.isNotEmpty) {
      final List<Map<String, Object>> payload = <Map<String, Object>>[
        for (final AspectKey k in aspects)
          <String, Object>{
            'planet1': natalPointNameApi(k.point1),
            'planet2': natalPointNameApi(k.point2),
            'aspect': aspectDefs[k.kind]!.angle.round(),
          }
      ];

      final List<Map<String, dynamic>> bundles =
          await api.corpusAspects(payload, limit: limit);

      // Ответ приходит с ключом в корпусных именах и только для непустых
      // пачек, поэтому раскладываем по нормализованной паре
      final Map<String, List<Interpretation>> byPair =
          <String, List<Interpretation>>{};
      for (final Map<String, dynamic> b in bundles) {
        final Map<String, dynamic> k =
            (b['key'] as Map<String, dynamic>?) ?? const <String, dynamic>{};
        final String pair = _pairKey(
          '${k['planet1']}',
          '${k['planet2']}',
          (k['aspectDeg'] as num?)?.round() ?? -1,
        );
        byPair[pair] = _entries(
            (b['entries'] as List<dynamic>? ?? const <dynamic>[])
                .cast<Map<String, dynamic>>());
      }

      for (final AspectKey k in aspects) {
        final String pair = _pairKey(
          _corpusName(k.point1),
          _corpusName(k.point2),
          aspectDefs[k.kind]!.angle.round(),
        );
        out[k.cacheKey] = byPair[pair] ?? const <Interpretation>[];
      }
    }

    for (final InterpretationKey k in rest) {
      try {
        out[k.cacheKey] = await lookup(k, limit: limit);
      } catch (_) {
        out[k.cacheKey] = const <Interpretation>[];
      }
    }
    return out;
  }

  List<Interpretation> _entries(List<Map<String, dynamic>> rows) => <Interpretation>[
        for (final Map<String, dynamic> r in rows)
          Interpretation(
            body: '${r['body'] ?? ''}',
            author: r['author'] as String?,
            sourceTitle: r['sourceTitle'] as String?,
            label: r['label'] as String?,
            provenance: Provenance.corpus,
            decodeScore: (r['decodeScore'] as num?)?.toDouble(),
          )
      ];
}

/// Тела, для которых имеет смысл спрашивать корпус. Уран, Нептун и Плутон
/// в старых источниках отсутствуют, но запрос их не ломает: вернётся пусто.
const List<Body> corpusBodies = Body.values;
