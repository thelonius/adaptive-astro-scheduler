/// Точка входа.
///
/// Карта считается локально и без сети работает целиком. Сеть нужна только
/// слою толкований, и он собран так, что её отсутствие убирает часть текстов,
/// а не ломает экран.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import 'app.dart';
import 'data/api/astro_api.dart';
import 'data/interpretation/cache_store.dart';
import 'data/interpretation/local_rule_source.dart';
import 'data/interpretation/remote_source.dart';
import 'data/interpretation/source.dart';
import 'data/settings.dart';
import 'state/device_controller.dart';
import 'state/sky_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final Settings settings = Settings();
  await settings.load();

  final InterpretationCache cache = InterpretationCache();
  final AstroApi api = AstroApi(baseUrl: settings.apiUri);

  // Порядок важен: правила отвечают мгновенно и всегда, корпус дополняет их,
  // когда сеть есть. Кэш стоит перед обоими, и его наполняет сетевой источник.
  final CompositeInterpretationSource interpretations =
      CompositeInterpretationSource(
    sources: <InterpretationSource>[
      LocalRuleInterpretationSource(),
      RemoteInterpretationSource(api),
    ],
    cache: cache,
    offlineOnly: settings.offlineOnly,
  );

  settings.addListener(() {
    interpretations.offlineOnly = settings.offlineOnly;
  });

  final DeviceController device = DeviceController(settings);
  // Без await: если часы рядом и уже сопряжены, ОС переподключит в фоне.
  // Запуск приложения ждать BLE не должен, в отличие от settings.load()
  // (локальный диск, быстро)
  unawaited(device.reconnectToSaved());

  runApp(AstroClockApp(
    settings: settings,
    sky: SkyController(settings),
    interpretations: interpretations,
    cache: cache,
    device: device,
  ));
}
