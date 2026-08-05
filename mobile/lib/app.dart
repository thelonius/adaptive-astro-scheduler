/// Оболочка приложения: четыре вкладки и тема, которая едет за небом.
///
/// Цвета берутся из живой палитры (порт packages/astro-palette): hue фона и
/// текста от управителя дня, hue акцента от управителя планетарного часа.
/// Поэтому тема меняется в течение суток сама, без всяких переключателей.
library;

import 'package:flutter/material.dart';

import 'core/ephemeris/palette.dart';
import 'data/interpretation/cache_store.dart';
import 'data/interpretation/source.dart';
import 'data/settings.dart';
import 'features/day/day_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/transits/transit_list_screen.dart';
import 'features/wheel/wheel_screen.dart';
import 'features/wheel/wheel_theme.dart';
import 'state/sky_controller.dart';

/// Доступ к сервисам без внешних пакетов состояния: их тут ровно четыре.
class AppScope extends InheritedWidget {
  final Settings settings;
  final SkyController sky;
  final InterpretationSource interpretations;
  final LocalInterpretationStore cache;

  const AppScope({
    super.key,
    required this.settings,
    required this.sky,
    required this.interpretations,
    required this.cache,
    required super.child,
  });

  static AppScope of(BuildContext context) {
    final AppScope? scope =
        context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope не найден выше по дереву');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppScope old) =>
      settings != old.settings ||
      sky != old.sky ||
      interpretations != old.interpretations;
}

class AstroClockApp extends StatelessWidget {
  final Settings settings;
  final SkyController sky;
  final InterpretationSource interpretations;
  final LocalInterpretationStore cache;

  const AstroClockApp({
    super.key,
    required this.settings,
    required this.sky,
    required this.interpretations,
    required this.cache,
  });

  @override
  Widget build(BuildContext context) {
    return AppScope(
      settings: settings,
      sky: sky,
      interpretations: interpretations,
      cache: cache,
      child: AnimatedBuilder(
        animation: Listenable.merge(<Listenable>[sky, settings]),
        builder: (BuildContext context, _) {
          final LivePalette? p = sky.sky?.palette;
          return MaterialApp(
            title: 'Астро-часы',
            debugShowCheckedModeBanner: false,
            theme: _themeFrom(p, settings.theme),
            home: const HomeShell(),
          );
        },
      ),
    );
  }
}

ThemeData _themeFrom(LivePalette? p, int themeIndex) {
  // Пока небо не посчитано, а также в фиксированных темах, палитра берётся
  // из таблицы: она не зависит от эфемерид и доступна сразу
  final WheelTheme fallback = fixedThemes[0];
  final Color bg = themeIndex == 0 ? (p?.bg ?? fallback.bg) : fixedThemes[themeIndex - 1].bg;
  final Color surface =
      themeIndex == 0 ? (p?.surface ?? const Color(0xFF14141A)) : bg;
  final Color accent = themeIndex == 0
      ? (p?.accent ?? fallback.fire)
      : fixedThemes[themeIndex - 1].fire;
  final Color text =
      themeIndex == 0 ? (p?.text ?? fallback.text) : fixedThemes[themeIndex - 1].text;
  final Color muted = themeIndex == 0
      ? (p?.muted ?? const Color(0xFF9A9AA5))
      : text.withValues(alpha: 0.7);

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: bg,
    colorScheme: ColorScheme.dark(
      primary: accent,
      secondary: accent,
      surface: surface,
      onSurface: text,
      onPrimary: bg,
    ),
    textTheme: Typography.whiteMountainView.apply(
      bodyColor: text,
      displayColor: text,
    ),
    dividerColor: muted.withValues(alpha: 0.25),
    appBarTheme: AppBarTheme(
      backgroundColor: bg,
      foregroundColor: text,
      elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: surface,
      indicatorColor: accent.withValues(alpha: 0.22),
      labelTextStyle: WidgetStatePropertyAll<TextStyle>(
        TextStyle(fontSize: 11, color: text),
      ),
      iconTheme: WidgetStateProperty.resolveWith<IconThemeData>(
        (Set<WidgetState> states) => IconThemeData(
          color: states.contains(WidgetState.selected) ? accent : muted,
        ),
      ),
    ),
    listTileTheme: ListTileThemeData(textColor: text, iconColor: muted),
  );
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;

  static const List<Widget> _screens = <Widget>[
    WheelScreen(),
    DayScreen(),
    TransitListScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _tab, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (int i) => setState(() => _tab = i),
        destinations: const <NavigationDestination>[
          NavigationDestination(
              icon: Icon(Icons.brightness_1_outlined), label: 'Карта'),
          NavigationDestination(
              icon: Icon(Icons.wb_twilight_outlined), label: 'День'),
          NavigationDestination(
              icon: Icon(Icons.timeline_outlined), label: 'Транзиты'),
          NavigationDestination(
              icon: Icon(Icons.tune_outlined), label: 'Настройки'),
        ],
      ),
    );
  }
}
