#pragma once
// Живая палитра: цвета интерфейса выводятся из положения светил, а не пишутся
// руками. Порт packages/astro-palette на устройство.
//
// Схема библиотеки: hue фона, текста и рамки приходит от управителя дня, hue
// акцента — от управителя планетарного часа. Источник hue геоцентрический
// (hueSource по умолчанию), то есть это прямо эклиптическая долгота планеты.
// Аспекты между семью классическими планетами подмешивают насыщенность
// (гармоничные) и контраст фона (напряжённые).
//
// От библиотеки отличается одним: восход и закат берутся от настоящего Солнца
// из ephemeris.h, а не от приближения Спенсера. Расхождение около минуты, и
// заметно оно только у самой границы планетарного часа.

#include <math.h>
#include <stdint.h>
#include <time.h>

#include "ephemeris.h"

namespace palette {

// --- OKLCH в RGB565 --------------------------------------------------------

// L приходит долей единицы, C в единицах OKLCH, hue в градусах.
inline uint16_t oklch(float L, float C, float hueDeg) {
  float h = hueDeg * 0.01745329252f;
  float a = C * cosf(h), b = C * sinf(h);

  float l_ = L + 0.3963377774f * a + 0.2158037573f * b;
  float m_ = L - 0.1055613458f * a - 0.0638541728f * b;
  float s_ = L - 0.0894841775f * a - 1.2914855480f * b;
  float l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;

  float lr = 4.0767416621f * l - 3.3077115913f * m + 0.2309699292f * s;
  float lg = -1.2684380046f * l + 2.6097574011f * m - 0.3413193965f * s;
  float lb = -0.0041960863f * l - 0.7034186147f * m + 1.7076147010f * s;

  // Гамма sRGB плюс обрезание по гамуту: OKLCH умеет уезжать за пределы
  // отображаемого, и тогда компонента просто прижимается к краю
  auto enc = [](float c) -> uint32_t {
    if (c <= 0.0f) return 0;
    if (c >= 1.0f) return 255;
    float v = (c <= 0.0031308f) ? 12.92f * c
                                : 1.055f * powf(c, 1.0f / 2.4f) - 0.055f;
    if (v < 0.0f) v = 0.0f;
    if (v > 1.0f) v = 1.0f;
    return (uint32_t)(v * 255.0f + 0.5f);
  };

  uint32_t R = enc(lr), G = enc(lg), B = enc(lb);
  return (uint16_t)(((R & 0xF8) << 8) | ((G & 0xFC) << 3) | (B >> 3));
}

// --- планетарные часы ------------------------------------------------------

// Халдейский ряд, от медленных к быстрым.
inline const int* chaldean() {
  static const int C[7] = {ephem::SATURN, ephem::JUPITER, ephem::MARS,
                           ephem::SUN,    ephem::VENUS,   ephem::MERCURY,
                           ephem::MOON};
  return C;
}

// День недели (0 — воскресенье) в управителя дня.
inline int weekdayRuler(int wday) {
  static const int R[7] = {ephem::SUN,     ephem::MOON,   ephem::MARS,
                           ephem::MERCURY, ephem::JUPITER, ephem::VENUS,
                           ephem::SATURN};
  return R[wday % 7];
}

struct Hour {
  int dayRuler;
  int ruler;
  int index;  // 0..23 от восхода
};

inline int weekdayOf(double jd) {
  time_t t = (time_t)((jd - 2440587.5) * 86400.0);
  struct tm tmv;
  localtime_r(&t, &tmv);
  return tmv.tm_wday;
}

// Астрологические сутки начинаются с восхода, а не с полуночи: двенадцать
// неравных дневных часов от восхода до заката, затем двенадцать ночных до
// следующего восхода. Первым дневным часом правит управитель дня недели,
// дальше идёт халдейский ряд по кругу.
inline Hour planetaryHour(double jd, double lat, double lonEast) {
  double tr = ephem::solarTransit(jd, lonEast);
  double rise, set, nextRise;

  if (!ephem::solarRiseSet(tr, lat, lonEast, &rise, &set)) {
    // Полярный день или ночь: делить нечего, сетка становится равномерной
    rise = tr - 0.5;
    set = tr;
    nextRise = tr + 0.5;
  } else if (jd < rise) {
    // До восхода идут ещё вчерашние сутки
    nextRise = rise;
    double trPrev = ephem::solarTransit(tr - 1.0, lonEast);
    if (!ephem::solarRiseSet(trPrev, lat, lonEast, &rise, &set)) {
      rise = trPrev - 0.5;
      set = trPrev;
    }
  } else {
    double trNext = ephem::solarTransit(tr + 1.0, lonEast);
    double dummy;
    if (!ephem::solarRiseSet(trNext, lat, lonEast, &nextRise, &dummy))
      nextRise = set + 0.5;
  }

  int idx;
  if (jd < set) {
    double len = (set - rise) / 12.0;
    idx = (int)floor((jd - rise) / len);
  } else {
    double len = (nextRise - set) / 12.0;
    idx = 12 + (int)floor((jd - set) / len);
  }
  if (idx < 0) idx = 0;
  if (idx > 23) idx = 23;

  Hour h;
  h.index = idx;
  h.dayRuler = weekdayRuler(weekdayOf(rise));
  const int* C = chaldean();
  int start = 0;
  for (int i = 0; i < 7; i++)
    if (C[i] == h.dayRuler) start = i;
  h.ruler = C[(start + idx) % 7];
  return h;
}

// --- модуляция от аспектов -------------------------------------------------

struct Modulation {
  float chromaBoost;     // насыщеннее акцент
  float lightnessBoost;  // фон дальше от текста
};

// Аспекты между семью классическими планетами, орб 5°. Вес обратен орбису:
// точный аспект тянет сильнее. Потолки те же, что в библиотеке, иначе цвет
// уезжает за гамут.
inline Modulation aspectModulation(double jd) {
  static const int P[7] = {ephem::SUN,  ephem::MOON,    ephem::MERCURY,
                           ephem::VENUS, ephem::MARS,   ephem::JUPITER,
                           ephem::SATURN};
  static const double ANG[5] = {0.0, 60.0, 90.0, 120.0, 180.0};
  static const int HARM[5] = {1, 1, -1, 1, -1};
  const double ORB = 5.0;

  double lon[7];
  for (int i = 0; i < 7; i++)
    lon[i] = ephem::longitude((ephem::Body)P[i], jd);

  float cb = 0.0f, lb = 0.0f;
  for (int i = 0; i < 7; i++) {
    for (int j = i + 1; j < 7; j++) {
      double d = lon[i] - lon[j];
      d = ephem::norm360(d);
      if (d > 180.0) d = 360.0 - d;

      int best = -1;
      double bestDist = 1e9;
      for (int k = 0; k < 5; k++) {
        double dist = d - ANG[k];
        if (dist < 0) dist = -dist;
        if (dist <= ORB && dist < bestDist) {
          bestDist = dist;
          best = k;
        }
      }
      if (best < 0) continue;

      float tight = (float)(1.0 - bestDist / ORB);
      if (HARM[best] > 0)
        cb += 0.012f * tight;
      else
        lb += 1.2f * tight;
    }
  }
  if (cb > 0.04f) cb = 0.04f;
  if (lb > 3.0f) lb = 3.0f;
  return {cb, lb};
}

// --- сборка ----------------------------------------------------------------

// Роли из PALETTE_SPEC.dark библиотеки. Светлая схема на просвет не нужна.
struct Live {
  uint16_t bg, surface, text, muted, accent, border;
  // Цвета аспектов. Hue закреплён по смыслу: гармоничные в синеву, напряжённые
  // в красноту, иначе от долготы это различие стёрлось бы. Светлота и хрома
  // идут от общей модуляции, поэтому линии живут в одной гамме с остальным.
  uint16_t aspect[5];
  // Предупреждение и согласие. Раньше на экранах стояли константы 0xFD20 и
  // 0xF9E7, которые не двигались вместе с палитрой и в иные часы спорили с
  // фоном. Hue у них закреплён (оранжевый и зелёный), потому что смысл важнее
  // позиции на эклиптике, но светлота и хрома идут от той же модуляции.
  uint16_t warn, good;
  uint16_t sign[12];
  uint16_t body[ephem::BODY_COUNT];
  int dayRuler, hourRuler, hourIndex;
  float chromaBoost, lightnessBoost;
};

// Цвет позиционной сущности: hue равен её долготе. По этому же правилу
// библиотека берёт hue управителя дня и часа.
inline uint16_t positional(double lonDeg, float L, float C) {
  return oklch(L, C, (float)ephem::norm360(lonDeg));
}

inline void compute(double jd, double lat, double lonEast, Live* out) {
  Hour h = planetaryHour(jd, lat, lonEast);
  Modulation m = aspectModulation(jd);

  float dayHue = (float)ephem::longitude((ephem::Body)h.dayRuler, jd);
  float hourHue = (float)ephem::longitude((ephem::Body)h.ruler, jd);
  float cb = m.chromaBoost, lb = m.lightnessBoost;

  // В тёмной схеме напряжённые аспекты уводят фон и рамку вниз, дальше от
  // текста: контраст жёстче
  out->bg = oklch((14.0f - lb) / 100.0f, 0.012f, dayHue);
  out->surface = oklch(0.19f, 0.018f, dayHue);
  out->text = oklch(0.92f, 0.005f, dayHue);
  out->muted = oklch(0.68f, 0.020f, dayHue);
  out->accent = oklch(0.75f, 0.140f + cb, hourHue);
  out->border = oklch((30.0f - lb) / 100.0f, 0.018f, dayHue);
  out->warn = oklch(0.72f, 0.160f + cb, 55.0f);
  // порядок как в transit::AspectKind
  out->aspect[0] = oklch(0.80f, 0.120f + cb, 215.0f);  // соединение
  out->aspect[1] = oklch(0.76f, 0.115f + cb, 240.0f);  // секстиль
  out->aspect[2] = oklch(0.65f, 0.185f + cb, 25.0f);   // квадрат
  out->aspect[3] = oklch(0.76f, 0.115f + cb, 260.0f);  // трин
  out->aspect[4] = oklch(0.68f, 0.175f + cb, 40.0f);   // оппозиция
  out->good = oklch(0.74f, 0.130f + cb, 145.0f);

  // Всё, у чего есть место на эклиптике, красится своей долготой: знак —
  // серединой сектора, тело — тем градусом, где оно стоит
  for (int i = 0; i < 12; i++)
    out->sign[i] = oklch(0.75f, 0.140f + cb, i * 30.0f + 15.0f);
  for (int b = 0; b < ephem::BODY_COUNT; b++)
    out->body[b] = positional(ephem::longitude((ephem::Body)b, jd), 0.75f,
                              0.140f + cb);

  out->dayRuler = h.dayRuler;
  out->hourRuler = h.ruler;
  out->hourIndex = h.index;
  out->chromaBoost = cb;
  out->lightnessBoost = lb;
}

}  // namespace palette
