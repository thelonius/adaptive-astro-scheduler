#pragma once
// Распознавание тапа, долгого касания и свайпов по координатам пальца.
//
// У FT3168 есть и аппаратные жесты (регистры 0x01 и 0xD3), но заполняет ли их
// прошивка чипа, зависит от партии, поэтому жест считается здесь: по точке,
// где палец лёг, и точке, где его подняли. Для навигации этого хватает.
//
// Без Arduino-зависимостей, чтобы логику можно было гонять на хосте.

#include <stdint.h>
#include <stdlib.h>

namespace gesture {

enum Event : uint8_t { NONE, TAP, LONG, SWIPE_LEFT, SWIPE_RIGHT, SWIPE_UP, SWIPE_DOWN };

struct Tracker {
  bool down = false;
  int x0 = 0, y0 = 0, x = 0, y = 0;
  unsigned long t0 = 0;
  // Порог свайпа в пикселях экрана и порог долгого касания
  int swipeMin = 60;
  unsigned long longMs = 800;

  // Очередной опрос. Событие выдаётся в момент отпускания: пока палец лежит,
  // ещё неизвестно, тап это или начало свайпа
  Event update(bool pressed, int px, int py, unsigned long now) {
    if (pressed) {
      if (!down) {
        down = true;
        x0 = x = px;
        y0 = y = py;
        t0 = now;
      } else {
        x = px;
        y = py;
      }
      return NONE;
    }
    if (!down) return NONE;
    down = false;
    // Точка отпускания: тач сообщает её вместе с событием «палец поднят»
    x = px;
    y = py;
    int dx = x - x0, dy = y - y0;
    int ax = abs(dx), ay = abs(dy);
    if (ax >= swipeMin || ay >= swipeMin) {
      if (ax >= ay) return dx < 0 ? SWIPE_LEFT : SWIPE_RIGHT;
      return dy < 0 ? SWIPE_UP : SWIPE_DOWN;
    }
    // Короче 30 мс это дребезг или случайное касание краем ладони
    unsigned long held = now - t0;
    if (held >= longMs) return LONG;
    if (held >= 30) return TAP;
    return NONE;
  }
};

}  // namespace gesture
