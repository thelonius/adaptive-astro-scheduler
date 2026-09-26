// Хост-проверка gesture::Tracker на записанных с часов касаниях.
//   c++ -std=c++17 -I src test/gesture_check.cpp -o /tmp/gc && /tmp/gc
#include <cstdio>

#include "../src/gesture.h"

struct Pt {
  bool down;
  int x, y;
  unsigned long t;
};

static int fails = 0;

// Возвращает первое выданное событие и момент, когда оно выдано
static void check(const char* name, const Pt* pts, int n, gesture::Event want,
                  unsigned long wantBy) {
  gesture::Tracker tr;
  gesture::Event got = gesture::NONE;
  unsigned long at = 0;
  for (int i = 0; i < n && got == gesture::NONE; i++) {
    got = tr.update(pts[i].down, pts[i].x, pts[i].y, pts[i].t);
    at = pts[i].t;
  }
  bool ok = got == want && (want == gesture::NONE || at <= wantBy);
  if (!ok) fails++;
  printf("%-28s %s: событие %d в %lu мс (ждали %d не позже %lu)\n", name,
         ok ? "OK  " : "FAIL", got, at, want, wantBy);
}

int main() {
  // Свайп влево из лога: 444 -> 122 за 190 мс, отчёты каждые 21 мс
  const Pt swipeL[] = {{true, 444, 223, 0},   {true, 420, 225, 21},
                       {true, 360, 240, 42},  {true, 290, 260, 63},
                       {true, 200, 280, 84},  {true, 150, 290, 105},
                       {false, 122, 297, 126}};
  check("свайп влево", swipeL, 7, gesture::SWIPE_LEFT, 63);

  // Тот же свайп, но цикл был занят кадром и видел только начало и конец
  const Pt swipeSparse[] = {{true, 444, 223, 0}, {false, 122, 297, 194}};
  check("свайп по двум точкам", swipeSparse, 2, gesture::SWIPE_LEFT, 194);

  // Тап: палец почти не сдвинулся
  const Pt tap[] = {{true, 272, 256, 0}, {true, 272, 256, 21},
                    {true, 273, 257, 42}, {false, 273, 257, 63}};
  check("тап", tap, 4, gesture::TAP, 63);

  // Долгое касание срабатывает по таймеру, до отпускания
  Pt hold[60];
  for (int i = 0; i < 59; i++) hold[i] = {true, 252 + (i % 2), 254, (unsigned long)i * 21};
  hold[59] = {false, 252, 254, 59 * 21};
  check("долгое касание", hold, 60, gesture::LONG, 750);

  // Короткий взмах вверх: не дотянул до 80 px, пока палец лежал
  const Pt flick[] = {{true, 250, 300, 0}, {true, 250, 270, 21}, {false, 252, 245, 42}};
  check("короткий взмах вверх", flick, 3, gesture::SWIPE_UP, 42);

  // Медленный сдвиг на 40 px: ни тап, ни свайп
  const Pt nudge[] = {{true, 250, 250, 0}, {true, 270, 250, 200}, {false, 290, 250, 400}};
  check("сдвиг без жеста", nudge, 3, gesture::NONE, 0);

  printf("%s\n", fails ? "FAIL" : "OK");
  return fails ? 1 : 0;
}
