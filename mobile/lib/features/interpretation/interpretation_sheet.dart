/// Шторка с толкованием одного фактора карты.
///
/// Тексты приходят из [InterpretationSource]: сначала правило, которое есть
/// всегда, затем корпус, если до него дозвонились. Источник каждого текста
/// подписан — читатель должен видеть, книга это или шаблон приложения.
library;

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../data/interpretation/models.dart';
import '../../data/interpretation/source.dart';

Future<void> showInterpretation(
  BuildContext context, {
  required InterpretationKey key,
  required String title,
  String? subtitle,
}) {
  final InterpretationSource source = AppScope.of(context).interpretations;
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (BuildContext context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      maxChildSize: 0.92,
      builder: (BuildContext context, ScrollController controller) =>
          _InterpretationBody(
        source: source,
        keyToLookup: key,
        title: title,
        subtitle: subtitle,
        controller: controller,
      ),
    ),
  );
}

class _InterpretationBody extends StatefulWidget {
  final InterpretationSource source;
  final InterpretationKey keyToLookup;
  final String title;
  final String? subtitle;
  final ScrollController controller;

  const _InterpretationBody({
    required this.source,
    required this.keyToLookup,
    required this.title,
    required this.controller,
    this.subtitle,
  });

  @override
  State<_InterpretationBody> createState() => _InterpretationBodyState();
}

class _InterpretationBodyState extends State<_InterpretationBody> {
  late Future<List<Interpretation>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.source.lookup(widget.keyToLookup, limit: 6);
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return ListView(
      controller: widget.controller,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
      children: <Widget>[
        Text(widget.title, style: theme.textTheme.titleLarge),
        if (widget.subtitle != null) ...<Widget>[
          const SizedBox(height: 4),
          Text(widget.subtitle!,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.primary)),
        ],
        const SizedBox(height: 16),
        FutureBuilder<List<Interpretation>>(
          future: _future,
          builder: (BuildContext context,
              AsyncSnapshot<List<Interpretation>> snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            final List<Interpretation> items = snap.data ?? const <Interpretation>[];
            if (items.isEmpty) {
              return Text(
                'Толкований нет. Корпус закрывает не все сочетания, '
                'а до сети сейчас не дозвониться.',
                style: theme.textTheme.bodyMedium,
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                for (final Interpretation i in items) _Entry(entry: i),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _Entry extends StatelessWidget {
  final Interpretation entry;
  const _Entry({required this.entry});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final String? attribution = entry.author ?? entry.sourceTitle;

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              _ProvenanceChip(provenance: entry.provenance),
              if (attribution != null) ...<Widget>[
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    attribution,
                    style: theme.textTheme.labelMedium,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          SelectableText(entry.body, style: theme.textTheme.bodyLarge),
        ],
      ),
    );
  }
}

class _ProvenanceChip extends StatelessWidget {
  final Provenance provenance;
  const _ProvenanceChip({required this.provenance});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final Color c = switch (provenance) {
      Provenance.corpus => theme.colorScheme.primary,
      Provenance.rule => theme.colorScheme.onSurface.withValues(alpha: 0.6),
      Provenance.llm => theme.colorScheme.secondary,
      Provenance.cache => theme.colorScheme.onSurface.withValues(alpha: 0.5),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        border: Border.all(color: c.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(provenance.label,
          style: theme.textTheme.labelSmall?.copyWith(color: c)),
    );
  }
}
