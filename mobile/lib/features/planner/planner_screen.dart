/// Подбор дня под задачу — UI v2-планировщика.
///
/// Свободный текст уходит на бэкенд (LLM → рецепт → скоринг → нарративы).
/// Канонические рецепты считаются без модели, быстрее и дешевле.
library;

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../data/api/astro_api.dart';
import '../../data/api/planner_models.dart';
import '../../data/settings.dart';
import '../../core/planetary_hours.dart';
import '../wheel/moment_biwheel.dart';

const List<String> _sampleIntents = <String>[
  'хочу подписать договор аренды',
  'попросить у начальника прибавку',
  'отправиться в дальнее путешествие',
  'помириться с другом',
  'запустить новый онлайн-курс',
];

const Map<String, String> _signRu = <String, String>{
  'Aries': 'Овне',
  'Taurus': 'Тельце',
  'Gemini': 'Близнецах',
  'Cancer': 'Раке',
  'Leo': 'Льве',
  'Virgo': 'Деве',
  'Libra': 'Весах',
  'Scorpio': 'Скорпионе',
  'Sagittarius': 'Стрельце',
  'Capricorn': 'Козероге',
  'Aquarius': 'Водолее',
  'Pisces': 'Рыбах',
};

const Map<String, String> _phaseRu = <String, String>{
  'new': 'новолуние',
  'waxing_crescent': 'растущий серп',
  'first_quarter': 'первая четверть',
  'waxing_gibbous': 'растущая',
  'full': 'полнолуние',
  'waning_gibbous': 'убывающая',
  'last_quarter': 'последняя четверть',
  'waning_crescent': 'убывающий серп',
};

const List<String> _weekdayRu = <String>[
  'пн',
  'вт',
  'ср',
  'чт',
  'пт',
  'сб',
  'вс',
];

const List<String> _monthRu = <String>[
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

String _timezoneFor(Place place) =>
    place.title == 'Москва' ? 'Europe/Moscow' : 'UTC';

String _formatIsoDate(String iso) {
  final List<String> parts = iso.split('-');
  if (parts.length != 3) return iso;
  final int y = int.tryParse(parts[0]) ?? 0;
  final int m = int.tryParse(parts[1]) ?? 1;
  final int d = int.tryParse(parts[2]) ?? 1;
  final DateTime dt = DateTime(y, m, d);
  final String wd = _weekdayRu[dt.weekday - 1];
  final String mon = _monthRu[m - 1];
  return '$wd, $d $mon';
}

String _formatPickerDate(DateTime d) =>
    '${d.day.toString().padLeft(2, '0')}.'
    '${d.month.toString().padLeft(2, '0')}.'
    '${d.year}';

Color _scoreColor(double score, ColorScheme scheme) {
  if (score >= 80) return const Color(0xFF4ADE80);
  if (score >= 60) return scheme.primary;
  if (score >= 40) return const Color(0xFFFBBF24);
  return scheme.error;
}

class PlannerScreen extends StatefulWidget {
  const PlannerScreen({super.key});

  @override
  State<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends State<PlannerScreen> {
  final TextEditingController _intentCtrl = TextEditingController();
  late DateTime _start;
  late DateTime _end;
  final int _topN = 5;

  List<CanonicalRecipeMeta> _recipes = const <CanonicalRecipeMeta>[];
  String? _selectedRecipeId;

  PlannerSearchResult? _result;
  String? _selectedWindowDate;
  int _selectedPlanetaryHour = 0;
  String? _selectedVibeId;
  bool _loading = false;
  bool _loadingRecipes = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final DateTime now = DateTime.now();
    _start = DateTime(now.year, now.month, now.day);
    _end = _start.add(const Duration(days: 60));
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadRecipes());
  }

  @override
  void dispose() {
    _intentCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadRecipes() async {
    final Settings settings = AppScope.of(context).settings;
    if (settings.offlineOnly) return;
    setState(() => _loadingRecipes = true);
    try {
      final List<CanonicalRecipeMeta> rows =
          await AppScope.of(context).api.listRecipes();
      if (!mounted) return;
      setState(() {
        _recipes = rows;
        _loadingRecipes = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingRecipes = false);
    }
  }

  Future<void> _pickDate({required bool start}) async {
    final DateTime initial = start ? _start : _end;
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2040),
    );
    if (picked == null) return;
    setState(() {
      if (start) {
        _start = DateTime(picked.year, picked.month, picked.day);
        if (_end.isBefore(_start)) {
          _end = _start.add(const Duration(days: 7));
        }
      } else {
        _end = DateTime(picked.year, picked.month, picked.day);
      }
    });
  }

  void _applySample(String text) {
    _intentCtrl.text = text;
    setState(() => _selectedRecipeId = null);
  }

  Future<void> _searchIntent() async {
    final String intent = _intentCtrl.text.trim();
    if (intent.isEmpty) return;
    await _runSearch(() {
      final Settings s = AppScope.of(context).settings;
      return AppScope.of(context).api.searchWithIntent(
            intent: intent,
            start: _start,
            end: _end,
            lat: s.place.lat,
            lon: s.place.lonEast,
            timezone: _timezoneFor(s.place),
            topN: _topN,
          );
    });
  }

  Future<void> _searchFixed(String recipeId) async {
    setState(() {
      _selectedRecipeId = recipeId;
      _intentCtrl.clear();
    });
    await _runSearch(() {
      final Settings s = AppScope.of(context).settings;
      return AppScope.of(context).api.searchWithFixedRecipe(
            recipeId: recipeId,
            start: _start,
            end: _end,
            lat: s.place.lat,
            lon: s.place.lonEast,
            timezone: _timezoneFor(s.place),
            topN: _topN,
          );
    });
  }

  Future<void> _runSearch(
    Future<PlannerSearchResult> Function() request,
  ) async {
    final Settings settings = AppScope.of(context).settings;
    if (settings.offlineOnly) {
      setState(() => _error = 'Планировщику нужна сеть. Отключите «только офлайн».');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });

    try {
      final PlannerSearchResult res = await request();
      if (!mounted) return;
      setState(() {
        _result = res;
        _loading = false;
        _selectedWindowDate = res.windows.isEmpty ? null : res.windows.first.date;
        _selectedPlanetaryHour = 0;
        _selectedVibeId = res.generatedRecipe?.vibes.firstOrNull?.id;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final Settings settings = AppScope.of(context).settings;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: <Widget>[
          Text(
            'Подбор дня',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Место: ${settings.place.title}. LLM переводит намерение в рецепт и ранжирует дни.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
          if (settings.offlineOnly) ...<Widget>[
            const SizedBox(height: 12),
            _Banner(
              color: theme.colorScheme.errorContainer,
              text:
                  'Режим «только офлайн»: планировщик недоступен. Карта и разбор дня работают как прежде.',
            ),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _intentCtrl,
            minLines: 2,
            maxLines: 4,
            enabled: !settings.offlineOnly && !_loading,
            decoration: const InputDecoration(
              labelText: 'Что хочешь сделать?',
              hintText: 'Например: подписать договор аренды',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) {
              if (_selectedRecipeId != null) {
                setState(() => _selectedRecipeId = null);
              }
            },
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _sampleIntents
                .map(
                  (String s) => ActionChip(
                    label: Text(s, style: const TextStyle(fontSize: 12)),
                    onPressed: settings.offlineOnly || _loading
                        ? null
                        : () => _applySample(s),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: OutlinedButton(
                  onPressed: settings.offlineOnly || _loading
                      ? null
                      : () => _pickDate(start: true),
                  child: Text('С ${_formatPickerDate(_start)}'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: settings.offlineOnly || _loading
                      ? null
                      : () => _pickDate(start: false),
                  child: Text('По ${_formatPickerDate(_end)}'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: settings.offlineOnly ||
                    _loading ||
                    _intentCtrl.text.trim().isEmpty
                ? null
                : _searchIntent,
            icon: const Icon(Icons.search),
            label: const Text('Найти окна'),
          ),
          if (_loadingRecipes)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: LinearProgressIndicator(),
            )
          else if (_recipes.isNotEmpty) ...<Widget>[
            const SizedBox(height: 20),
            Text(
              'Без LLM — готовые рецепты',
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            ..._recipes.map(
              (CanonicalRecipeMeta r) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Material(
                  color: _selectedRecipeId == r.id
                      ? theme.colorScheme.primary.withValues(alpha: 0.15)
                      : theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  child: ListTile(
                    dense: true,
                    title: Text(r.intent, maxLines: 2, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                      r.rationale,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                    trailing: _loading && _selectedRecipeId == r.id
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.chevron_right),
                    onTap: settings.offlineOnly || _loading
                        ? null
                        : () => _searchFixed(r.id),
                  ),
                ),
              ),
            ),
          ],
          if (_loading) ...<Widget>[
            const SizedBox(height: 24),
            const Center(child: CircularProgressIndicator()),
            const SizedBox(height: 8),
            Center(
              child: Text(
                'LLM строит рецепт и считает скоринг…',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
          if (_error != null) ...<Widget>[
            const SizedBox(height: 16),
            _Banner(color: theme.colorScheme.errorContainer, text: _error!),
          ],
          if (_result != null && !_loading) ...<Widget>[
            const SizedBox(height: 20),
            _ResultHeader(result: _result!),
            if (_result!.generatedRecipe != null)
              _RecipePanel(recipe: _result!.generatedRecipe!, cached: _result!.llmCached),
            const SizedBox(height: 12),
            if (_result!.windows.isEmpty)
              _Banner(
                color: theme.colorScheme.surfaceContainerHighest,
                text:
                    'В этом диапазоне нет подходящих дней. Расширь даты или переформулируй намерение.',
              )
            else
              ..._result!.windows.map(
                (TimingWindow w) => _WindowCard(
                  window: w,
                  expanded: _selectedWindowDate == w.date,
                  vibes: _result!.generatedRecipe?.vibes ?? const <PlannerVibe>[],
                  selectedVibeId: _selectedVibeId,
                  selectedPlanetaryHour: _selectedPlanetaryHour,
                  onExpand: () => setState(() {
                    _selectedWindowDate = w.date;
                    _selectedPlanetaryHour = 0;
                    if (_selectedVibeId == null &&
                        _result!.generatedRecipe != null &&
                        _result!.generatedRecipe!.vibes.isNotEmpty) {
                      _selectedVibeId = _result!.generatedRecipe!.vibes.first.id;
                    }
                  }),
                  onVibeSelected: (String id) =>
                      setState(() => _selectedVibeId = id),
                  onPlanetaryHourSelected: (int hour) =>
                      setState(() => _selectedPlanetaryHour = hour),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  final Color color;
  final String text;

  const _Banner({required this.color, required this.text});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(text),
      ),
    );
  }
}

class _ResultHeader extends StatelessWidget {
  final PlannerSearchResult result;

  const _ResultHeader({required this.result});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(result.summary, style: theme.textTheme.bodyLarge),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 4,
          children: <Widget>[
            if (result.disqualifiedDays > 0)
              Text('дисквалифицировано: ${result.disqualifiedDays}'),
            Text('время: ${result.latencySec.toStringAsFixed(1)} с'),
            if (result.requestId.isNotEmpty)
              Text('id: ${result.requestId.substring(0, 8)}'),
          ],
        ),
      ],
    );
  }
}

class _RecipePanel extends StatefulWidget {
  final GeneratedRecipe recipe;
  final bool cached;

  const _RecipePanel({required this.recipe, required this.cached});

  @override
  State<_RecipePanel> createState() => _RecipePanelState();
}

class _RecipePanelState extends State<_RecipePanel> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Material(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: <Widget>[
            ListTile(
              title: const Text('Что понял LLM'),
              trailing: Text(widget.cached ? 'кэш' : 'свежий'),
              onTap: () => setState(() => _open = !_open),
            ),
            if (_open) ...<Widget>[
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(widget.recipe.intent,
                        style: theme.textTheme.titleSmall),
                    const SizedBox(height: 6),
                    Text(widget.recipe.rationale),
                    if (widget.recipe.vibes.isNotEmpty) ...<Widget>[
                      const SizedBox(height: 12),
                      Text('Vibes', style: theme.textTheme.labelLarge),
                      const SizedBox(height: 4),
                      ...widget.recipe.vibes.map(
                        (PlannerVibe v) => Text('• ${v.label}'),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _WindowCard extends StatelessWidget {
  final TimingWindow window;
  final bool expanded;
  final List<PlannerVibe> vibes;
  final String? selectedVibeId;
  final int selectedPlanetaryHour;
  final VoidCallback onExpand;
  final ValueChanged<String> onVibeSelected;
  final ValueChanged<int> onPlanetaryHourSelected;

  const _WindowCard({
    required this.window,
    required this.expanded,
    required this.vibes,
    required this.selectedVibeId,
    required this.selectedPlanetaryHour,
    required this.onExpand,
    required this.onVibeSelected,
    required this.onPlanetaryHourSelected,
  });

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final Settings settings = AppScope.of(context).settings;
    final Color scoreColor = _scoreColor(window.score, theme.colorScheme);
    final String moonLine =
        '${_phaseRu[window.moon.phase] ?? window.moon.phase}, '
        '${_signRu[window.moon.sign] ?? window.moon.sign}';
    final List<PlanetaryHourSlot> hours =
        planetaryHoursForDay(window.date, settings.place);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: expanded
            ? theme.colorScheme.primary.withValues(alpha: 0.08)
            : theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onExpand,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Text('#${window.rank}',
                        style: theme.textTheme.labelLarge),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _formatIsoDate(window.date),
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: scoreColor.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        window.score.toStringAsFixed(0),
                        style: TextStyle(
                          color: scoreColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(moonLine, style: theme.textTheme.bodySmall),
                if (window.moon.voidOfCourse)
                  const Padding(
                    padding: EdgeInsets.only(top: 4),
                    child: Text('VoC', style: TextStyle(color: Colors.orange)),
                  ),
                if (window.retrogradePlanets.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      '℞ ${window.retrogradePlanets.join(', ')}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                if (expanded) ...<Widget>[
                  const SizedBox(height: 12),
                  if (vibes.isNotEmpty) ...<Widget>[
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: vibes
                            .map(
                              (PlannerVibe v) => Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: ChoiceChip(
                                  label: Text(v.label),
                                  selected: selectedVibeId == v.id,
                                  onSelected: (_) => onVibeSelected(v.id),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      window.vibeNarratives[selectedVibeId] ??
                          window.vibeNarratives.values.firstOrNull ??
                          'Нарратив для этого vibe пока пуст.',
                    ),
                  ] else if (window.matchedPredicates.isNotEmpty)
                    Text(
                      'Сработало ${window.matchedPredicates.length} предикатов — '
                      'см. список ниже.',
                    ),
                  if (window.matchedPredicates.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 8),
                    ...window.matchedPredicates.map(
                      (MatchedPredicate p) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              '${p.weight >= 0 ? '+' : ''}${p.weight.toStringAsFixed(0)} ',
                              style: TextStyle(color: scoreColor),
                            ),
                            Expanded(child: Text(p.type)),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Text('Планетарные часы', style: theme.textTheme.labelLarge),
                  const SizedBox(height: 6),
                  _PlanetaryHourStrip(
                    hours: hours,
                    selectedIndex: selectedPlanetaryHour,
                    onSelected: onPlanetaryHourSelected,
                  ),
                  const SizedBox(height: 8),
                  MomentBiwheel(
                    moment: hours[selectedPlanetaryHour].momentUtc,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PlanetaryHourStrip extends StatelessWidget {
  final List<PlanetaryHourSlot> hours;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _PlanetaryHourStrip({
    required this.hours,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: hours
            .map(
              (PlanetaryHourSlot h) => Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(
                    '${h.displayNumber} ${rulerShortName(h.ruler)}',
                    style: const TextStyle(fontSize: 12),
                  ),
                  selected: selectedIndex == h.index,
                  onSelected: (_) => onSelected(h.index),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final Iterator<E> it = iterator;
    if (!it.moveNext()) return null;
    return it.current;
  }
}
