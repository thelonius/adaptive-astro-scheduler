#pragma once
// Периферия на I2C AMOLED-платы: тач FT3168 и часы реального времени PCF8563.
// Драйверы LilyGO (Arduino_DriveBus) ради двух регистров тянуть незачем.

#include "board.h"

#if defined(BOARD_HAS_TOUCH) || defined(BOARD_HAS_RTC)
#include <Wire.h>
#include <time.h>

namespace periph {

// Скан шины в лог: по нему видно, какие чипы на плате вообще отвечают
inline void begin() {
  Wire.begin(board::I2C_SDA, board::I2C_SCL, 400000);
  Serial.print("I2C:");
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) Serial.printf(" 0x%02X", a);
  }
  Serial.println();
}

inline bool readRegs(uint8_t addr, uint8_t reg, uint8_t* buf, size_t n) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(addr, (uint8_t)n) != n) return false;
  for (size_t i = 0; i < n; i++) buf[i] = Wire.read();
  return true;
}

inline bool writeRegs(uint8_t addr, uint8_t reg, const uint8_t* buf, size_t n) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(buf, n);
  return Wire.endTransmission() == 0;
}

// --- FT3168 ---------------------------------------------------------------
// Тач отдаёт координаты первой точки, жест распознаётся в gesture.h.
//
// Шина трогается только когда чип сам сообщил о касании через INT или палец
// уже лежит: между касаниями FT3168 не отвечает, и опрос вслепую сыпал бы
// ошибками в лог. INT ловится прерыванием, а не опросом уровня. Чип дёргает
// линию коротким импульсом, а loop() бывает занят отрисовкой по 150 мс, и
// опрос уровня пропускал импульсы: касание доходило с задержкой в полторы
// секунды, пока не совпадёт очередной
namespace touch {
constexpr uint8_t ADDR = 0x38;

// static, а не inline: inline-функция в IRAM не линкуется на Xtensa
// (literal placed after use). Заголовок подключается один раз, из main.cpp
static volatile bool irq = false;
static void IRAM_ATTR onInt() { irq = true; }

inline void begin() {
  pinMode(board::TP_INT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(board::TP_INT), onInt, FALLING);
}

// Автопереход в режим мониторинга (0x86) выключается, как только чип впервые
// ответил: до этого он спит, и запись ушла бы в пустоту. В мониторинге он
// сканирует редко и первое касание замечает с опозданием, а экономить ему
// нечего, часы стоят на зарядке
inline void keepAwake() {
  static bool done = false;
  if (done) return;
  // 0x86 = 0 выключает автопереход в мониторинг, 0xA5 = 0 держит активный
  // режим питания
  uint8_t off = 0;
  done = writeRegs(ADDR, 0x86, &off, 1) && writeRegs(ADDR, 0xA5, &off, 1);
#ifdef TOUCH_DEBUG
  uint8_t r86 = 0xFF, r87 = 0xFF, rA5 = 0xFF;
  readRegs(ADDR, 0x86, &r86, 1);
  readRegs(ADDR, 0x87, &r87, 1);
  readRegs(ADDR, 0xA5, &rA5, 1);
  Serial.printf("тач: запись %s, 0x86=%u 0x87=%u 0xA5=%u\n", done ? "ок" : "НЕ ПРОШЛА",
                r86, r87, rA5);
#endif
}

struct Point {
  bool down;
  int x, y;
};

// Сколько INT может молчать, пока палец считается лежащим. Касание чип
// обновляет импульсами каждые 10-20 мс, а после отпускания ещё около двух
// секунд отдаёт последнюю точку как живую, пока не уснёт. По числу касаний
// отпускание поэтому замечалось с той же задержкой, и свайп срабатывал
// через пару секунд после того, как палец уже ушёл
constexpr unsigned long RELEASE_MS = 80;

inline Point read() {
  static Point last = {false, 0, 0};
  static unsigned long activeAt = 0;
  // Импульс мог прийти, пока loop() рисовал кадр: флаг прерывания его
  // помнит. Низкий уровень означает режим, где INT держится всё касание
  bool active = irq || digitalRead(board::TP_INT) == LOW;
  irq = false;
  unsigned long now = millis();
  if (active) activeAt = now;
  if (!last.down && !active) return last;
  if (last.down && !active) {
    if (now - activeAt > RELEASE_MS) last.down = false;
    return last;
  }
  // 0x02 число касаний в младшем полубайте, дальше X и Y первой точки по
  // 12 бит, старшие биты X несут событие точки: 01 это «палец поднят»
  uint8_t r[5];
  if (!readRegs(ADDR, 0x02, r, 5)) {
    last.down = false;
    return last;
  }
  keepAwake();
  uint8_t n = r[0] & 0x0F;
  uint8_t event = r[1] >> 6;
  last.down = n > 0 && n < 3 && event != 1;
  // Координаты берутся и из события отпускания: пока loop() рисует кадр,
  // промежуточные точки пропадают, и без последней свайп читался как тап
  if (last.down || event == 1) {
    last.x = ((r[1] & 0x0F) << 8) | r[2];
    last.y = ((r[3] & 0x0F) << 8) | r[4];
  }
#ifdef TOUCH_DEBUG
  Serial.printf("[%lu] тач-рег n=%u ev=%u x=%d y=%d\n", now, n, event,
                ((r[1] & 0x0F) << 8) | r[2], ((r[3] & 0x0F) << 8) | r[4]);
#endif
  return last;
}
}  // namespace touch

// --- PCF8563 --------------------------------------------------------------
// Время в RTC хранится в UTC: пояс задаётся в прошивке, и летнее время не
// должно переписывать часы на плате.
namespace rtc {
constexpr uint8_t ADDR = 0x51;

inline uint8_t bcd2bin(uint8_t v) { return (v >> 4) * 10 + (v & 0x0F); }
inline uint8_t bin2bcd(uint8_t v) { return ((v / 10) << 4) | (v % 10); }

// Дни от 1970-01-01 по гражданскому календарю. timegm() в newlib есть не
// везде, а mktime() смотрит на TZ, который к этому моменту уже выставлен
inline long daysFromCivil(int y, unsigned m, unsigned d) {
  y -= m <= 2;
  const int era = (y >= 0 ? y : y - 399) / 400;
  const unsigned yoe = (unsigned)(y - era * 400);
  const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097L + (long)doe - 719468L;
}

// 0, если RTC не отвечает или сам признаёт время недостоверным: бит VL в
// регистре секунд ставится, когда питание часов проседало
inline time_t read() {
  uint8_t r[7];
  if (!readRegs(ADDR, 0x02, r, 7)) return 0;
  if (r[0] & 0x80) return 0;
  int sec = bcd2bin(r[0] & 0x7F), min = bcd2bin(r[1] & 0x7F),
      hour = bcd2bin(r[2] & 0x3F), day = bcd2bin(r[3] & 0x3F),
      mon = bcd2bin(r[5] & 0x1F), year = 2000 + bcd2bin(r[6]);
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return 0;
  return (time_t)(daysFromCivil(year, mon, day) * 86400L + hour * 3600L +
                  min * 60L + sec);
}

inline bool write(time_t t) {
  struct tm u;
  gmtime_r(&t, &u);
  if (u.tm_year < 100) return false;
  uint8_t r[7] = {bin2bcd(u.tm_sec), bin2bcd(u.tm_min), bin2bcd(u.tm_hour),
                  bin2bcd(u.tm_mday), (uint8_t)u.tm_wday,
                  bin2bcd(u.tm_mon + 1), bin2bcd(u.tm_year - 100)};
  return writeRegs(ADDR, 0x02, r, 7);
}
}  // namespace rtc

}  // namespace periph
#endif
