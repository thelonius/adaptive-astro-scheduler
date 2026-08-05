/// HTTP-клиент к бэкенду adaptive-astro-scheduler.
///
/// Приложение считает карту само, поэтому сюда ходят только за тем, чего
/// локально нет: тексты корпуса, словарь терминов, нарративы v2-планировщика.
/// Любой отказ сети означает лишь то, что толкований будет меньше, а карта,
/// транзиты и лунный день остаются на месте.
library;

import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String message;
  final int? status;
  const ApiException(this.message, [this.status]);

  @override
  String toString() => 'ApiException($status): $message';
}

class AstroApi {
  /// Прод: https://astro-31-130-130-11.sslip.io:4443
  /// Локальный бэкенд в dev: http://10.0.2.2:3001 (Android-эмулятор)
  /// или http://localhost:3001 (iOS-симулятор).
  final Uri baseUrl;
  final Duration timeout;
  final http.Client _client;

  AstroApi({
    required this.baseUrl,
    this.timeout = const Duration(seconds: 20),
    http.Client? client,
  }) : _client = client ?? http.Client();

  Uri _uri(String path, [Map<String, String>? query]) =>
      baseUrl.replace(path: '${baseUrl.path}$path', queryParameters: query);

  Future<Map<String, dynamic>> _get(
    String path, [
    Map<String, String>? query,
  ]) async {
    try {
      final http.Response r = await _client.get(_uri(path, query)).timeout(timeout);
      return _decode(r);
    } on SocketException catch (e) {
      throw ApiException('сеть недоступна: ${e.message}');
    }
  }

  Future<Map<String, dynamic>> _post(String path, Object body) async {
    try {
      final http.Response r = await _client
          .post(
            _uri(path),
            headers: const <String, String>{'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(timeout);
      return _decode(r);
    } on SocketException catch (e) {
      throw ApiException('сеть недоступна: ${e.message}');
    }
  }

  Map<String, dynamic> _decode(http.Response r) {
    if (r.statusCode >= 400) {
      throw ApiException(r.body.isEmpty ? r.reasonPhrase ?? '' : r.body, r.statusCode);
    }
    final dynamic decoded = jsonDecode(utf8.decode(r.bodyBytes));
    if (decoded is! Map<String, dynamic>) {
      throw const ApiException('ожидался объект в ответе');
    }
    return decoded;
  }

  Future<bool> health() async {
    try {
      final http.Response r =
          await _client.get(baseUrl.replace(path: '/health')).timeout(timeout);
      return r.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // --- корпус --------------------------------------------------------------

  /// POST /api/corpus/aspects. Пакетный: колесо рисует до полутора десятков
  /// аспектов сразу, и дёргать эндпойнт по одному значит получить столько же
  /// round-trip'ов.
  Future<List<Map<String, dynamic>>> corpusAspects(
    List<Map<String, Object>> aspects, {
    int limit = 4,
  }) async {
    final Map<String, dynamic> j = await _post(
      '/api/corpus/aspects',
      <String, Object>{'aspects': aspects, 'limit': limit},
    );
    return (j['bundles'] as List<dynamic>? ?? const <dynamic>[])
        .cast<Map<String, dynamic>>();
  }

  /// GET /api/corpus/planet?planet=Sun&sign=Leo
  Future<List<Map<String, dynamic>>> corpusPlanetInSign(
    String planet,
    String sign, {
    int limit = 4,
  }) async {
    final Map<String, dynamic> j = await _get('/api/corpus/planet', <String, String>{
      'planet': planet,
      'sign': sign,
      'limit': '$limit',
    });
    return (j['entries'] as List<dynamic>? ?? const <dynamic>[])
        .cast<Map<String, dynamic>>();
  }

  /// GET /api/corpus/planet?planet=Sun&house=5
  Future<List<Map<String, dynamic>>> corpusPlanetInHouse(
    String planet,
    int house, {
    int limit = 4,
  }) async {
    final Map<String, dynamic> j = await _get('/api/corpus/planet', <String, String>{
      'planet': planet,
      'house': '$house',
      'limit': '$limit',
    });
    return (j['entries'] as List<dynamic>? ?? const <dynamic>[])
        .cast<Map<String, dynamic>>();
  }

  /// GET /api/corpus/degree?absolute=135 — символика градуса зодиака.
  Future<List<Map<String, dynamic>>> corpusDegree(
    int absolute, {
    int limit = 4,
  }) async {
    final Map<String, dynamic> j = await _get('/api/corpus/degree', <String, String>{
      'absolute': '$absolute',
      'limit': '$limit',
    });
    return (j['entries'] as List<dynamic>? ?? const <dynamic>[])
        .cast<Map<String, dynamic>>();
  }

  /// GET /api/corpus/glossary — весь словарь одним ответом, кэшируется
  /// на сессию.
  Future<List<Map<String, dynamic>>> corpusGlossary() async {
    final Map<String, dynamic> j = await _get('/api/corpus/glossary');
    return (j['terms'] as List<dynamic>? ?? const <dynamic>[])
        .cast<Map<String, dynamic>>();
  }

  // --- v2-планировщик ------------------------------------------------------

  /// POST /api/optimal-timing/v2/find-with-intent. Свободный текст запроса
  /// превращается в рецепт, рецепт скорится по дням, дни получают нарративы.
  /// Единственный путь в приложении, которому действительно нужна модель.
  Future<Map<String, dynamic>> findWithIntent({
    required String intent,
    required DateTime start,
    required DateTime end,
    int topN = 10,
    String language = 'ru',
    String? natalChartId,
  }) =>
      _post('/api/optimal-timing/v2/find-with-intent', <String, Object?>{
        'intent': intent,
        'start_date': _isoDate(start),
        'end_date': _isoDate(end),
        'top_n': topN,
        'language': language,
        'natal_chart_id': ?natalChartId,
      });

  /// GET /api/optimal-timing/v2/recipes — пять канонических рецептов,
  /// которые считаются без модели вообще.
  Future<List<String>> recipes() async {
    final Map<String, dynamic> j = await _get('/api/optimal-timing/v2/recipes');
    final dynamic list = j['recipes'] ?? j['data'] ?? j['ids'];
    if (list is List) return list.map((dynamic e) => '$e').toList();
    return const <String>[];
  }

  /// POST /api/optimal-timing/v2/find-with-fixed-recipe — тот же движок
  /// скоринга без языковой модели.
  Future<Map<String, dynamic>> findWithFixedRecipe({
    required String recipeId,
    required DateTime start,
    required DateTime end,
    required double lat,
    required double lon,
    int topN = 10,
  }) =>
      _post('/api/optimal-timing/v2/find-with-fixed-recipe', <String, Object?>{
        'recipe_id': recipeId,
        'start_date': _isoDate(start),
        'end_date': _isoDate(end),
        'location': <String, double>{'latitude': lat, 'longitude': lon},
        'top_n': topN,
      });

  static String _isoDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  void close() => _client.close();
}
