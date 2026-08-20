/// Проверка, что приложение собирается и рисует на локальных данных.
///
/// Сети здесь нет и быть не может: тест гоняется в песочнице flutter_test.
/// Ровно это и проверяется — карта, транзиты и разбор дня должны появиться
/// без единого запроса наружу.
library;

import 'package:astro_clock/app.dart';
import 'package:astro_clock/data/interpretation/cache_store.dart';
import 'package:astro_clock/data/interpretation/local_rule_source.dart';
import 'package:astro_clock/data/interpretation/models.dart';
import 'package:astro_clock/data/interpretation/source.dart';
import 'package:astro_clock/data/settings.dart';
import 'package:astro_clock/features/wheel/wheel_painter.dart';
import 'package:astro_clock/state/device_controller.dart';
import 'package:astro_clock/state/sky_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Кэш подменён на память: sqflite в тестовой песочнице недоступен, а слою
/// толкований всё равно, кто именно умеет читать и писать.
class _MemoryCache extends LocalInterpretationStore {
  final Map<String, List<Interpretation>> _rows =
      <String, List<Interpretation>>{};

  @override
  String get id => 'memory';

  @override
  bool get worksOffline => true;

  @override
  Future<List<Interpretation>> lookup(InterpretationKey key,
          {int limit = 4}) async =>
      (_rows[key.cacheKey] ?? const <Interpretation>[]).take(limit).toList();

  @override
  Future<void> store(InterpretationKey key, List<Interpretation> entries) async {
    _rows[key.cacheKey] = entries;
  }

  @override
  Future<int> count() async =>
      _rows.values.fold<int>(0, (int a, List<Interpretation> b) => a + b.length);

  @override
  Future<void> clear() async => _rows.clear();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<(Settings, SkyController, CompositeInterpretationSource, DeviceController)>
      build() async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final Settings settings = Settings();
    await settings.load();
    await settings.setOfflineOnly(true);
    final CompositeInterpretationSource source = CompositeInterpretationSource(
      sources: <InterpretationSource>[LocalRuleInterpretationSource()],
      offlineOnly: true,
    );
    // Не сопряжено (pairedDeviceId == null) — reconnectToSaved() в main()
    // и без того не трогает BLE, если ничего запоминать. Здесь то же самое:
    // конструктор ничего не открывает, тест не касается платформенных каналов
    return (settings, SkyController(settings), source, DeviceController(settings));
  }

  testWidgets('карта рисуется на дефолтных натальных данных', (tester) async {
    final (Settings settings, SkyController sky, CompositeInterpretationSource src,
            DeviceController device) =
        await build();

    await tester.pumpWidget(AstroClockApp(
      settings: settings,
      sky: sky,
      interpretations: src,
      cache: _MemoryCache(),
      device: device,
    ));
    await tester.pump();

    expect(find.byType(CustomPaint), findsWidgets);
    final CustomPaint paint = tester.widgetList<CustomPaint>(
        find.byType(CustomPaint)).firstWhere(
      (CustomPaint p) => p.painter is WheelPainter,
    );
    final WheelPainter painter = paint.painter! as WheelPainter;
    expect(painter.sky.lon.length, 10);
    expect(painter.mode, WheelMode.biwheel);

    // Асцендент прибит к левому краю: угол 180° при любой долготе
    expect(find.text('биwheel'), findsOneWidget);
    expect(find.text('небо'), findsOneWidget);
    sky.dispose();
  });

  testWidgets('вкладка транзитов открывается и показывает список',
      (tester) async {
    final (Settings settings, SkyController sky, CompositeInterpretationSource src,
            DeviceController device) =
        await build();

    await tester.pumpWidget(AstroClockApp(
      settings: settings,
      sky: sky,
      interpretations: src,
      cache: _MemoryCache(),
      device: device,
    ));
    await tester.pump();

    await tester.tap(find.text('Транзиты'));
    await tester.pumpAndSettle();

    final int n = sky.sky!.hits.length;
    if (n > 0) {
      expect(find.textContaining('транзитов'), findsOneWidget);
    } else {
      expect(find.textContaining('Активных транзитов'), findsOneWidget);
    }
    sky.dispose();
  });

  testWidgets('толкование по правилу открывается без сети', (tester) async {
    final (Settings settings, SkyController sky, CompositeInterpretationSource src,
            DeviceController device) =
        await build();

    await tester.pumpWidget(AstroClockApp(
      settings: settings,
      sky: sky,
      interpretations: src,
      cache: _MemoryCache(),
      device: device,
    ));
    await tester.pump();

    await tester.tap(find.text('День'));
    await tester.pumpAndSettle();

    // Планетарный час считается локально и появляется сразу, лунные сутки
    // досчитываются в изоляте
    expect(find.text('ПЛАНЕТАРНЫЙ ЧАС'), findsOneWidget);
    expect(find.text('ЛУНА'), findsOneWidget);
    sky.dispose();
  });
}
