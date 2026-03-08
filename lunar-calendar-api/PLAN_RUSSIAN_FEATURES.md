# План Реализации Астрологических Компонентов
# Implementation Plan for Missing Astrological Components

**Статус проекта**: Базовый эфемерид развернут ✅
**Цель**: Добавить все отсутствующие профессиональные функции
**Срок**: 8 недель для полной реализации

---

## 📊 Обзор Отсутствующих Компонентов

### Текущее состояние: 9/35 функций (26%)

**Что уже есть** ✅:
- Планеты (Солнце - Плутон)
- Фазы Луны
- Лунные дни (1-30)
- Аспекты (конъюнкция, трин, квадрат и т.д.)
- Ретроградность
- Дома (базовая система)
- Кэширование
- REST API

**Что нужно добавить** ❌:
- Лунные узлы (Раху и Кету)
- Чёрная Луна (Лилит)
- Астероиды (Хирон, Церера, Паллада и т.д.)
- Прогрессии и дирекции
- Синастрия
- Солнечные дуги
- Арабские части (Part of Fortune и др.)
- Гармонические карты
- Астрокартография

---

## 🎯 ФАЗА 1: Важнейшие Точки (Неделя 1)

**Приоритет**: 🔴 ВЫСОКИЙ
**Время**: 5-7 дней (20-25 часов)
**Стоимость**: $2,000-4,000
**Влияние**: ⭐⭐⭐⭐⭐ Очень высокое

### 1.1 Лунные Узлы (Раху и Кету) 📍

**Зачем нужно**:
- Показывают кармическую ось судьбы
- Северный узел (Раху) - направление развития
- Южный узел (Кету) - прошлые навыки
- Критичны для ведической астрологии

**Технические детали**:
```python
# Типы узлов
- True Node (истинный) - точная позиция пересечения орбит
- Mean Node (средний) - усредненная позиция (обычно используется)

# Формула
south_node = (north_node + 180°) % 360

# Скорость движения
~19° в год (ретроградное движение)
```

**API Endpoints**:
```
GET /api/v1/ephemeris/nodes
GET /api/v1/ephemeris/nodes?type=true     # Истинный узел
GET /api/v1/ephemeris/nodes?type=mean     # Средний узел
```

**Пример ответа**:
```json
{
  "north_node": {
    "longitude": 15.234,
    "zodiac_sign": "Aries",
    "degree_in_sign": 15.234,
    "speed": -0.053,
    "is_retrograde": true,
    "house": 1
  },
  "south_node": {
    "longitude": 195.234,
    "zodiac_sign": "Libra",
    "degree_in_sign": 15.234,
    "speed": -0.053,
    "is_retrograde": true,
    "house": 7
  },
  "interpretation": {
    "north_node_sign": "Стремление к самостоятельности и лидерству",
    "south_node_sign": "Опыт отношений и партнёрства"
  }
}
```

**Реализация**:
```python
# app/core/ephemeris/calculations/nodes.py

from typing import Tuple
import swisseph as swe

class LunarNodesCalculator:
    """Расчёт лунных узлов (Раху и Кету)"""

    def calculate_nodes(
        self,
        julian_day: float,
        node_type: str = 'mean'  # 'mean' или 'true'
    ) -> Tuple[float, float]:
        """
        Рассчитать северный и южный узлы.

        Args:
            julian_day: Юлианский день
            node_type: 'mean' (средний) или 'true' (истинный)

        Returns:
            (north_node_longitude, south_node_longitude)
        """

        # Выбор типа узла
        if node_type == 'mean':
            node_id = swe.MEAN_NODE
        else:
            node_id = swe.TRUE_NODE

        # Расчёт северного узла
        result, _ = swe.calc_ut(julian_day, node_id)
        north_node_lon = result[0]

        # Южный узел = Северный + 180°
        south_node_lon = (north_node_lon + 180) % 360

        return north_node_lon, south_node_lon

    def get_interpretation(
        self,
        north_node_sign: str,
        south_node_sign: str
    ) -> dict:
        """Интерпретация оси узлов"""

        interpretations = {
            'Aries-Libra': {
                'north': 'Развитие самостоятельности, смелости, лидерства',
                'south': 'Опыт дипломатии, партнёрства, компромиссов'
            },
            'Taurus-Scorpio': {
                'north': 'Обретение стабильности, материальных ценностей',
                'south': 'Опыт трансформаций, кризисов, глубины'
            },
            # ... остальные оси
        }

        axis = f"{north_node_sign}-{south_node_sign}"
        return interpretations.get(axis, {})
```

---

### 1.2 Чёрная Луна (Лилит) 🌑

**Зачем нужно**:
- Показывает тёмные стороны личности
- Подавленные желания и страхи
- Области искушений и кризисов
- Теневые аспекты психики

**Типы Лилит**:
1. **Mean Lilith** (средняя) - наиболее используемая
2. **True Lilith** (истинная) - осциллирующий апогей
3. **Corrected Lilith** - интерполированный вариант
4. **Dark Moon Lilith** - гипотетическая вторая Луна

**API Endpoints**:
```
GET /api/v1/ephemeris/lilith
GET /api/v1/ephemeris/lilith?type=mean      # По умолчанию
GET /api/v1/ephemeris/lilith?type=true      # Истинная
GET /api/v1/ephemeris/lilith?type=corrected # Скорректированная
```

**Пример ответа**:
```json
{
  "mean_lilith": {
    "longitude": 125.67,
    "zodiac_sign": "Leo",
    "degree_in_sign": 5.67,
    "house": 8,
    "interpretation": "Подавление творческого самовыражения, страх быть в центре внимания"
  },
  "true_lilith": {
    "longitude": 127.34,
    "zodiac_sign": "Leo",
    "degree_in_sign": 7.34,
    "house": 8
  },
  "aspects_to_planets": [
    {
      "planet": "Venus",
      "aspect": "square",
      "orb": 2.1,
      "interpretation": "Конфликт между любовью и страхом отвержения"
    }
  ]
}
```

**Реализация**:
```python
# app/core/ephemeris/calculations/lilith.py

import swisseph as swe

class LilithCalculator:
    """Расчёт Чёрной Луны (Лилит)"""

    # ID астрономических точек в Swiss Ephemeris
    LILITH_IDS = {
        'mean': swe.MEAN_APOG,      # h12
        'true': swe.OSCU_APOG,      # h13
        'corrected': -1,             # Требует расчёта
    }

    def calculate_lilith(
        self,
        julian_day: float,
        lilith_type: str = 'mean'
    ) -> float:
        """
        Рассчитать позицию Чёрной Луны.

        Args:
            julian_day: Юлианский день
            lilith_type: 'mean', 'true', или 'corrected'

        Returns:
            longitude: Эклиптическая долгота Лилит
        """

        lilith_id = self.LILITH_IDS.get(lilith_type)

        if lilith_id == -1:
            # Для corrected - специальный расчёт
            return self._calculate_corrected_lilith(julian_day)

        result, _ = swe.calc_ut(julian_day, lilith_id)
        return result[0]

    def get_lilith_interpretation(
        self,
        zodiac_sign: str,
        house: int
    ) -> dict:
        """Интерпретация Лилит по знаку и дому"""

        sign_meanings = {
            'Aries': 'Подавление агрессии, страх конфликтов',
            'Taurus': 'Проблемы с материальной безопасностью',
            'Gemini': 'Подавление коммуникации, страх высказаться',
            'Cancer': 'Эмоциональные травмы, проблемы с матерью',
            'Leo': 'Подавление самовыражения, страх внимания',
            'Virgo': 'Перфекционизм, страх несовершенства',
            'Libra': 'Проблемы в отношениях, страх одиночества',
            'Scorpio': 'Сексуальные табу, страх трансформации',
            'Sagittarius': 'Подавление свободы, догматизм',
            'Capricorn': 'Страх неудачи, подавление амбиций',
            'Aquarius': 'Страх быть другим, подавление уникальности',
            'Pisces': 'Жертвенность, страх растворения'
        }

        house_meanings = {
            1: 'Подавленная личность, маска',
            2: 'Проблемы с ценностями, самооценкой',
            3: 'Проблемы коммуникации',
            4: 'Семейные травмы',
            5: 'Подавленное творчество',
            6: 'Проблемы со здоровьем, работой',
            7: 'Проблемы в партнёрстве',
            8: 'Сексуальные табу, страхи',
            9: 'Ограниченное мировоззрение',
            10: 'Карьерные блоки',
            11: 'Проблемы в дружбе',
            12: 'Скрытые страхи, саботаж'
        }

        return {
            'sign': sign_meanings.get(zodiac_sign),
            'house': house_meanings.get(house)
        }
```

---

### 1.3 Арабские Части (Part of Fortune и др.) ☪️

**Зачем нужно**:
- Показывают чувствительные точки гороскопа
- Part of Fortune - счастье и материальное благополучие
- Part of Spirit - духовное призвание
- Другие части для разных сфер жизни

**Основные арабские части**:
1. **Part of Fortune** (Колесо Фортуны) - самая важная
2. **Part of Spirit** (Часть Духа)
3. **Part of Eros** (Часть Эроса) - любовь
4. **Part of Marriage** - брак
5. **Part of Death** - трансформации

**Формулы**:
```python
# Дневная карта (Солнце над горизонтом)
Part of Fortune = ASC + Moon - Sun

# Ночная карта (Солнце под горизонтом)
Part of Fortune = ASC + Sun - Moon

# Part of Spirit (обратная формула)
Day: ASC + Sun - Moon
Night: ASC + Moon - Sun
```

**API Endpoints**:
```
GET /api/v1/ephemeris/arabic-parts
GET /api/v1/ephemeris/arabic-parts/fortune
GET /api/v1/ephemeris/arabic-parts/spirit
GET /api/v1/ephemeris/arabic-parts/custom?name=eros
```

**Пример ответа**:
```json
{
  "part_of_fortune": {
    "longitude": 245.8,
    "zodiac_sign": "Sagittarius",
    "degree_in_sign": 25.8,
    "house": 11,
    "interpretation": "Счастье через друзей, группы, мечты"
  },
  "part_of_spirit": {
    "longitude": 89.3,
    "zodiac_sign": "Cancer",
    "degree_in_sign": 29.3,
    "house": 6,
    "interpretation": "Духовное призвание через служение и заботу"
  },
  "is_day_chart": true,
  "sun_altitude": 45.2
}
```

**Реализация**:
```python
# app/core/ephemeris/calculations/arabic_parts.py

class ArabicPartsCalculator:
    """Расчёт арабских частей"""

    def is_day_chart(self, sun_altitude: float) -> bool:
        """Определить дневную или ночную карту"""
        return sun_altitude > 0

    def calculate_part_of_fortune(
        self,
        ascendant: float,
        sun_longitude: float,
        moon_longitude: float,
        sun_altitude: float
    ) -> float:
        """
        Рассчитать Part of Fortune (Колесо Фортуны).

        Дневная формула: ASC + Moon - Sun
        Ночная формула: ASC + Sun - Moon
        """

        is_day = self.is_day_chart(sun_altitude)

        if is_day:
            pof = (ascendant + moon_longitude - sun_longitude) % 360
        else:
            pof = (ascendant + sun_longitude - moon_longitude) % 360

        return pof

    def calculate_part_of_spirit(
        self,
        ascendant: float,
        sun_longitude: float,
        moon_longitude: float,
        sun_altitude: float
    ) -> float:
        """
        Рассчитать Part of Spirit (Часть Духа).

        Обратная формула к Part of Fortune.
        """

        is_day = self.is_day_chart(sun_altitude)

        if is_day:
            pos = (ascendant + sun_longitude - moon_longitude) % 360
        else:
            pos = (ascendant + moon_longitude - sun_longitude) % 360

        return pos

    def calculate_custom_part(
        self,
        ascendant: float,
        planet1: float,
        planet2: float,
        is_day: bool
    ) -> float:
        """
        Общая формула для любой арабской части.

        Формула: ASC + Planet1 - Planet2 (день)
                ASC + Planet2 - Planet1 (ночь)
        """

        if is_day:
            return (ascendant + planet1 - planet2) % 360
        else:
            return (ascendant + planet2 - planet1) % 360

    PARTS_FORMULAS = {
        'fortune': ('moon', 'sun'),
        'spirit': ('sun', 'moon'),
        'eros': ('venus', 'mars'),
        'marriage': ('venus', 'jupiter'),
        'death': ('moon', 'saturn'),
        'children': ('jupiter', 'saturn'),
        'sickness': ('mars', 'saturn'),
    }

    def calculate_all_parts(
        self,
        positions: dict,
        ascendant: float,
        is_day: bool
    ) -> dict:
        """Рассчитать все основные арабские части"""

        parts = {}

        for part_name, (planet1_name, planet2_name) in self.PARTS_FORMULAS.items():
            planet1 = positions[planet1_name].longitude
            planet2 = positions[planet2_name].longitude

            longitude = self.calculate_custom_part(
                ascendant, planet1, planet2, is_day
            )

            parts[f'part_of_{part_name}'] = {
                'longitude': longitude,
                'zodiac_sign': ZodiacSign.from_longitude(longitude),
                'formula': f'ASC + {planet1_name} - {planet2_name}'
            }

        return parts
```

---

### 1.4 Хирон ⚷

**Зачем нужно**:
- "Раненый целитель"
- Показывает глубинные раны и путь к исцелению
- Важен для психологической астрологии

**API Endpoint**:
```
GET /api/v1/ephemeris/chiron
```

**Реализация**:
```python
# Хирон - астероид номер 2060
chiron_position, _ = swe.calc_ut(jd, 2060)
```

---

## 🔮 ФАЗА 2: Предсказательные Техники (Недели 2-3)

**Приоритет**: 🟡 СРЕДНИЙ
**Время**: 10-14 дней (40-50 часов)
**Стоимость**: $4,000-8,000

### 2.1 Транзиты 🔄

**Зачем нужно**:
- Прогноз текущих влияний
- Поиск важных дат в будущем
- Планирование событий

**Типы транзитов**:
1. Текущие транзиты к натальной карте
2. Поиск будущих транзитов
3. Транзиты к прогрессиям

**API Endpoints**:
```
# Текущие транзиты
POST /api/v1/transits/current
{
  "birth_date": "1990-05-15T10:30:00Z",
  "birth_location": {"lat": 55.75, "lon": 37.62}
}

# Найти будущие транзиты
POST /api/v1/transits/search
{
  "birth_chart": {...},
  "transit_planet": "jupiter",
  "natal_planet": "sun",
  "aspect": "conjunction",
  "date_range": {
    "start": "2026-01-01",
    "end": "2026-12-31"
  }
}
```

**Пример ответа**:
```json
{
  "current_transits": [
    {
      "transit_planet": "Jupiter",
      "natal_planet": "Sun",
      "aspect": "trine",
      "orb": 1.2,
      "exact_date": "2026-01-15T14:30:00Z",
      "is_applying": false,
      "interpretation": "Период роста, оптимизма и новых возможностей"
    },
    {
      "transit_planet": "Saturn",
      "natal_planet": "Moon",
      "aspect": "square",
      "orb": 3.4,
      "exact_date": "2026-01-20T08:15:00Z",
      "is_applying": true,
      "interpretation": "Эмоциональные ограничения, необходимость структуры"
    }
  ],
  "active_count": 12,
  "most_important": {
    "planet": "Pluto",
    "natal_point": "Ascendant",
    "aspect": "conjunction",
    "interpretation": "Мощная трансформация личности"
  }
}
```

---

### 2.2 Вторичные Прогрессии 📅

**Зачем нужно**:
- Внутреннее развитие личности
- Прогрессивная Луна - важные периоды
- Прогрессивный Асцендент - изменение подхода к жизни

**Формула**: 1 день = 1 год

**API Endpoint**:
```
POST /api/v1/progressions/secondary
{
  "birth_date": "1990-05-15T10:30:00Z",
  "birth_location": {"lat": 55.75, "lon": 37.62},
  "progression_date": "2026-01-01"
}
```

**Пример ответа**:
```json
{
  "age": 35.6,
  "progressed_date": "1990-06-19T10:30:00Z",
  "progressed_planets": {
    "sun": {
      "natal": 24.5,
      "progressed": 29.3,
      "zodiac_sign": "Gemini",
      "house": 2
    },
    "moon": {
      "natal": 135.2,
      "progressed": 278.9,
      "zodiac_sign": "Capricorn",
      "house": 9,
      "interpretation": "Период серьёзности, практичности"
    }
  },
  "progressed_aspects_to_natal": [
    {
      "progressed_planet": "Moon",
      "natal_planet": "Venus",
      "aspect": "conjunction",
      "interpretation": "Усиление эмоциональной чувствительности в любви"
    }
  ]
}
```

---

### 2.3 Солнечные Дуги (Solar Arc) ☀️

**Зачем нужно**:
- Точный метод предсказаний
- Важные события жизни
- Популярен среди профессиональных астрологов

**Формула**:
```
Solar Arc = Текущая позиция Солнца - Натальная позиция Солнца
Directed Planet = Natal Planet + Solar Arc
```

**API Endpoint**:
```
POST /api/v1/directions/solar-arc
{
  "birth_chart": {...},
  "current_date": "2026-01-01"
}
```

---

## 💑 ФАЗА 3: Синастрия (Неделя 4)

**Приоритет**: 🟡 СРЕДНИЙ
**Время**: 5-7 дней (20-25 часов)
**Стоимость**: $2,000-4,000

### 3.1 Межаспекты (Inter-aspects)

**Зачем нужно**:
- Анализ совместимости
- Понимание динамики отношений
- Выявление сильных/слабых сторон пары

**API Endpoint**:
```
POST /api/v1/synastry
{
  "person1": {
    "name": "Александр",
    "birth_date": "1990-05-15T10:30:00Z",
    "location": {"lat": 55.75, "lon": 37.62}
  },
  "person2": {
    "name": "Мария",
    "birth_date": "1992-08-22T14:15:00Z",
    "location": {"lat": 59.93, "lon": 30.31}
  }
}
```

**Пример ответа**:
```json
{
  "compatibility_score": 78,
  "synastry_aspects": [
    {
      "person1_planet": "Венера Александра",
      "person2_planet": "Марс Марии",
      "aspect": "trine",
      "orb": 2.3,
      "strength": "strong",
      "interpretation": "Сильное взаимное притяжение, страсть"
    },
    {
      "person1_planet": "Луна Александра",
      "person2_planet": "Луна Марии",
      "aspect": "square",
      "orb": 4.1,
      "strength": "moderate",
      "interpretation": "Разные эмоциональные потребности, нужна работа"
    }
  ],
  "element_balance": {
    "fire": 0.35,
    "earth": 0.25,
    "air": 0.20,
    "water": 0.20,
    "interpretation": "Активная, энергичная пара"
  },
  "house_overlays": [
    {
      "person2_planet": "Солнце Марии",
      "person1_house": 7,
      "interpretation": "Мария активизирует партнёрский дом Александра"
    }
  ],
  "strengths": [
    "Страсть и притяжение (Венера-Марс трин)",
    "Интеллектуальная связь (Меркурий-Меркурий секстиль)",
    "Общие цели (Юпитер-Солнце конъюнкция)"
  ],
  "challenges": [
    "Эмоциональные разногласия (Луна-Луна квадрат)",
    "Разные темпераменты (Марс-Сатурн оппозиция)"
  ],
  "recommendations": [
    "Работать над эмоциональным пониманием",
    "Использовать интеллектуальную связь для решения проблем",
    "Давать друг другу пространство при конфликтах"
  ]
}
```

---

### 3.2 Композитная Карта

**Формула**: Средние точки всех планет
```
Composite_Planet = (Person1_Planet + Person2_Planet) / 2
```

**API Endpoint**:
```
POST /api/v1/synastry/composite
```

---

### 3.3 Карта Дэвисона

**Формула**: Средняя точка времени и пространства
```
Davison_Date = (Date1 + Date2) / 2
Davison_Location = (Lat1+Lat2)/2, (Lon1+Lon2)/2
```

---

## ☄️ ФАЗА 4: Астероиды (Неделя 5)

**Приоритет**: 🟡 СРЕДНИЙ
**Время**: 5-7 дней (20-25 часов)

### 4.1 Основные Астероиды

**Список астероидов**:
1. **Церера (1)** - материнство, забота
2. **Паллада (2)** - мудрость, стратегия
3. **Юнона (3)** - партнёрство, верность
4. **Веста (4)** - преданность, фокус
5. **Хирон (2060)** - раны, исцеление
6. **Фолус (5145)** - катализатор изменений
7. **Нессус (7066)** - кармические долги

**API Endpoints**:
```
GET /api/v1/ephemeris/asteroids
GET /api/v1/ephemeris/asteroid/1        # Церера
GET /api/v1/ephemeris/asteroid/2        # Паллада
GET /api/v1/ephemeris/asteroid/custom?number=433  # Эрос
```

**Интерпретации по знакам**:
```python
CERES_INTERPRETATIONS = {
    'Aries': 'Забота через поощрение независимости',
    'Taurus': 'Забота через материальную поддержку',
    'Gemini': 'Забота через общение и обучение',
    # ...
}
```

---

## 🌈 ФАЗА 5: Гармонические Карты и Астрокартография (Недели 6-8)

### 5.1 Гармонические Карты 🎵

**Зачем нужно**:
- Выявление скрытых талантов
- Понимание глубинных паттернов
- Разные уровни сознания

**Основные гармоники**:
- H2 - отношения, партнёрство
- H3 - таланты, креативность
- H4 - структура, фундамент
- H5 - радость, удовольствие
- H7 - духовность, мистика
- H9 - мудрость, философия

**Формула**:
```
Harmonic_Longitude = (Natal_Longitude × Harmonic_Number) mod 360
```

**API Endpoint**:
```
POST /api/v1/charts/harmonic
{
  "birth_chart": {...},
  "harmonic": 3
}
```

---

### 5.2 Астрокартография 🗺️

**Зачем нужно**:
- Определение лучших мест для жизни
- Понимание влияния локаций
- Планирование переездов

**Типы линий**:
1. **ASC линии** - как вас воспринимают
2. **MC линии** - карьера, призвание
3. **DSC линии** - партнёрство
4. **IC линии** - дом, семья

**API Endpoints**:
```
POST /api/v1/astrocartography/lines
{
  "birth_chart": {...},
  "planet": "jupiter"  # или "all" для всех планет
}

GET /api/v1/astrocartography/location
{
  "birth_chart": {...},
  "location": {"lat": 40.71, "lon": -74.00}  # Нью-Йорк
}
```

**Пример ответа**:
```json
{
  "lines": [
    {
      "planet": "Jupiter",
      "line_type": "MC",
      "passes_through": [
        {"lat": 0, "lon": -74.5, "location": "Южная Америка"},
        {"lat": 40, "lon": -74.0, "location": "Нью-Йорк"},
        {"lat": 60, "lon": -73.5, "location": "Канада"}
      ],
      "interpretation": "Карьерный успех, признание, рост"
    }
  ],
  "location_analysis": {
    "latitude": 40.71,
    "longitude": -74.00,
    "location_name": "Нью-Йорк",
    "active_lines": [
      "Jupiter MC (0.5° orb)",
      "Venus DSC (2.1° orb)"
    ],
    "interpretation": "Отличное место для карьеры и партнёрства"
  }
}
```

---

## 📋 Детальный План Внедрения

### Неделя 1: Важнейшие Точки

**День 1-2: Лунные Узлы**
```bash
# Задачи
- [ ] Установить pyswisseph
- [ ] Создать LunarNodesCalculator
- [ ] Реализовать True Node и Mean Node
- [ ] Добавить интерпретации по знакам
- [ ] Создать API endpoint
- [ ] Написать тесты
- [ ] Обновить документацию
```

**День 3-4: Чёрная Луна**
```bash
- [ ] Реализовать Mean Lilith
- [ ] Реализовать True Lilith
- [ ] Добавить интерпретации
- [ ] Создать API endpoint
- [ ] Тесты и документация
```

**День 5: Арабские Части**
```bash
- [ ] Реализовать Part of Fortune
- [ ] Реализовать Part of Spirit
- [ ] Добавить другие части
- [ ] API endpoint
- [ ] Тесты
```

**День 6: Хирон**
```bash
- [ ] Интеграция Swiss Ephemeris для астероидов
- [ ] Расчёт Хирона
- [ ] Интерпретации
- [ ] API endpoint
```

**День 7: Финализация**
```bash
- [ ] Интеграционные тесты
- [ ] Проверка производительности
- [ ] Обновление документации
- [ ] Деплой на сервер
```

---

### Недели 2-3: Транзиты и Прогрессии

**Неделя 2**
```bash
Понедельник-Вторник: Текущие транзиты
- [ ] Алгоритм расчёта транзитов к натальной карте
- [ ] Определение орбов и силы аспектов
- [ ] API endpoint

Среда-Четверг: Поиск будущих транзитов
- [ ] Алгоритм поиска по датам
- [ ] Оптимизация для больших диапазонов
- [ ] API endpoint

Пятница: Тестирование
- [ ] Unit tests
- [ ] Integration tests
```

**Неделя 3**
```bash
Понедельник-Вторник: Вторичные прогрессии
- [ ] Расчёт прогрессивных планет
- [ ] Прогрессивная Луна (фазы)
- [ ] Аспекты к натальной карте

Среда: Солнечные дуги
- [ ] Расчёт Solar Arc
- [ ] Directed планеты
- [ ] Аспекты

Четверг: Соляры и лунары
- [ ] Solar Return карта
- [ ] Lunar Return карта

Пятница: Финализация
- [ ] Тесты
- [ ] Документация
- [ ] Деплой
```

---

### Неделя 4: Синастрия

```bash
Понедельник-Вторник: Межаспекты
- [ ] Расчёт аспектов Person1 → Person2
- [ ] Сетка аспектов
- [ ] Наложение домов

Среда: Композитная карта
- [ ] Расчёт средних точек
- [ ] Внутренние аспекты композита

Четверг: Скоринг совместимости
- [ ] Алгоритм оценки элементов
- [ ] Оценка аспектов
- [ ] Итоговый балл

Пятница: Тесты и деплой
```

---

### Неделя 5: Астероиды

```bash
Понедельник-Вторник: Основные астероиды
- [ ] Церера, Паллада, Юнона, Веста
- [ ] Интерпретации

Среда: Кентавры
- [ ] Хирон (уже есть из Фазы 1)
- [ ] Фолус, Нессус

Четверг: Custom asteroid endpoint
- [ ] Endpoint для любого астероида по номеру

Пятница: Тесты и деплой
```

---

### Недели 6-8: Продвинутые функции

```bash
Неделя 6: Гармоники
Неделя 7-8: Астрокартография
```

---

## 🛠️ Технические Требования

### Дополнительные библиотеки

```bash
# requirements_advanced.txt

# Swiss Ephemeris - для точных расчётов
pyswisseph==2.10.3.2

# Для астрокартографии
geopy==2.4.1
cartopy==0.22.0
matplotlib==3.8.0

# Для оптимизации
numba==0.58.1
```

### Обновление структуры проекта

```
app/core/ephemeris/
├── calculations/          # 🆕 НОВОЕ
│   ├── __init__.py
│   ├── nodes.py          # Лунные узлы
│   ├── lilith.py         # Чёрная Луна
│   ├── arabic_parts.py   # Арабские части
│   ├── asteroids.py      # Астероиды
│   ├── transits.py       # Транзиты
│   ├── progressions.py   # Прогрессии
│   ├── solar_arc.py      # Солнечные дуги
│   ├── synastry.py       # Синастрия
│   ├── harmonics.py      # Гармоники
│   └── astrocartography.py # Астрокартография
├── interpretations/       # 🆕 НОВОЕ
│   ├── __init__.py
│   ├── nodes_ru.py       # Интерпретации на русском
│   ├── lilith_ru.py
│   ├── synastry_ru.py
│   └── ...
└── types_advanced.py     # 🆕 Расширенные типы
```

---

## 💰 Стоимость и Сроки

### Полная реализация

| Фаза | Функции | Недели | Часы | @ $50/час | @ $100/час |
|------|---------|--------|------|-----------|------------|
| **Фаза 1** | Узлы, Лилит, Части | 1 | 20-25 | $1,000-1,250 | $2,000-2,500 |
| **Фаза 2** | Транзиты, Прогрессии | 2 | 40-50 | $2,000-2,500 | $4,000-5,000 |
| **Фаза 3** | Синастрия | 1 | 20-25 | $1,000-1,250 | $2,000-2,500 |
| **Фаза 4** | Астероиды | 1 | 20-25 | $1,000-1,250 | $2,000-2,500 |
| **Фаза 5** | Гармоники, Астро | 3 | 60-80 | $3,000-4,000 | $6,000-8,000 |
| **ИТОГО** | Все функции | **8** | **160-205** | **$8,000-10,250** | **$16,000-20,500** |

---

## ✅ Критерии Успеха

### Фаза 1
- ✅ Все 4 точки рассчитываются корректно
- ✅ Интерпретации на русском языке
- ✅ Время отклика <50ms
- ✅ Тесты покрывают 90%+ кода

### Фаза 2
- ✅ Транзиты находятся точно
- ✅ Прогрессии совпадают с профессиональными программами
- ✅ Запросы с большими диапазонами дат оптимизированы

### Фаза 3
- ✅ Синастрия рассчитывается полностью
- ✅ Скоринг совместимости валидирован
- ✅ Интерпретации полезны и точны

### Фазы 4-5
- ✅ Все астероиды доступны
- ✅ Гармонические карты работают
- ✅ Астрокартография визуализируется

---

## 🚀 Рекомендованная Стратегия

### Вариант А: MVP (1 неделя)
**Стоимость**: $2,000-4,000
**Функции**: Только Фаза 1
**Для кого**: Быстрая валидация рынка

### Вариант Б: Профессиональный (4 недели)
**Стоимость**: $6,000-12,000
**Функции**: Фазы 1-3
**Для кого**: Профессиональные астрологи

### Вариант В: Полная Платформа (8 недель)
**Стоимость**: $16,000-20,500
**Функции**: Все фазы
**Для кого**: Максимальный функционал

---

## 📚 Дополнительные Ресурсы

### Литература для валидации
- Swiss Ephemeris Documentation
- Astrodienst (astro.com) - для проверки расчётов
- "The Only Way to Learn Astrology" - Marion March
- "Planets in Transit" - Robert Hand

### Источники интерпретаций
- Авессалом Подводный
- Сергей Вронский
- Павел Глоба
- Современная западная астрология

---

## ⏭️ Следующие Шаги

**Рекомендую начать с Фазы 1**:

1. ✅ Завершить базовый деплой
2. ✅ Установить Swiss Ephemeris
3. ⏳ Реализовать лунные узлы (День 1-2)
4. ⏳ Реализовать Лилит (День 3-4)
5. ⏳ Реализовать арабские части (День 5)
6. ⏳ Тестирование и деплой (День 6-7)

**Готовы начать? Выберите стратегию и начнём! 🌟**
