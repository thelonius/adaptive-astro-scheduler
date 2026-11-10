/// Модели ответа v2-планировщика. Парсят JSON бэкенда в типы для UI.
library;

class CanonicalRecipeMeta {
  final String id;
  final String intent;
  final String rationale;
  final int disqualifierCount;
  final int weightedConditionCount;

  const CanonicalRecipeMeta({
    required this.id,
    required this.intent,
    required this.rationale,
    required this.disqualifierCount,
    required this.weightedConditionCount,
  });

  factory CanonicalRecipeMeta.fromJson(Map<String, dynamic> json) =>
      CanonicalRecipeMeta(
        id: json['id'] as String? ?? '',
        intent: json['intent'] as String? ?? '',
        rationale: json['rationale'] as String? ?? '',
        disqualifierCount: json['disqualifier_count'] as int? ?? 0,
        weightedConditionCount: json['weighted_condition_count'] as int? ?? 0,
      );
}

class PlannerVibe {
  final String id;
  final String label;
  final String? description;

  const PlannerVibe({
    required this.id,
    required this.label,
    this.description,
  });

  factory PlannerVibe.fromJson(Map<String, dynamic> json) => PlannerVibe(
        id: json['id'] as String? ?? '',
        label: json['label'] as String? ?? json['id'] as String? ?? '',
        description: json['description'] as String?,
      );
}

class GeneratedRecipe {
  final String intent;
  final String rationale;
  final List<Map<String, dynamic>> disqualifiers;
  final List<Map<String, dynamic>> weightedConditions;
  final List<PlannerVibe> vibes;

  const GeneratedRecipe({
    required this.intent,
    required this.rationale,
    required this.disqualifiers,
    required this.weightedConditions,
    required this.vibes,
  });

  factory GeneratedRecipe.fromJson(Map<String, dynamic> json) => GeneratedRecipe(
        intent: json['intent'] as String? ?? '',
        rationale: json['rationale'] as String? ?? '',
        disqualifiers: (json['disqualifiers'] as List<dynamic>? ?? const <dynamic>[])
            .cast<Map<String, dynamic>>(),
        weightedConditions:
            (json['weighted_conditions'] as List<dynamic>? ?? const <dynamic>[])
                .cast<Map<String, dynamic>>(),
        vibes: (json['vibes'] as List<dynamic>? ?? const <dynamic>[])
            .map((dynamic e) => PlannerVibe.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class PlannerMoonState {
  final String sign;
  final String phase;
  final bool voidOfCourse;

  const PlannerMoonState({
    required this.sign,
    required this.phase,
    required this.voidOfCourse,
  });

  factory PlannerMoonState.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const PlannerMoonState(sign: '', phase: '', voidOfCourse: false);
    }
    return PlannerMoonState(
      sign: json['sign'] as String? ?? '',
      phase: json['phase'] as String? ?? '',
      voidOfCourse: json['void_of_course'] as bool? ?? false,
    );
  }
}

class MatchedPredicate {
  final String type;
  final double weight;
  final Map<String, dynamic>? details;

  const MatchedPredicate({
    required this.type,
    required this.weight,
    this.details,
  });

  factory MatchedPredicate.fromJson(Map<String, dynamic> json) =>
      MatchedPredicate(
        type: json['type'] as String? ?? '',
        weight: (json['weight'] as num?)?.toDouble() ?? 0,
        details: json['details'] as Map<String, dynamic>?,
      );
}

class TimingWindow {
  final String date;
  final double score;
  final int rank;
  final List<MatchedPredicate> matchedPredicates;
  final PlannerMoonState moon;
  final String sunSign;
  final List<String> retrogradePlanets;
  final Map<String, String> vibeNarratives;

  const TimingWindow({
    required this.date,
    required this.score,
    required this.rank,
    required this.matchedPredicates,
    required this.moon,
    required this.sunSign,
    required this.retrogradePlanets,
    required this.vibeNarratives,
  });

  factory TimingWindow.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic>? rawNarratives =
        json['vibe_narratives'] as Map<String, dynamic>?;
    final Map<String, String> narratives = <String, String>{};
    rawNarratives?.forEach((String key, dynamic value) {
      if (value is String && value.isNotEmpty) {
        narratives[key] = value;
      }
    });

    return TimingWindow(
      date: json['date'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0,
      rank: json['rank'] as int? ?? 0,
      matchedPredicates: (json['matched_predicates'] as List<dynamic>? ??
              const <dynamic>[])
          .map((dynamic e) =>
              MatchedPredicate.fromJson(e as Map<String, dynamic>))
          .toList(),
      moon: PlannerMoonState.fromJson(json['moon'] as Map<String, dynamic>?),
      sunSign: json['sun_sign'] as String? ?? '',
      retrogradePlanets: (json['retrograde_planets'] as List<dynamic>? ??
              const <dynamic>[])
          .map((dynamic e) => '$e')
          .toList(),
      vibeNarratives: narratives,
    );
  }
}

class PlannerSearchResult {
  final String requestId;
  final String summary;
  final List<TimingWindow> windows;
  final int disqualifiedDays;
  final double latencySec;
  final GeneratedRecipe? generatedRecipe;
  final bool llmCached;
  final String? fixedRecipeId;

  const PlannerSearchResult({
    required this.requestId,
    required this.summary,
    required this.windows,
    required this.disqualifiedDays,
    required this.latencySec,
    this.generatedRecipe,
    this.llmCached = false,
    this.fixedRecipeId,
  });

  factory PlannerSearchResult.fromIntentJson(Map<String, dynamic> json) {
    final Map<String, dynamic>? cost = json['cost'] as Map<String, dynamic>?;
    final Map<String, dynamic>? llm = json['llm'] as Map<String, dynamic>?;
    return PlannerSearchResult(
      requestId: json['request_id'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      windows: (json['windows'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic e) => TimingWindow.fromJson(e as Map<String, dynamic>))
          .toList(),
      disqualifiedDays: json['disqualified_days'] as int? ?? 0,
      latencySec: ((cost?['latency_ms'] as num?) ?? 0) / 1000,
      generatedRecipe: json['generated_recipe'] == null
          ? null
          : GeneratedRecipe.fromJson(
              json['generated_recipe'] as Map<String, dynamic>),
      llmCached: llm?['cached'] as bool? ?? false,
    );
  }

  factory PlannerSearchResult.fromFixedRecipeJson(Map<String, dynamic> json) {
    final Map<String, dynamic>? cost = json['cost'] as Map<String, dynamic>?;
    return PlannerSearchResult(
      requestId: json['request_id'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      windows: (json['windows'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic e) => TimingWindow.fromJson(e as Map<String, dynamic>))
          .toList(),
      disqualifiedDays: json['disqualified_days'] as int? ?? 0,
      latencySec: ((cost?['latency_ms'] as num?) ?? 0) / 1000,
      fixedRecipeId: json['recipe_id'] as String?,
    );
  }
}
