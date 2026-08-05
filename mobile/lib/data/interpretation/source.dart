/// Источник толкований и его композиция.
///
/// Разделение на источники существует ради офлайна. Факты карты приложение
/// считает само и в сети не нуждается вообще; тексты — единственное, что
/// приходится откуда-то брать. Источников три вида:
///
///   1. правило — детерминированный текст из таблиц в самом приложении;
///   2. корпус — тексты авторов, лежат в базе (сейчас на сервере, потом
///      могут переехать в приложение файлом);
///   3. модель — свободный текст, сегодня только на сервере.
///
/// Composite опрашивает их по порядку и склеивает. Порядок задаёт, что
/// пользователь увидит первым, а `offlineOnly` позволяет вообще не ходить
/// в сеть, когда её нет или когда пользователь так попросил.
library;

import 'models.dart';

abstract class InterpretationSource {
  /// Короткий идентификатор для логов и настроек.
  String get id;

  /// Работает ли источник без сети.
  bool get worksOffline;

  /// Толкования на один ключ. Пустой список — нормальный ответ: у корпуса
  /// есть далеко не всё.
  Future<List<Interpretation>> lookup(InterpretationKey key, {int limit = 4});

  /// Пакетный запрос. По умолчанию разворачивается в последовательные
  /// вызовы; сетевой источник переопределяет, чтобы уложиться в один
  /// round-trip — колесо просит до полутора десятков аспектов сразу.
  Future<Map<String, List<Interpretation>>> lookupMany(
    List<InterpretationKey> keys, {
    int limit = 4,
  }) async {
    final Map<String, List<Interpretation>> out =
        <String, List<Interpretation>>{};
    for (final InterpretationKey k in keys) {
      out[k.cacheKey] = await lookup(k, limit: limit);
    }
    return out;
  }
}

/// Кэш, который умеет не только читать, но и запоминать сетевые ответы.
abstract class WritableInterpretationSource extends InterpretationSource {
  Future<void> store(InterpretationKey key, List<Interpretation> entries);
}

/// Спрашивает источники по очереди и склеивает ответы.
///
/// Первым в списке имеет смысл держать локальные: они отвечают мгновенно и
/// без сети, а сетевой источник дополняет их, когда связь есть. Ответы
/// сетевых источников оседают в [cache], поэтому один раз открытое толкование
/// остаётся доступным офлайн навсегда.
class CompositeInterpretationSource extends InterpretationSource {
  final List<InterpretationSource> sources;
  final WritableInterpretationSource? cache;

  /// Не трогать источники, которым нужна сеть.
  bool offlineOnly;

  CompositeInterpretationSource({
    required this.sources,
    this.cache,
    this.offlineOnly = false,
  });

  @override
  String get id => 'composite';

  @override
  bool get worksOffline => sources.any((InterpretationSource s) => s.worksOffline);

  Iterable<InterpretationSource> get _active => <InterpretationSource>[
        ?cache,
        ...sources,
      ].where((InterpretationSource s) => !offlineOnly || s.worksOffline);

  @override
  Future<List<Interpretation>> lookup(
    InterpretationKey key, {
    int limit = 4,
  }) async {
    final List<Interpretation> out = <Interpretation>[];
    for (final InterpretationSource s in _active) {
      if (out.length >= limit) break;
      late final List<Interpretation> got;
      try {
        got = await s.lookup(key, limit: limit);
      } catch (_) {
        // Источник, до которого не дозвонились, не должен ронять остальные
        continue;
      }
      if (got.isEmpty) continue;
      if (!s.worksOffline) await cache?.store(key, got);
      out.addAll(got);
    }
    return _dedupe(out).take(limit).toList();
  }

  @override
  Future<Map<String, List<Interpretation>>> lookupMany(
    List<InterpretationKey> keys, {
    int limit = 4,
  }) async {
    final Map<String, List<Interpretation>> merged =
        <String, List<Interpretation>>{for (final InterpretationKey k in keys) k.cacheKey: <Interpretation>[]};

    for (final InterpretationSource s in _active) {
      // Спрашиваем только то, что ещё не набрало лимит: сетевому источнику
      // это экономит и трафик, и время ответа
      final List<InterpretationKey> pending = keys
          .where((InterpretationKey k) => merged[k.cacheKey]!.length < limit)
          .toList();
      if (pending.isEmpty) break;

      Map<String, List<Interpretation>> got;
      try {
        got = await s.lookupMany(pending, limit: limit);
      } catch (_) {
        continue;
      }

      for (final InterpretationKey k in pending) {
        final List<Interpretation> entries = got[k.cacheKey] ?? const <Interpretation>[];
        if (entries.isEmpty) continue;
        if (!s.worksOffline) await cache?.store(k, entries);
        merged[k.cacheKey]!.addAll(entries);
      }
    }

    return merged.map((String k, List<Interpretation> v) =>
        MapEntry<String, List<Interpretation>>(k, _dedupe(v).take(limit).toList()));
  }

  /// Один и тот же текст мог приехать и из кэша, и из сети.
  List<Interpretation> _dedupe(List<Interpretation> entries) {
    final Set<String> seen = <String>{};
    return entries.where((Interpretation e) {
      final String k = '${e.author ?? ''}|${e.body}';
      return seen.add(k);
    }).toList();
  }
}
