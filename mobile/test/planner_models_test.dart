library;

import 'package:astro_clock/data/api/planner_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('PlannerSearchResult.fromIntentJson парсит окна и vibes', () {
    final PlannerSearchResult result = PlannerSearchResult.fromIntentJson(
      <String, dynamic>{
        'request_id': 'abc12345',
        'summary': 'Нашли три хороших дня',
        'disqualified_days': 2,
        'cost': <String, dynamic>{'latency_ms': 1500},
        'llm': <String, dynamic>{'cached': true},
        'generated_recipe': <String, dynamic>{
          'intent': 'подписать договор',
          'rationale': 'важны лунные аспекты',
          'disqualifiers': <dynamic>[],
          'weighted_conditions': <dynamic>[],
          'vibes': <dynamic>[
            <String, dynamic>{'id': 'practical', 'label': 'Практичный'},
          ],
        },
        'windows': <dynamic>[
          <String, dynamic>{
            'date': '2026-09-15',
            'score': 82,
            'rank': 1,
            'matched_predicates': <dynamic>[
              <String, dynamic>{'type': 'moon_not_void', 'weight': 10},
            ],
            'moon': <String, dynamic>{
              'sign': 'Taurus',
              'phase': 'waxing_crescent',
              'void_of_course': false,
            },
            'sun_sign': 'Virgo',
            'retrograde_planets': <dynamic>[],
            'vibe_narratives': <String, dynamic>{
              'practical': 'Хороший день для бумаг.',
            },
          },
        ],
      },
    );

    expect(result.windows, hasLength(1));
    expect(result.windows.first.score, 82);
    expect(result.generatedRecipe?.vibes.first.id, 'practical');
    expect(
      result.windows.first.vibeNarratives['practical'],
      'Хороший день для бумаг.',
    );
    expect(result.llmCached, isTrue);
    expect(result.latencySec, 1.5);
  });
}
