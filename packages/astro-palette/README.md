# astro-palette

Автономный движок планетарно-часовой OKLCH-палитры. Из `Date` и координат
считает: видимые долготы планет (эфемериды Meeus), халдейские планетарные часы,
OKLCH-палитру (8 ролей), фазу Луны и void-of-course. Без сети, без зависимостей,
чистый ESM.

Источник правды для палитры, общей у нескольких приложений (Firefox-расширение
новой вкладки, portfolio-site, mlops-tutor).

## Установка

```bash
npm install astro-palette        # или git-зависимость / npm link
```

Расширения без сборки могут вендорить `src/` напрямую — это валидный ESM,
работает в браузере как есть.

## Использование

```js
import { computeState, coordsForTimezone } from 'astro-palette';

const [lat, lon] = coordsForTimezone();              // по Intl-таймзоне, фолбэк Москва
const mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const st = computeState(new Date(), lat, lon, { mode });
// st.palette → { '--color-bg': 'oklch(...)', ... } ×8
for (const [k, v] of Object.entries(st.palette)) {
  document.documentElement.style.setProperty(k, v);
}

st.hour.ruler;     // управитель часа → гонит accent-hue
st.hour.dayRuler;  // управитель дня  → база палитры
st.moon;           // { illumination, name, emoji, waxing, moonLong, angle }
st.voc;            // null | текущий/ближайший void-of-course
```

### Две hue-конвенции

```js
computeState(date, lat, lon, { hueSource: 'geocentric' }); // по умолчанию: реальная
// долгота, палитра уникальна каждый день (mlops-tutor / расширение)

computeState(date, lat, lon, { hueSource: 'fixed' });      // таблица PLANET_HUES,
// повтор по неделе (portfolio-site)
```

## API

| Экспорт | Описание |
|---|---|
| `computeState(date, lat, lon, opts?)` | Полное состояние: `{ palette, hour, moon, voc, dayHue, hourHue, mode, jd }` |
| `coordsForTimezone(tz?)` | `[lat, lon]` по IANA-таймзоне, фолбэк Москва |
| `computePalette(dayHue, hourHue, mode)` | Только палитра по готовым hue |
| `getPlanetaryHour(date, lat, lon)` | Текущий планетарный час |
| `moonPhaseInfo(jd)` | Фаза Луны |
| `findVoC(date)` | Void-of-course Луны |
| `planetEclipticLongitude(name, jd)`, `sunLongitude`, `moonLongitude`, `toJulianDate` | Эфемериды |
| `PLANET_GLYPHS`, `PLANET_NAMES_RU`, `ZODIAC_RU`, `WEEKDAY_RU`, `PLANET_HUES`, `TZ_COORDS` | Справочники |

DOM/фреймворк наружу не утекают: `computeState` берёт `mode` параметром, рендер
и реакция на смену OS-темы — на стороне приложения.

## Точность

Усечённые ряды (Meeus, гл. 25/47): долготы ~0.1–0.3°, время аспекта VoC ±~15 мин.
Достаточно для выбора hue и фазы; не для эфемеридных таблиц или электив-астрологии.

## Сборка типов

```bash
npm run build   # tsc → dist/*.d.ts из JSDoc
npm test        # node test/smoke.js
```

## Лицензия

MIT
