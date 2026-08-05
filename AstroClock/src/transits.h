#pragma once
// Натальная карта и транзиты к ней.
//
// Натальные долготы считаются один раз при старте из build-флагов, дальше
// живут в памяти: двенадцать точек по восемь байт, меньше сотни байт всего.

#include <stdint.h>

#include "config.h"
#include "ephemeris.h"

namespace transit {

enum AspectKind { CONJUNCTION = 0, SEXTILE, SQUARE, TRINE, OPPOSITION, ASPECT_KINDS };

struct AspectDef { double angle; double orb; };

// Орбисы транзитные, то есть заметно уже натальных. Мажорные аспекты только:
// на 240 пикселях минорные превращаются в кашу из линий.
inline const AspectDef* aspectDefs() {
  static const AspectDef A[ASPECT_KINDS] = {
    {  0.0, 2.0},   // соединение
    { 60.0, 1.0},   // секстиль
    { 90.0, 1.5},   // квадрат
    {120.0, 1.5},   // трин
    {180.0, 2.0},   // оппозиция
  };
  return A;
}

// Натальные точки: десять тел плюс асцендент и середина неба.
enum { NATAL_ASC = ephem::BODY_COUNT, NATAL_MC, NATAL_POINTS };

struct NatalChart {
  double lon[NATAL_POINTS];
  double cusp[12];  // куспиды по Плацидусу, аспекты к ним не ищутся
  double jd;

  void compute(double natalJD, double lat, double lonEast) {
    jd = natalJD;
    for (int b = 0; b < ephem::BODY_COUNT; b++)
      lon[b] = ephem::longitude((ephem::Body)b, natalJD);
    ephem::houseCusps(natalJD, lat, lonEast, cusp);
    // Первый и десятый куспиды это и есть асцендент с серединой неба
    lon[NATAL_ASC] = cusp[0];
    lon[NATAL_MC] = cusp[9];
  }
};

struct Hit {
  uint8_t transiting;  // индекс ephem::Body
  uint8_t natalPoint;  // индекс в NatalChart::lon
  uint8_t kind;        // AspectKind
  float orb;           // отклонение от точного, градусы, всегда >= 0
  bool applying;       // сходится (true) или расходится
};

// Ищет активные транзиты. Возвращает число найденных, результат отсортирован
// по орбису: самый точный первым.
inline int find(const NatalChart& natal, double jd, Hit* out, int maxOut) {
  const AspectDef* A = aspectDefs();
  int n = 0;

  for (int b = 0; b < ephem::BODY_COUNT; b++) {
    double tLon = ephem::longitude((ephem::Body)b, jd);
    double spd = ephem::speed((ephem::Body)b, jd);

    for (int p = 0; p < NATAL_POINTS; p++) {
      // Разность знаковая: по модулю нельзя, иначе для соединения и оппозиции
      // теряется направление, а вместе с ним и схождение аспекта
      double rel = ephem::angleDiff(tLon, natal.lon[p]);
      bool matched = false;

      for (int k = 0; k < ASPECT_KINDS && !matched; k++) {
        for (int s = 0; s < 2; s++) {
          // Соединение и оппозиция симметричны, второй знак их дублирует
          if (s == 1 && (A[k].angle == 0.0 || A[k].angle == 180.0)) continue;
          double target = (s == 0) ? A[k].angle : -A[k].angle;
          double dev = ephem::angleDiff(rel, target);
          double devAbs = dev < 0 ? -dev : dev;
          if (devAbs > A[k].orb) continue;

          if (n < maxOut) {
            Hit& h = out[n++];
            h.transiting = (uint8_t)b;
            h.natalPoint = (uint8_t)p;
            h.kind = (uint8_t)k;
            h.orb = (float)devAbs;
            // Натальная точка неподвижна, поэтому отклонение меняется со
            // скоростью транзитного тела. Аспект сходится, когда отклонение
            // и скорость смотрят в разные стороны. Сравнивать орбис с орбисом
            // через шаг нельзя: за шаг тело перепрыгивает точный аспект
            h.applying = (dev * spd) < 0.0;
          }
          matched = true;
          break;
        }
      }
    }
  }

  // Вставками: элементов десятки, сортировка сложнее тут не окупается
  for (int i = 1; i < n; i++) {
    Hit key = out[i];
    int j = i - 1;
    while (j >= 0 && out[j].orb > key.orb) { out[j + 1] = out[j]; j--; }
    out[j + 1] = key;
  }
  return n;
}

// Цвет аспекта в RGB565. Гармоничные синие, напряжённые красные.
inline uint16_t aspectColor(uint8_t kind) {
  switch (kind) {
    case CONJUNCTION: return 0x07FF;  // голубой
    case SEXTILE:     return 0x04FF;
    case TRINE:       return 0x02DF;
    case SQUARE:      return 0xF800;  // красный
    case OPPOSITION:  return 0xFB00;
    default:          return 0xFFFF;
  }
}

// Луна без курса: до выхода из знака не образует ни одного мажорного аспекта
// с планетами. Раньше этот флаг приходил с сервера, теперь считается на месте.
// Ошибка порта по Луне 0.015° даёт по времени около двух минут, чего для
// границы периода достаточно.
inline bool moonIsVoid(double jd) {
  double lon = ephem::longitude(ephem::MOON, jd);
  int sign = (int)(lon / 30.0);
  double egressLon = (sign + 1) * 30.0;

  // Луна проходит знак чуть меньше чем за 2.5 суток, шаг в полчаса ловит
  // прохождение точного аспекта без пропусков: относительная скорость не
  // превышает 15°/сутки, то есть 0.31° за шаг
  const double STEP = 1.0 / 48.0;
  const AspectDef* A = aspectDefs();

  // Аспект ищется по знаковой разности: угол между телами минус угол аспекта,
  // отдельно для опережения и отставания. Брать модуль разности нельзя —
  // для соединения он неотрицателен, для оппозиции неположителен, и смена
  // знака там не наступает никогда.
  const int SLOTS = ASPECT_KINDS * 2;
  double prevDev[ephem::BODY_COUNT][SLOTS];
  bool havePrev = false;

  for (double t = jd; t < jd + 3.0; t += STEP) {
    double mLon = ephem::longitude(ephem::MOON, t);
    if (t > jd && ephem::angleDiff(mLon, egressLon) >= 0.0) return true;

    for (int b = ephem::SUN; b < ephem::BODY_COUNT; b++) {
      if (b == ephem::MOON) continue;
      double rel = ephem::angleDiff(mLon, ephem::longitude((ephem::Body)b, t));

      for (int k = 0; k < ASPECT_KINDS; k++) {
        for (int s = 0; s < 2; s++) {
          double target = (s == 0) ? A[k].angle : -A[k].angle;
          // Соединение и оппозиция симметричны, второй знак их дублирует
          if (s == 1 && (A[k].angle == 0.0 || A[k].angle == 180.0)) {
            prevDev[b][k * 2 + s] = 0.0;
            continue;
          }
          double dev = ephem::angleDiff(rel, target);
          int slot = k * 2 + s;
          if (havePrev) {
            double p = prevDev[b][slot];
            bool crossed = (p < 0 && dev >= 0) || (p > 0 && dev <= 0);
            // Отсечка по величине отбрасывает переход через ±180°, который
            // тоже меняет знак, но точным аспектом не является
            if (crossed && p < 6.0 && p > -6.0 && dev < 6.0 && dev > -6.0)
              return false;
          }
          prevDev[b][slot] = dev;
        }
      }
    }
    havePrev = true;
  }
  return false;
}

inline const char* aspectGlyph(uint8_t kind) {
  switch (kind) {
    case CONJUNCTION: return "o";
    case SEXTILE:     return "*";
    case SQUARE:      return "[]";
    case TRINE:       return "/\\";
    case OPPOSITION:  return "oo";
    default:          return "?";
  }
}

}  // namespace transit
