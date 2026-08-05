/// Локальная база толкований.
///
/// Сейчас работает кэшем: всё, что приехало с бэкенда, записывается сюда и
/// дальше читается без сети. Схема нарочно та же, какой она была бы у
/// предзалитого корпуса: ключ, порядок, текст, автор. Когда корпус поедет
/// в приложение файлом, менять придётся только заполнение таблицы, а не
/// вызывающий код.
library;

import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import 'models.dart';
import 'source.dart';

/// Локальное хранилище толкований: то, чем приложение располагает без сети.
/// Сейчас реализация одна, кэш; предзалитый корпус встанет сюда же, и
/// настройкам не придётся знать, чем именно набита база.
abstract class LocalInterpretationStore extends WritableInterpretationSource {
  /// Сколько текстов лежит локально. Показывается в настройках: по этому
  /// числу видно, насколько приложение готово к жизни без сети.
  Future<int> count();

  Future<void> clear();
}

class InterpretationCache extends LocalInterpretationStore {
  Database? _db;

  /// Отдельный файл, чтобы предзалитый корпус можно было положить рядом
  /// и подключить через ATTACH, не смешивая с пользовательскими данными.
  static const String _fileName = 'interpretations.db';

  @override
  String get id => 'cache';

  @override
  bool get worksOffline => true;

  Future<Database> _open() async {
    final Database? existing = _db;
    if (existing != null) return existing;

    final String dir = await getDatabasesPath();
    final Database db = await openDatabase(
      p.join(dir, _fileName),
      version: 1,
      onCreate: (Database db, int _) async {
        await db.execute('''
          CREATE TABLE interpretations (
            cache_key    TEXT    NOT NULL,
            ord          INTEGER NOT NULL,
            body         TEXT    NOT NULL,
            author       TEXT,
            source_title TEXT,
            label        TEXT,
            provenance   TEXT    NOT NULL,
            decode_score REAL,
            fetched_at   INTEGER NOT NULL,
            PRIMARY KEY (cache_key, ord)
          )
        ''');
      },
    );
    _db = db;
    return db;
  }

  @override
  Future<List<Interpretation>> lookup(
    InterpretationKey key, {
    int limit = 4,
  }) async {
    final Database db = await _open();
    final List<Map<String, Object?>> rows = await db.query(
      'interpretations',
      where: 'cache_key = ?',
      whereArgs: <Object>[key.cacheKey],
      orderBy: 'ord',
      limit: limit,
    );
    return <Interpretation>[
      for (final Map<String, Object?> r in rows)
        Interpretation(
          body: r['body'] as String,
          author: r['author'] as String?,
          sourceTitle: r['source_title'] as String?,
          label: r['label'] as String?,
          // Из кэша текст возвращается со своей исходной пометкой: важно,
          // что это корпус, а не то, что он полежал в базе
          provenance: Provenance.values.firstWhere(
            (Provenance p) => p.name == r['provenance'],
            orElse: () => Provenance.cache,
          ),
          decodeScore: (r['decode_score'] as num?)?.toDouble(),
        )
    ];
  }

  @override
  Future<void> store(InterpretationKey key, List<Interpretation> entries) async {
    if (entries.isEmpty) return;
    final Database db = await _open();
    final int now = DateTime.now().millisecondsSinceEpoch;
    final Batch batch = db.batch();
    // Перезапись целиком: пачка на один ключ приходит с сервера как единое
    // целое, дописывать её по частям нет смысла
    batch.delete('interpretations',
        where: 'cache_key = ?', whereArgs: <Object>[key.cacheKey]);
    for (int i = 0; i < entries.length; i++) {
      final Interpretation e = entries[i];
      batch.insert('interpretations', <String, Object?>{
        'cache_key': key.cacheKey,
        'ord': i,
        'body': e.body,
        'author': e.author,
        'source_title': e.sourceTitle,
        'label': e.label,
        'provenance': e.provenance.name,
        'decode_score': e.decodeScore,
        'fetched_at': now,
      });
    }
    await batch.commit(noResult: true);
  }

  @override
  Future<int> count() async {
    final Database db = await _open();
    final List<Map<String, Object?>> r =
        await db.rawQuery('SELECT count(*) AS n FROM interpretations');
    return (r.first['n'] as int?) ?? 0;
  }

  @override
  Future<void> clear() async {
    final Database db = await _open();
    await db.delete('interpretations');
  }

  Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
