#pragma once
// Периферия на I2C AMOLED-платы: тач FT3168 и часы реального времени PCF8563.
// Драйверы LilyGO (Arduino_DriveBus) ради двух регистров тянуть незачем.

#include "board.h"
#include "gesture.h"

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
// Тач читается в своей задаче FreeRTOS на ядре 0, а loop() работает на ядре 1.
// Раньше касание опрашивалось между кадрами, а кадр колеса рисуется до
// 150 мс: от короткого тапа или быстрого свайпа доходила одна-две точки, и
// жест распознавался с опозданием или неверно. Так же устроены драйверы
// FT3168 у SiFli и esp_lvgl_port: прерывание только будит задачу, та читает
// регистры, считает жест и кладёт события в очередь.
//
// Регистры по драйверам Trezor и LilyGO: 0xA4=1 даёт импульс INT на каждый
// отчёт (~60 Гц), 0x86=0 отключает уход в мониторинг, где чип не считает
// координаты и замечает первое касание с опозданием, 0xA5=0 активный режим.
//
// На той же линии GPIO9 сидит INT часов PCF8563. Будильник и таймер RTC
// прошивка не включает, но касание всё равно подтверждается чтением числа
// точек, а не одним фронтом.
namespace touch {
constexpr uint8_t ADDR = 0x38;

enum Kind : uint8_t { DOWN, MOVE, UP, GESTURE };

struct Msg {
  Kind kind;
  gesture::Event gesture;
  int16_t x, y;    // текущая точка
  int16_t x0, y0;  // где палец лёг
  uint32_t ms;     // момент события
  uint32_t heldMs; // сколько палец лежал к этому моменту
};

// Сколько раз регистры касания удалось прочитать: экрану теста тача по нему
// видно, как часто точки реально доходят до прошивки
static volatile uint32_t reads = 0;
static QueueHandle_t queue = nullptr;
static TaskHandle_t task = nullptr;

// static, а не inline: inline-функция в IRAM не линкуется на Xtensa
// (literal placed after use). Заголовок подключается один раз, из main.cpp
static void IRAM_ATTR onInt() {
  BaseType_t woken = pdFALSE;
  if (task) vTaskNotifyGiveFromISR(task, &woken);
  portYIELD_FROM_ISR(woken);
}

// Настройка пишется при первом ответе чипа: до первого касания он спит и
// запись ушла бы в пустоту
static bool configure() {
  const uint8_t trigger = 1, off = 0;
  return writeRegs(ADDR, 0xA4, &trigger, 1) && writeRegs(ADDR, 0x86, &off, 1) &&
         writeRegs(ADDR, 0xA5, &off, 1);
}

// Сколько INT может молчать, пока палец считается лежащим. Если отчёт об
// отпускании потерялся, касание закрывается по тишине на линии
constexpr unsigned long RELEASE_MS = 80;

static void send(Kind k, gesture::Event e, const gesture::Tracker& t, unsigned long now) {
  Msg m = {k, e, (int16_t)t.x, (int16_t)t.y, (int16_t)t.x0, (int16_t)t.y0,
           (uint32_t)now, (uint32_t)(now - t.t0)};
  // Очередь переполнена, только если loop() долго не забирал события;
  // лишнюю точку следа не жалко, жест дороже
  if (xQueueSend(queue, &m, 0) != pdTRUE && k == GESTURE) {
    Msg drop;
    xQueueReceive(queue, &drop, 0);
    xQueueSend(queue, &m, 0);
  }
}

static int slopPx, swipePx;

static void run(void*) {
  gesture::Tracker tr;
  tr.slop = slopPx;
  tr.swipeMin = swipePx;
  bool configured = false;
  unsigned long activeAt = 0;
  for (;;) {
    // Пока палец лежит, просыпаемся и по таймауту: так ловится отпускание,
    // чей импульс не пришёл
    uint32_t got = ulTaskNotifyTake(pdTRUE, tr.down ? pdMS_TO_TICKS(20) : portMAX_DELAY);
    unsigned long now = millis();
    if (got) activeAt = now;
    if (!got && digitalRead(board::TP_INT) == HIGH) {
      if (tr.down && now - activeAt > RELEASE_MS) {
        gesture::Event e = tr.update(false, tr.x, tr.y, now);
        send(UP, gesture::NONE, tr, now);
        if (e != gesture::NONE) send(GESTURE, e, tr, now);
      }
      continue;
    }
    // 0x02 число касаний в младшем полубайте, дальше X и Y первой точки по
    // 12 бит. Старшие биты XH несут событие точки: 01 это «палец поднят»,
    // и координаты в этом отчёте ещё верные
    uint8_t r[5];
    if (!readRegs(ADDR, 0x02, r, 5)) continue;
    if (!configured) configured = configure();
    reads++;
    uint8_t n = r[0] & 0x0F;
    uint8_t event = r[1] >> 6;
    int x = ((r[1] & 0x0F) << 8) | r[2];
    int y = ((r[3] & 0x0F) << 8) | r[4];
    bool pressed = n > 0 && n < 3 && event != 1;
#ifdef TOUCH_DEBUG
    Serial.printf("[%lu] рег n=%u ev=%u id=%u x=%d y=%d%s\n", now, n, event, r[3] >> 4, x, y,
                  got ? "" : " (таймаут)");
#endif
    bool wasDown = tr.down;
    if (!pressed && !wasDown) continue;
    gesture::Event e = tr.update(pressed, x, y, now);
    send(!wasDown ? DOWN : pressed ? MOVE : UP, gesture::NONE, tr, now);
    if (e != gesture::NONE) send(GESTURE, e, tr, now);
  }
}

// Пороги жестов в пикселях экрана. Задаются снаружи: раскладку знает main.cpp

inline void begin(int slop, int swipeMin) {
  slopPx = slop;
  swipePx = swipeMin;
  queue = xQueueCreate(64, sizeof(Msg));
  pinMode(board::TP_INT, INPUT_PULLUP);
  // Приоритет выше loop(): точка должна быть прочитана, даже когда ядро 1
  // занято кадром, а ядро 0 делит время с WiFi и BLE
  xTaskCreatePinnedToCore(run, "touch", 4096, nullptr, 3, &task, 0);
  attachInterrupt(digitalPinToInterrupt(board::TP_INT), onInt, FALLING);
}

inline bool poll(Msg* m) { return queue && xQueueReceive(queue, m, 0) == pdTRUE; }
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
