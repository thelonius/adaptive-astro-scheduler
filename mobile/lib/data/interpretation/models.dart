/// Модели слоя толкований.
///
/// Ключ толкования всегда вычислим из карты: аспект пары точек, планета в
/// знаке, планета в доме, градус, лунный день. Это важно для офлайна — по
/// такому ключу можно ходить и в сеть, и в локальную базу, и в кэш, не меняя
/// вызывающий код.
library;

import '../../core/ephemeris/ephemeris.dart';
import '../../core/ephemeris/names.dart';
import '../../core/ephemeris/transits.dart';

/// Откуда приехал текст. Показывается в UI: пользователь должен видеть,
/// читает он корпус, правило или сгенерированный нейросетью текст.
enum Provenance {
  /// Корпус ZET: настоящие книги настоящих авторов.
  corpus('корпус'),

  /// Детерминированное правило приложения.
  rule('правило'),

  /// Языковая модель на сервере.
  llm('модель'),

  /// Кэш предыдущего ответа.
  cache('кэш');

  final String label;
  const Provenance(this.label);
}

/// Ключ толкования. Один тип на все виды факторов: так кэш, локальная база и
/// сетевой источник говорят на одном языке.
sealed class InterpretationKey {
  const InterpretationKey();

  /// Стабильная строка для кэша и дедупликации.
  String get cacheKey;
}

class AspectKey extends InterpretationKey {
  /// Индекс в NatalChart.lon либо просто тело.
  final int point1;
  final int point2;
  final AspectKind kind;

  const AspectKey(this.point1, this.point2, this.kind);

  @override
  String get cacheKey =>
      'aspect:$point1:$point2:${aspectDefs[kind]!.angle.round()}';
}

class PlanetInSignKey extends InterpretationKey {
  final Body body;
  final int sign;
  const PlanetInSignKey(this.body, this.sign);

  @override
  String get cacheKey => 'planet-sign:${body.index}:$sign';
}

class PlanetInHouseKey extends InterpretationKey {
  final Body body;

  /// 1..12
  final int house;
  const PlanetInHouseKey(this.body, this.house);

  @override
  String get cacheKey => 'planet-house:${body.index}:$house';
}

class DegreeKey extends InterpretationKey {
  /// 1..360
  final int absolute;
  const DegreeKey(this.absolute);

  @override
  String get cacheKey => 'degree:$absolute';
}

class LunarDayKey extends InterpretationKey {
  /// 1..30
  final int number;
  const LunarDayKey(this.number);

  @override
  String get cacheKey => 'lunar-day:$number';
}

/// Один текст одного автора на один фактор карты.
class Interpretation {
  final String body;
  final String? author;
  final String? sourceTitle;
  final String? label;
  final Provenance provenance;

  /// Насколько уверенно ключ разобран в исходнике корпуса, 0..1. null там,
  /// где понятие не применимо.
  final double? decodeScore;

  const Interpretation({
    required this.body,
    required this.provenance,
    this.author,
    this.sourceTitle,
    this.label,
    this.decodeScore,
  });

  Map<String, dynamic> toJson() => <String, dynamic>{
        'body': body,
        'author': author,
        'sourceTitle': sourceTitle,
        'label': label,
        'provenance': provenance.name,
        'decodeScore': decodeScore,
      };

  factory Interpretation.fromJson(Map<String, dynamic> j) => Interpretation(
        body: (j['body'] ?? '') as String,
        author: j['author'] as String?,
        sourceTitle: (j['sourceTitle'] ?? j['source_title']) as String?,
        label: j['label'] as String?,
        provenance: Provenance.values.firstWhere(
          (Provenance p) => p.name == j['provenance'],
          orElse: () => Provenance.corpus,
        ),
        decodeScore: (j['decodeScore'] as num?)?.toDouble(),
      );
}

/// Пачка толкований на один ключ.
class InterpretationBundle {
  final InterpretationKey key;
  final List<Interpretation> entries;

  /// Заголовок для UI: «Марс ☌ натальная Венера».
  final String title;

  const InterpretationBundle({
    required this.key,
    required this.entries,
    required this.title,
  });

  bool get isEmpty => entries.isEmpty;
}

/// Заголовок аспекта в человеческом виде.
String aspectTitle(AspectKey k, {bool natalSecond = true}) {
  final String a = natalPointNameRu(k.point1);
  final String g = aspectGlyphs[k.kind]!;
  final String b = natalPointNameRu(k.point2);
  return natalSecond ? '$a $g натальн. $b' : '$a $g $b';
}
