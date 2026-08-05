#pragma once
// Разведение наложившихся глифов на кольце.
//
// Тела рисуются растром 13x13 по своей долготе, и при сближении глифы налезают
// друг на друга. Порядок отрисовки жёсткий, от Солнца к Плутону, поэтому
// младшее тело всегда оказывалось сверху: соединение Луны с Плутоном выглядело
// как одинокий Плутон, и о втором теле догадаться было нельзя.
//
// Здесь наложившиеся тела собираются в группу, и внутри группы каждое по
// очереди выходит наверх. Подмена размазана по времени: уходящее гаснет,
// приходящее разгорается, иначе на глаз это читается как рывок или мерцание.

#include <math.h>
#include <stdint.h>

namespace collide {

constexpr int MAX_OBJECTS = 12;
constexpr uint8_t NONE = 0xFF;

// Сколько глиф должен налезть на соседа, чтобы считаться перекрытием: четверть
// меньшего из них. Глифы одного размера, поэтому порог по расстоянию между
// центрами — три четверти ширины глифа.
inline float overlapLimit(float glyphPx) { return glyphPx * 0.75f; }

struct Groups {
  uint8_t of[MAX_OBJECTS];    // номер группы объекта, NONE если одиночка
  uint8_t slot[MAX_OBJECTS];  // позиция объекта внутри своей группы
  uint8_t size[MAX_OBJECTS];  // размер группы, индексируется номером группы
  uint8_t count;              // сколько групп нашлось
  bool any;                   // есть ли хоть одно перекрытие
};

// Кластеризация по экранному расстоянию вдоль кольца. Тел не больше двенадцати,
// поэтому перебор пар дешевле любой сортировки.
inline void build(const float* lonDeg, int n, float radiusPx, float glyphPx,
                  Groups* g) {
  if (n > MAX_OBJECTS) n = MAX_OBJECTS;
  const float lim = overlapLimit(glyphPx);

  int parent[MAX_OBJECTS];
  for (int i = 0; i < n; i++) parent[i] = i;
  // Поиск корня без сжатия путей: глубина на дюжине объектов не растёт
  auto find = [&](int x) {
    while (parent[x] != x) x = parent[x];
    return x;
  };

  for (int i = 0; i < n; i++) {
    for (int j = i + 1; j < n; j++) {
      float d = fabsf(lonDeg[i] - lonDeg[j]);
      if (d > 180.0f) d = 360.0f - d;
      // Хорда между точками кольца, а не длина дуги: глифы плоские
      float chord = 2.0f * radiusPx * sinf(d * 0.00872664626f);  // d/2 в радианах
      if (chord < lim) {
        int a = find(i), b = find(j);
        if (a != b) parent[a] = b;
      }
    }
  }

  for (int i = 0; i < MAX_OBJECTS; i++) {
    g->of[i] = NONE;
    g->slot[i] = 0;
    g->size[i] = 0;
  }
  g->count = 0;
  g->any = false;

  // Корню группы номер выдаётся при первой встрече, дальше по нему считаются
  // размер и позиции
  int label[MAX_OBJECTS];
  for (int i = 0; i < MAX_OBJECTS; i++) label[i] = -1;
  for (int i = 0; i < n; i++) {
    int root = find(i);
    if (label[root] < 0) {
      label[root] = g->count;
      g->count++;
    }
    uint8_t grp = (uint8_t)label[root];
    g->of[i] = grp;
    g->slot[i] = g->size[grp];
    g->size[grp]++;
  }

  // Группы из одного объекта разводить не нужно
  for (int i = 0; i < n; i++) {
    if (g->size[g->of[i]] < 2)
      g->of[i] = NONE;
    else
      g->any = true;
  }
}

// Яркость объекта в момент ms: 1.0 пока он наверху, low пока ждёт очереди,
// между ними плавный переход. slotMs — сколько один объект держится наверху.
inline float level(const Groups& g, int i, unsigned long ms,
                   unsigned long slotMs, float low) {
  uint8_t grp = g.of[i];
  if (grp == NONE) return 1.0f;

  int k = g.size[grp];
  float p = (float)(ms % (slotMs * (unsigned long)k)) / (float)slotMs;
  int cur = (int)p;
  float frac = p - (float)cur;

  // Переход занимает последнюю четверть слота
  const float FADE = 0.75f;
  int me = g.slot[i];
  if (me == cur) {
    if (frac < FADE) return 1.0f;
    return 1.0f - (frac - FADE) / (1.0f - FADE) * (1.0f - low);
  }
  if (me == (cur + 1) % k && frac >= FADE)
    return low + (frac - FADE) / (1.0f - FADE) * (1.0f - low);
  return low;
}

// Сейчас ли объект наверху: по нему решается, рисовать ли отметку аспекта
inline bool onTop(const Groups& g, int i, unsigned long ms,
                  unsigned long slotMs) {
  uint8_t grp = g.of[i];
  if (grp == NONE) return true;
  int k = g.size[grp];
  float p = (float)(ms % (slotMs * (unsigned long)k)) / (float)slotMs;
  return g.slot[i] == (int)p;
}

}  // namespace collide
