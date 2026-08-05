/// Толкования из таблиц самого приложения. Сети не требует никогда.
///
/// Это нижний слой: текст собирается из значений участников и характера
/// аспекта по фиксированному шаблону. Он заведомо беднее корпуса, зато есть
/// всегда и на любой ключ, включая те, которых в корпусе нет вовсе.
///
/// Лунные дни закрыты полностью: таблица тридцати дней с полярностью сфер уже
/// лежит в [lunarDayTable], она же зашита в прошивку часов.
library;

import '../../core/ephemeris/lunar.dart';
import '../../core/ephemeris/names.dart';
import '../../core/ephemeris/transits.dart';
import 'models.dart';
import 'source.dart';

/// Чем ведает точка карты. Именительный падеж, чтобы подставлялось в оба
/// места шаблона.
const Map<int, String> _domain = <int, String>{
  0: 'воля и то, вокруг чего собран день',
  1: 'настроение, быт, реакция на происходящее',
  2: 'речь, расчёты, переписка, короткие поездки',
  3: 'вкус, деньги, отношения, чувство меры',
  4: 'напор, конфликт, физическое действие',
  5: 'рост, расширение, право на большее',
  6: 'ограничение, сроки, ответственность',
  7: 'слом привычного, внезапный поворот',
  8: 'размывание границ, воображение, туман',
  9: 'глубинная перестройка, власть, кризис',
  natalAsc: 'внешность поведения, первая реакция',
  natalMc: 'карьера, публичная роль, цель',
};

/// Что аспект делает с парой. Первым идёт транзитное тело, вторым натальное.
const Map<AspectKind, String> _mechanics = <AspectKind, String>{
  AspectKind.conjunction:
      'сливаются в одно: разделить, где чьё, не выйдет, действуют вместе',
  AspectKind.sextile:
      'дают возможность, но она не сработает сама. Нужен шаг с вашей стороны',
  AspectKind.square:
      'трутся друг о друга. Одно мешает другому, и разрешается это только '
          'действием, а не ожиданием',
  AspectKind.trine:
      'идут заодно. Дело даётся легко, поэтому легко и упустить момент',
  AspectKind.opposition:
      'тянут в разные стороны. Выбор между ними ложный: работает то, что '
          'учитывает оба полюса',
};

/// Сферы дня в одну строку.
String _spheres(List<Sphere> list) =>
    list.map((Sphere s) => s.label).join(', ');

class LocalRuleInterpretationSource extends InterpretationSource {
  @override
  String get id => 'local-rules';

  @override
  bool get worksOffline => true;

  @override
  Future<List<Interpretation>> lookup(
    InterpretationKey key, {
    int limit = 4,
  }) async {
    switch (key) {
      case AspectKey k:
        return <Interpretation>[_aspect(k)];
      case LunarDayKey k:
        return <Interpretation>[_lunarDay(k.number)];
      case PlanetInSignKey k:
        return <Interpretation>[_planetInSign(k)];
      case PlanetInHouseKey k:
        return <Interpretation>[_planetInHouse(k)];
      case DegreeKey _:
        // Символика градуса целиком в корпусе, вывести её из правил нельзя
        return const <Interpretation>[];
    }
  }

  Interpretation _aspect(AspectKey k) {
    final String a = natalPointNameRu(k.point1);
    final String b = natalPointNameRu(k.point2);
    final String da = _domain[k.point1] ?? '';
    final String db = _domain[k.point2] ?? '';
    final String mech = _mechanics[k.kind]!;

    return Interpretation(
      body: 'Транзитный $a приходит к натальной точке «$b». '
          'За $a стоит $da, за $b — $db. В аспекте «${aspectNamesRu[k.kind]}» они $mech.',
      provenance: Provenance.rule,
      author: null,
      label: aspectNamesRu[k.kind],
    );
  }

  Interpretation _lunarDay(int number) {
    final LunarDayInfo d = lunarDayTable[number - 1];
    final String tone = switch (d.tone) {
      1 => 'День лёгкий.',
      -1 => 'День требует осторожности.',
      _ => 'День ровный.',
    };
    final StringBuffer sb = StringBuffer()
      ..write('${d.number}-е лунные сутки, «${d.title}». $tone');
    if (d.yes.isNotEmpty) {
      sb.write(' Подходит: ${_spheres(d.yes)}.');
    }
    if (d.no.isNotEmpty) {
      sb.write(' Лучше не затевать: ${_spheres(d.no)}.');
    }
    return Interpretation(
      body: sb.toString(),
      provenance: Provenance.rule,
      label: d.title,
      sourceTitle: 'разметка по корпусу ZET, 210 текстов семи авторов',
    );
  }

  Interpretation _planetInSign(PlanetInSignKey k) {
    final String p = bodyNamesRu[k.body.index];
    final String s = signNamesRu[k.sign];
    final String el = elementOfSign(k.sign);
    return Interpretation(
      body: '$p в знаке $s. Стихия знака — $el, и она задаёт, каким способом '
          'работает то, чем ведает планета: ${_domain[k.body.index]}.',
      provenance: Provenance.rule,
    );
  }

  Interpretation _planetInHouse(PlanetInHouseKey k) {
    final String p = bodyNamesRu[k.body.index];
    return Interpretation(
      body: '$p в ${k.house}-м доме: ${_houseTopics[k.house] ?? ''}. '
          'Здесь проявляется ${_domain[k.body.index]}.',
      provenance: Provenance.rule,
    );
  }
}

const Map<int, String> _houseTopics = <int, String>{
  1: 'вы сами, тело, манера входить в ситуацию',
  2: 'деньги, вещи, чувство собственного ресурса',
  3: 'ближний круг, переписка, короткие поездки, учёба',
  4: 'дом, семья, корни, то, куда возвращаются',
  5: 'дети, творчество, игра, риск ради удовольствия',
  6: 'работа изо дня в день, режим, здоровье',
  7: 'партнёр, договор, открытый противник',
  8: 'чужие деньги, кризисы, то, что меняет необратимо',
  9: 'дальние поездки, вера, высшее образование, взгляд целиком',
  10: 'карьера, публичная роль, оценка со стороны',
  11: 'круг своих, планы, поддержка сообщества',
  12: 'уединение, скрытое, то, что мешает из тени',
};
