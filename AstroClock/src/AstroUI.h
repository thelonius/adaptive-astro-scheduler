#ifndef ASTRO_UI_H
#define ASTRO_UI_H

#include <Arduino.h>
#include <LovyanGFX.hpp>

#include "ephemeris.h"
#include "glyphs.h"
#include "lunardays.h"
#include "transits.h"

// Радиусы колец. Экран 240x240, центр 120,120.
// Наружу зодиак, под ним транзитные планеты, ещё внутрь натальные, в центре
// линии аспектов сходятся к точке.
namespace layout {
constexpr int CX = 120, CY = 120;
constexpr int R_RING_OUT = 117;
constexpr int R_RING_IN = 91;
constexpr int R_SIGN = 104;
constexpr int R_TRANSIT = 79;
constexpr int R_NATAL_RING = 64;
constexpr int R_NATAL = 56;
constexpr int R_ASPECT = 45;
}  // namespace layout

// Роли, которыми пользуется отрисовка. Заполняется из palette::Live целиком:
// собственных цветов у интерфейса не осталось.
struct Theme {
  uint16_t bg;
  uint16_t ring;
  uint16_t fire;
  uint16_t earth;
  uint16_t air;
  uint16_t water;
  uint16_t text;
  uint16_t muted;   // подписи второго плана
  uint16_t accent;  // управитель часа
  uint16_t warn;    // запрет, осторожность
  uint16_t good;    // благоприятное
};

class AstroUI {
 private:
  lgfx::v1::LovyanGFX* _gfx;

  // Живая палитра приходит снаружи готовой темой: считать её здесь нечем,
  // для этого нужны эфемериды и планетарные часы
  Theme _liveTheme = {};
  bool _useLive = false;
  const uint16_t* _signColors = nullptr;
  bool _moonVoid = false;
  float _voidBright = 1.0f;
  int _moonSignIndex = -1;
  float _moonPhase = 1.0f;
  bool _moonWaxing = true;
  float _ascendant = 0.0f;

  // Долгота в экранный угол. Асцендент уезжает влево (180°), счёт против
  // часовой стрелки — так рисуют карту, и так же положение Солнца работает
  // стрелкой суточных часов.
  float getAngle(float longitude) const {
    float a = 180.0f - (longitude - _ascendant);
    while (a < 0) a += 360.0f;
    while (a >= 360) a -= 360.0f;
    return a * 3.14159265f / 180.0f;
  }

 public:
  // Затемнение долей 0..1. Отдельно от dim() с целыми долями: разведение
  // наложившихся глифов гасит цвет плавно, а не ступенями пятых частей.
  static uint16_t fade(uint16_t c, float k) {
    if (k >= 1.0f) return c;
    if (k <= 0.0f) k = 0.0f;
    uint16_t r = (c >> 11) & 0x1F, g = (c >> 5) & 0x3F, b = c & 0x1F;
    r = (uint16_t)(r * k);
    g = (uint16_t)(g * k);
    b = (uint16_t)(b * k);
    return (r << 11) | (g << 5) | b;
  }

 private:
  static uint16_t dim(uint16_t c, uint8_t num, uint8_t den) {
    uint16_t r = (c >> 11) & 0x1F, g = (c >> 5) & 0x3F, b = c & 0x1F;
    r = r * num / den;
    g = g * num / den;
    b = b * num / den;
    return (r << 11) | (g << 5) | b;
  }

 private:
  void blitPlanetGlyph(int gi, int x, int y, uint16_t color) {
    const uint16_t* g = glyphs::planetGlyphs() + gi * 13;
    for (int row = 0; row < 13; row++)
      for (int col = 0; col < 13; col++)
        if (g[row] & (1 << (12 - col)))
          _gfx->drawPixel(x - 6 + col, y - 6 + row, color);
  }

 public:
  // Растр 13x13 из glyphs.h. Параметр s остался от прежней версии на примитивах
  // и больше не меняет размер: на тринадцати пикселях глиф либо читается, либо
  // нет, промежуточных масштабов не бывает.
  void drawPlanetGlyph(int body, int x, int y, uint16_t color, int s) {
    (void)s;
    int gi;
    switch (body) {
      case ephem::SUN:     gi = glyphs::PG_SUN; break;
      // Сторона серпа берётся из элонгации, а не из освещённости: половинная
      // освещённость бывает и в первой четверти, и в последней, поэтому по
      // ней глиф угадывал сторону лишь в половине случаев
      case ephem::MOON:    gi = _moonWaxing ? glyphs::PG_MOON_WAX
                                            : glyphs::PG_MOON_WANE; break;
      case ephem::MERCURY: gi = glyphs::PG_MERCURY; break;
      case ephem::VENUS:   gi = glyphs::PG_VENUS; break;
      case ephem::MARS:    gi = glyphs::PG_MARS; break;
      case ephem::JUPITER: gi = glyphs::PG_JUPITER; break;
      case ephem::SATURN:  gi = glyphs::PG_SATURN; break;
      case ephem::URANUS:  gi = glyphs::PG_URANUS; break;
      case ephem::NEPTUNE: gi = glyphs::PG_NEPTUNE; break;
      case ephem::PLUTO:   gi = glyphs::PG_PLUTO; break;
      default:
        _gfx->fillCircle(x, y, 2, color);
        return;
    }
    blitPlanetGlyph(gi, x, y, color);
  }

  // Растр по прямому индексу glyphs::PlanetGlyph, в обход выбора по текущей
  // фазе Луны. Нужен легенде: там оба серпа показываются рядом сразу, а не
  // только тот, что сейчас на небе.
  void drawPlanetGlyphByIndex(int gi, int x, int y, uint16_t color) {
    blitPlanetGlyph(gi, x, y, color);
  }

  // Стандартные пиктограммы аспектов вместо ASCII-заглушек в списке транзитов:
  // соединение — кружок с хвостиком, секстиль — шестилучевая звезда, квадрат,
  // трин — треугольник, оппозиция — кружок с линией навылет.
  void drawAspectGlyph(uint8_t kind, int x, int y, uint16_t color, int s) {
    switch (kind) {
      case transit::CONJUNCTION:
        _gfx->drawCircle(x, y, s - 1, color);
        _gfx->drawLine(x, y + s - 1, x, y + s + 2, color);
        break;
      case transit::SEXTILE:
        for (int k = 0; k < 3; k++) {
          float a = k * 3.14159265f / 3.0f;  // три спицы через 60° дают шесть лучей
          int dx = (int)(s * cos(a)), dy = (int)(s * sin(a));
          _gfx->drawLine(x - dx, y - dy, x + dx, y + dy, color);
        }
        break;
      case transit::SQUARE:
        _gfx->drawRect(x - s, y - s, 2 * s + 1, 2 * s + 1, color);
        break;
      case transit::TRINE:
        _gfx->drawTriangle(x, y - s, x - s, y + s - 1, x + s, y + s - 1, color);
        break;
      case transit::OPPOSITION:
        _gfx->drawCircle(x, y, s - 1, color);
        _gfx->drawLine(x - s - 2, y, x + s + 2, y, color);
        break;
    }
  }

 private:
  // Тема одна — живая палитра из положения светил. Восемь фиксированных
  // наборов убраны: они спорили с палитрой и раскрашивали экраны мимо неё.
  Theme active() const { return _liveTheme; }

  // Индекс глифа шрифта 5x7 по UTF-8. Латиницы в шрифте нет: подписи русские,
  // цифры общие. Возвращает -1 для пробела и незнакомых символов.
  static int glyphIndex(const unsigned char* s, int* adv) {
    unsigned char c = s[0];
    *adv = 1;
    if (c == 0xD0 || c == 0xD1) {
      unsigned char c2 = s[1];
      *adv = 2;
      if (c == 0xD0 && c2 >= 0x90 && c2 <= 0xAF) return c2 - 0x90;       // А-Я
      if (c == 0xD0 && c2 == 0x81) return 5;                             // Ё как Е
      // Строчные а-я разорваны по границе двухбайтовой последовательности:
      // а-п это D0 B0..BF, р-я уезжают в D1 80..8F
      if (c == 0xD0 && c2 >= 0xB0 && c2 <= 0xBF) return 46 + (c2 - 0xB0);
      if (c == 0xD1 && c2 >= 0x80 && c2 <= 0x8F) return 62 + (c2 - 0x80);
      if (c == 0xD1 && c2 == 0x91) return 51;                            // ё как е
      return -1;
    }
    if (c >= '0' && c <= '9') return 32 + (c - '0');
    if (c == ':') return 42;
    if (c == '.') return 43;
    if (c == '+') return 44;
    if (c == '-') return 45;
    if (c == ',') return 78;
    if (c == '/') return 79;
    if (c == '(') return 80;
    if (c == ')') return 81;
    if (c == '"') return 82;
    if (c == '!') return 83;
    if (c == ';') return 84;
    return -1;
  }

 public:
  // Ширина строки в пикселях при данном масштабе (межбуквие один пиксель шрифта)
  static int text57Width(const char* str, int scale) {
    int n = 0;
    const unsigned char* p = (const unsigned char*)str;
    while (*p) {
      int adv;
      glyphIndex(p, &adv);
      p += adv;
      n++;
    }
    return n > 0 ? (n * 6 - 1) * scale : 0;
  }

  // Полуширина полезной области на высоте y: экран круглый, у краёв строка
  // короче. Радиус взят меньше обода, чтобы текст не притирался к кольцу.
  static int halfWidthAt(int y) {
    int dy = y - layout::CY;
    int r = 112;
    if (dy <= -r || dy >= r) return 0;
    return (int)sqrt((double)(r * r - dy * dy));
  }

  // Абзац с переносом по словам, вписанный в круг. skipLines пропускает первые
  // строки — так листается длинный текст. Возвращает, сколько строк вышло
  // всего, включая непоказанные: по этому числу считается прокрутка.
  int drawParagraph(const char* str, int yTop, int yBottom, int scale,
                    uint16_t color, int skipLines) {
    const int lineH = 8 * scale;
    const int cellW = 6 * scale;
    int y = yTop;
    int lineNo = 0;
    char line[96];
    int len = 0, glyphs = 0;

    auto flush = [&]() {
      if (len == 0) return;
      line[len] = 0;
      if (lineNo >= skipLines && y + lineH <= yBottom) {
        drawText57(line, layout::CX, y, scale, color);
        y += lineH;
      }
      lineNo++;
      len = 0;
      glyphs = 0;
    };

    const unsigned char* p = (const unsigned char*)str;
    while (*p) {
      while (*p == ' ') p++;
      if (!*p) break;
      // границы слова и его длина в глифах
      const unsigned char* w = p;
      int wg = 0;
      while (*w && *w != ' ') {
        int adv;
        glyphIndex(w, &adv);
        w += adv;
        wg++;
      }
      int bytes = (int)(w - p);
      if (bytes >= (int)sizeof(line) - 2) { p = w; continue; }

      // Ширина считается для той строки, куда слово ляжет: у круга каждая
      // строка своей длины, и мерить по текущей высоте нельзя
      int probeY = (lineNo >= skipLines) ? y : yTop;
      int maxGlyphs = (2 * halfWidthAt(probeY + lineH / 2)) / cellW;
      if (maxGlyphs < 4) maxGlyphs = 4;

      if (glyphs > 0 && glyphs + 1 + wg > maxGlyphs) flush();
      if (glyphs > 0) {
        line[len++] = ' ';
        glyphs++;
      }
      memcpy(line + len, p, bytes);
      len += bytes;
      glyphs += wg;
      p = w;
      if (glyphs >= maxGlyphs) flush();
    }
    flush();
    return lineNo;
  }

  // Строка 5x7 с центром в cx, верхний край в y.
  void drawText57(const char* str, int cx, int y, int scale, uint16_t color) {
    int x = cx - text57Width(str, scale) / 2;
    const unsigned char* p = (const unsigned char*)str;
    const uint8_t* F = lunardays::font57();
    while (*p) {
      int adv;
      int gi = glyphIndex(p, &adv);
      p += adv;
      if (gi >= 0) {
        const uint8_t* g = F + gi * 7;
        for (int row = 0; row < 7; row++)
          for (int col = 0; col < 5; col++)
            if (g[row] & (1 << (4 - col)))
              _gfx->fillRect(x + col * scale, y + row * scale, scale, scale, color);
      }
      x += 6 * scale;
    }
  }

  // Иконка занятия 13x13 с центром в (cx, cy). slash перечёркивает: оранжевая
  // диагональ означает «не для этого дня». Оранжевый, а не красный, чтобы не
  // спорить с красным номером осторожных дней
  void drawIcon13(int idx, int cx, int cy, int scale, uint16_t color, bool slash) {
    if (idx < 0 || idx >= lunardays::ICON_COUNT) return;
    const uint16_t* g = lunardays::icons13() + idx * 13;
    int x0 = cx - 13 * scale / 2, y0 = cy - 13 * scale / 2;
    for (int row = 0; row < 13; row++)
      for (int col = 0; col < 13; col++)
        if (g[row] & (1u << (12 - col)))
          _gfx->fillRect(x0 + col * scale, y0 + row * scale, scale, scale, color);
    if (slash) {
      int r = 8 * scale;
      uint16_t slash = active().warn;
      _gfx->drawLine(cx - r, cy + r, cx + r, cy - r, slash);
      _gfx->drawLine(cx - r + 1, cy + r, cx + r + 1, cy - r, slash);
    }
  }

 private:
  // Знак зодиака: растр 13x13 из glyphs.h. Дуги и отрезки на этом размере
  // сливались в кляксу, попиксельный рисунок читается.
  void drawSignGlyph(int index, int x, int y, uint16_t color) {
    if (index < 0 || index > 11) return;
    const uint16_t* g = glyphs::signGlyphs() + index * glyphs::SIGN_H;
    int x0 = x - glyphs::SIGN_W / 2;
    int y0 = y - glyphs::SIGN_H / 2;
    for (int row = 0; row < glyphs::SIGN_H; row++) {
      uint16_t bits = g[row];
      if (!bits) continue;
      for (int col = 0; col < glyphs::SIGN_W; col++)
        if (bits & (1u << (glyphs::SIGN_W - 1 - col)))
          _gfx->drawPixel(x0 + col, y0 + row, color);
    }
  }

 public:
  // Знак вне кольца: легенде нужен образец глифа рядом с подписью
  void drawSign(int index, int x, int y, uint16_t color) {
    drawSignGlyph(index, x, y, color);
  }

  explicit AstroUI(lgfx::v1::LovyanGFX* gfx) : _gfx(gfx) {}

  // Цель отрисовки меняется на спрайт, когда тот удалось создать
  void setTarget(lgfx::v1::LovyanGFX* gfx) { _gfx = gfx; }

  void setMoonVoid(bool isVoid) { _moonVoid = isVoid; }
  // Фаза дыхания кольца VoC, 0..1. Задаётся перед отрисовкой кадра, чтобы
  // кольцо в спрайте совпадало по яркости с прямой подрисовкой pulseVoidRing()
  void setVoidBright(float b) { _voidBright = b; }
  void setMoonSignIndex(int index) { _moonSignIndex = index; }
  void setMoonPhase(float phase) { _moonPhase = phase; }
  void setMoonWaxing(bool waxing) { _moonWaxing = waxing; }
  void setAscendant(float asc) { _ascendant = asc; }
  // Девять тем: нулевая живая, дальше восемь фиксированных
  Theme current() const { return active(); }

  // Живая палитра: тема и цвета знаков считаются снаружи из положения светил
  void useLive(const Theme& t, const uint16_t* signColors) {
    _liveTheme = t;
    _signColors = signColors;
    _useLive = true;
  }

  // Засечка куспида в свободном кольце между натальными и транзитными
  // глифами. Угловые куспиды длиннее: их читают первыми
  void drawCusp(float lonDeg, uint16_t color, bool angular) {
    float a = getAngle(lonDeg);
    int r0 = angular ? 65 : 66;
    int r1 = angular ? 77 : 71;
    _gfx->drawLine(layout::CX + r0 * cos(a), layout::CY + r0 * sin(a),
                   layout::CX + r1 * cos(a), layout::CY + r1 * sin(a), color);
  }

  void drawWheel() {
    Theme t = active();
    _gfx->fillScreen(t.bg);

    uint16_t ringCol = dim(t.ring, 1, 3);
    _gfx->drawCircle(layout::CX, layout::CY, layout::R_RING_OUT, ringCol);
    _gfx->drawCircle(layout::CX, layout::CY, layout::R_RING_IN, ringCol);
    _gfx->drawCircle(layout::CX, layout::CY, layout::R_NATAL_RING, dim(t.ring, 1, 5));

    for (int i = 0; i < 12; i++) {
      float radLine = getAngle(i * 30.0f);
      _gfx->drawLine(layout::CX + layout::R_RING_IN * cos(radLine),
                     layout::CY + layout::R_RING_IN * sin(radLine),
                     layout::CX + layout::R_RING_OUT * cos(radLine),
                     layout::CY + layout::R_RING_OUT * sin(radLine), ringCol);

      float radGlyph = getAngle(i * 30.0f + 15.0f);
      int tx = layout::CX + layout::R_SIGN * cos(radGlyph);
      int ty = layout::CY + layout::R_SIGN * sin(radGlyph);

      // В живой палитре знак красится собственной долготой, поэтому кольцо
      // становится плавным цветовым кругом. В фиксированных темах остаётся
      // стихия: огонь, земля, воздух, вода по кругу
      uint16_t color;
      if (_signColors) {
        color = _signColors[i];
      } else {
        switch (i % 4) {
          case 0: color = t.fire; break;
          case 1: color = t.earth; break;
          case 2: color = t.air; break;
          default: color = t.water; break;
        }
      }
      drawSignGlyph(i, tx, ty, color);
    }
  }

  // Транзитная планета на внешнем кольце. Ретроградность помечается точкой
  // под глифом: буква R на пяти пикселях нечитаема.
  void drawTransit(int body, float degree, uint16_t color, bool retro, bool highlight) {
    float rad = getAngle(degree);
    int x = layout::CX + layout::R_TRANSIT * cos(rad);
    int y = layout::CY + layout::R_TRANSIT * sin(rad);
    if (highlight) _gfx->drawCircle(x, y, 8, dim(color, 1, 2));
    drawPlanetGlyph(body, x, y, color, 5);
    if (retro) _gfx->fillCircle(x, y + 8, 1, color);
    // Луна без курса: кольцо рисуется той же фазой дыхания, что и прямая
    // подрисовка pulseVoidRing(). Раньше в кадре оно было статичным, и при
    // наложившихся глифах кадр из спрайта уходил на панель пять раз в секунду,
    // каждый раз сбивая яркость кольца — получалось мигание вместо дыхания
    if (body == ephem::MOON && _moonVoid) voidRing(_gfx, x, y, color, _voidBright);
  }

 private:
  // Плавная яркость, а не пять ступеней dim(): на двадцати шагах за период
  // ступени читались как рывки
  static void voidRing(lgfx::v1::LovyanGFX* g, int x, int y, uint16_t color,
                       float bright) {
    uint16_t c = fade(color, 0.25f + 0.75f * bright);
    g->drawCircle(x, y, 10, c);
    g->drawCircle(x, y, 11, fade(c, 0.4f));
  }

 public:
  // Дыхание кольца безкурсовой Луны. Рисуется прямо в переданную панель, в
  // обход спрайта: кольцо это два десятка пикселей контура, гонять ради него
  // целый кадр через pushSprite незачем.
  void pulseVoidRing(lgfx::v1::LovyanGFX* panel, float degree, uint16_t color,
                     float bright) {
    float rad = getAngle(degree);
    int x = layout::CX + layout::R_TRANSIT * cos(rad);
    int y = layout::CY + layout::R_TRANSIT * sin(rad);
    voidRing(panel, x, y, color, bright);
  }

  // Натальная планета на внутреннем кольце, приглушённая: она фон, а событие
  // происходит снаружи.
  // Приглушение три пятых, а не две: на двух пятых Меркурий и Сатурн выходили
  // цветом 0x3131 — почти чёрным на чёрном, и тонкие детали начертаний (рожки,
  // перекладина) тонули, отчего глиф читался бесформенным пятном. Натал всё
  // ещё заметно тусклее транзита, но остаётся глифом, а не кляксой.
  void drawNatal(int body, float degree, uint16_t color) {
    float rad = getAngle(degree);
    drawPlanetGlyph(body, layout::CX + layout::R_NATAL * cos(rad),
                    layout::CY + layout::R_NATAL * sin(rad), dim(color, 3, 5), 4);
  }

  // Угловая точка натала: асцендент и МС рисуются засечкой, а не глифом.
  void drawNatalAngle(float degree, uint16_t color, bool isAsc) {
    float rad = getAngle(degree);
    int r0 = layout::R_NATAL - 6, r1 = layout::R_NATAL_RING;
    _gfx->drawLine(layout::CX + r0 * cos(rad), layout::CY + r0 * sin(rad),
                   layout::CX + r1 * cos(rad), layout::CY + r1 * sin(rad), color);
    if (isAsc) {
      int rt = layout::R_NATAL - 10;
      _gfx->fillCircle(layout::CX + rt * cos(rad), layout::CY + rt * sin(rad), 2, color);
    }
  }

  // Соединение вырождается: углы транзитной и натальной точки почти совпадают,
  // и хорда на радиусе 45 превращается в точку. Поэтому соединение рисуется
  // радиальной перемычкой между натальным и транзитным кольцами — она заодно
  // прямо показывает, какая пара тел сошлась.
  void drawConjunctionLink(float transitDeg, float natalDeg, uint16_t color,
                           float slack) {
    float rt = getAngle(transitDeg), rn = getAngle(natalDeg);
    uint8_t num = (uint8_t)(5.0f - 3.0f * slack);
    if (num < 2) num = 2;
    uint16_t c = dim(color, num, 5);
    const int r0 = layout::R_NATAL + 6;
    const int r1 = layout::R_TRANSIT - 7;
    int x0 = layout::CX + r0 * cos(rn), y0 = layout::CY + r0 * sin(rn);
    int x1 = layout::CX + r1 * cos(rt), y1 = layout::CY + r1 * sin(rt);
    _gfx->drawLine(x0, y0, x1, y1, c);
    // Вторая линия с боковым сдвигом: одиночный пиксель среди глифов теряется
    int dx = (y1 - y0), dy = -(x1 - x0);
    int len = (int)sqrt((double)(dx * dx + dy * dy));
    if (len > 0) {
      dx = dx / len;
      dy = dy / len;
      _gfx->drawLine(x0 + dx, y0 + dy, x1 + dx, y1 + dy, c);
    }
  }

  // Линия аспекта между транзитной и натальной точкой. Чем точнее аспект, тем
  // ярче линия: орбис приходит уже нормированным в 0..1, где 0 — точный.
  void drawAspectLink(float transitDeg, float natalDeg, uint16_t color, float slack) {
    float a1 = getAngle(transitDeg), a2 = getAngle(natalDeg);
    uint8_t num = (uint8_t)(5.0f - 4.0f * slack);
    if (num < 1) num = 1;
    uint16_t c = dim(color, num, 5);
    _gfx->drawLine(layout::CX + layout::R_ASPECT * cos(a1), layout::CY + layout::R_ASPECT * sin(a1),
                   layout::CX + layout::R_ASPECT * cos(a2), layout::CY + layout::R_ASPECT * sin(a2), c);
  }

  // Втулка со временем. Заодно перекрывает линии аспектов в середине.
  // Ни заливки, ни фона у текста: цифры висят прямо на карте. Линии аспектов
  // обрезаны по радиусу втулки, поэтому под них ничего не подкладывается.
  void drawHub(const char* timeStr, const char* subStr) {
    // Время и дата убраны. Втулка остаётся как дыра в полотне аспектов.
  }


  // Метка текущего положения Солнца на внешнем ободе: суточная стрелка.
  void drawSunMark(float sunDegree, uint16_t color) {
    float rad = getAngle(sunDegree);
    int r0 = layout::R_RING_OUT, r1 = layout::R_RING_OUT + 3;
    if (r1 > 119) r1 = 119;
    _gfx->drawLine(layout::CX + r0 * cos(rad), layout::CY + r0 * sin(rad),
                   layout::CX + r1 * cos(rad), layout::CY + r1 * sin(rad), color);
  }

  void drawStatus(const char* status) {
    Theme t = active();
    _gfx->setFont(&lgfx::v1::fonts::Font0);
    _gfx->setTextColor(t.text, t.bg);
    _gfx->setTextDatum(lgfx::v1::bottom_center);
    _gfx->drawString(status, layout::CX, layout::CY + 30);
  }
};

#endif
