#pragma once
// Распознавание тапа, долгого касания и свайпов по координатам пальца.
//
// У FT3168 есть и аппаратные жесты (регистры 0x01 и 0xD3), но они рассчитаны
// на пробуждение погашенного экрана, а в рабочем режиме регистр 0x01 чип не
// заполняет (так пишут и в прошивке Trezor). Поэтому жест считается здесь.
//
// Жест решается, пока палец ещё на экране, как в LVGL: свайп срабатывает, едва
// палец прошёл порог, долгое касание по таймеру, не дожидаясь отпускания.
// Раньше всё решалось при отпускании, и отклик запаздывал на длину жеста.
//
// Без Arduino-зависимостей, логика проверяется на хосте:
// test/gesture_check.cpp.

#include <stdint.h>
#include <stdlib.h>

namespace gesture {

enum Event : uint8_t { NONE, TAP, LONG, SWIPE_LEFT, SWIPE_RIGHT, SWIPE_UP, SWIPE_DOWN };

struct Tracker {
  bool down = false;
  bool fired = false;  // жест за это касание уже выдан
  int x0 = 0, y0 = 0, x = 0, y = 0;
  unsigned long t0 = 0;
  // Пороги в пикселях экрана. На 326 ppi пиксель вдвое мельче, чем у
  // экранов, под которые подобраны умолчания LVGL (10 и 50 px), поэтому и
  // пороги примерно вдвое больше
  int slop = 24;       // дальше этого касание уже не тап
  int swipeMin = 80;   // пройденный путь, на котором свайп засчитывается сразу
  unsigned long longMs = 700;

  static Event direction(int dx, int dy) {
    if (abs(dx) >= abs(dy)) return dx < 0 ? SWIPE_LEFT : SWIPE_RIGHT;
    return dy < 0 ? SWIPE_UP : SWIPE_DOWN;
  }

  int travel() const {
    int ax = abs(x - x0), ay = abs(y - y0);
    return ax > ay ? ax : ay;
  }

  // Очередная точка. pressed=false означает отпускание, px/py тогда точка,
  // где палец поднялся (тач сообщает её вместе с событием отпускания)
  Event update(bool pressed, int px, int py, unsigned long now) {
    if (pressed) {
      if (!down) {
        down = true;
        fired = false;
        x0 = x = px;
        y0 = y = py;
        t0 = now;
        return NONE;
      }
      x = px;
      y = py;
      if (fired) return NONE;
      if (travel() >= swipeMin) {
        fired = true;
        return direction(x - x0, y - y0);
      }
      if (travel() < slop && now - t0 >= longMs) {
        fired = true;
        return LONG;
      }
      return NONE;
    }

    if (!down) return NONE;
    down = false;
    x = px;
    y = py;
    if (fired) return NONE;
    // Короткий резкий взмах мог не дотянуть до полного порога, пока палец
    // лежал, но явно был свайпом, а не тапом
    int t = travel();
    if (t >= swipeMin * 3 / 5) return direction(x - x0, y - y0);
    if (t >= slop) return NONE;
    // Короче 30 мс это дребезг или случайное касание краем ладони
    unsigned long held = now - t0;
    if (held >= longMs) return LONG;
    if (held >= 30) return TAP;
    return NONE;
  }
};

}  // namespace gesture
