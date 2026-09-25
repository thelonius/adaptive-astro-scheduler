#ifndef ASTRO_UI_H
#define ASTRO_UI_H

#include <Arduino.h>

#include "board.h"
#include "ephemeris.h"
#include "glyphs.h"
#include "lunardays.h"
#include "transits.h"

#ifdef BOARD_SMOOTH
#include "fonts/fonts.h"
#endif

// Раскладка задаётся в координатах экрана 240x240, на котором прошивка
// начиналась, и пересчитывается под настоящий размер через px(). Так одна
// раскладка обслуживает и GC9A01, и AMOLED 466x466, а числа в коде остаются
// сравнимыми с прежними.
//
// Наружу зодиак, под ним транзитные планеты, ещё внутрь натальные, в центре
// линии аспектов сходятся к точке.
namespace layout {
constexpr float SCALE = board::W / 240.0f;
constexpr int px(float v) { return (int)(v * SCALE + (v >= 0 ? 0.5f : -0.5f)); }

constexpr int CX = board::W / 2, CY = board::H / 2;
constexpr int R_RING_OUT = px(117);
constexpr int R_RING_IN = px(91);
constexpr int R_SIGN = px(104);
constexpr int R_TRANSIT = px(79);
constexpr int R_NATAL_RING = px(64);
constexpr int R_NATAL = px(56);
constexpr int R_ASPECT = px(45);

#ifdef BOARD_SMOOTH
// Сторона квадрата, в который вписан глиф тела или знака
constexpr int GLYPH = fontcap::SYM_RING;
constexpr int GLYPH_BIG = fontcap::SYM_BIG;
// Толщина линии в пикселях экрана. Однопиксельные линии на 326 ppi
// становятся волосками и на тёмном фоне почти пропадают
constexpr float STROKE = 1.8f;
#else
constexpr int GLYPH = 13;
constexpr int GLYPH_BIG = 13;
constexpr float STROKE = 1.0f;
#endif
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

// Роли текста вместо кеглей. На AMOLED за каждой стоит свой шрифт Inter, на
// C3 масштаб растра 5x7: мелкий, основной и подзаголовок там одного размера
enum TextRole : uint8_t { TXT_SMALL, TXT_BODY, TXT_HEAD, TXT_TITLE, TXT_HUGE, TXT_ROLES };

class AstroUI {
 private:
  lgfx::v1::LovyanGFX* _gfx;

  // Живая палитра приходит снаружи готовой темой: считать её здесь нечем,
  // для этого нужны эфемериды и планетарные часы
  Theme _liveTheme = {};
  const uint16_t* _signColors = nullptr;
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

  static int polarX(float r, float a) { return layout::CX + (int)lroundf(r * cosf(a)); }
  static int polarY(float r, float a) { return layout::CY + (int)lroundf(r * sinf(a)); }

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

  // --- линии и окружности -------------------------------------------------
  // На AMOLED сглаженные, с толщиной STROKE, умноженной на w. Сглаживание
  // читает фон из спрайта, поэтому в панель напрямую так рисовать нельзя:
  // для прямой подрисовки есть отдельные пути без смешивания.
 public:
  void line(int x0, int y0, int x1, int y1, uint16_t color, float w = 1.0f) {
#ifdef BOARD_SMOOTH
    _gfx->drawWideLine(x0, y0, x1, y1, layout::STROKE * w * 0.5f, color);
#else
    (void)w;
    _gfx->drawLine(x0, y0, x1, y1, color);
#endif
  }

  void circle(int cx, int cy, int r, uint16_t color, float w = 1.0f) {
#ifdef BOARD_SMOOTH
    smoothRing(cx, cy, (float)r, layout::STROKE * w * 0.5f, color);
#else
    (void)w;
    _gfx->drawCircle(cx, cy, r, color);
#endif
  }

  void dot(int cx, int cy, int r, uint16_t color) {
#ifdef BOARD_SMOOTH
    _gfx->fillSmoothCircle(cx, cy, r, color);
#else
    _gfx->fillCircle(cx, cy, r, color);
#endif
  }

 private:
#ifdef BOARD_SMOOTH
  // Окружность со сглаживанием: у LovyanGFX есть сглаженная линия и круг с
  // заливкой, а контура нет. Обходятся только пиксели кольца шириной 2hw
  // плюс по пикселю на край, в каждой строке это две короткие полосы
  void smoothRing(float cx, float cy, float r, float hw, uint16_t color) {
    const float ro = r + hw + 1.0f;
    const float ri = r - hw - 1.0f;
    const int y0 = (int)floorf(cy - ro), y1 = (int)ceilf(cy + ro);
    for (int y = y0; y <= y1; y++) {
      float dy = y - cy;
      if (fabsf(dy) > ro) continue;
      float xo = sqrtf(ro * ro - dy * dy);
      float xi = (ri > 0 && fabsf(dy) < ri) ? sqrtf(ri * ri - dy * dy) : -1.0f;
      auto span = [&](int xa, int xb) {
        for (int x = xa; x <= xb; x++) {
          float d = fabsf(sqrtf((x - cx) * (x - cx) + dy * dy) - r);
          float cov = hw + 0.5f - d;
          if (cov <= 0) continue;
          if (cov > 1) cov = 1;
          _gfx->fillRectAlpha(x, y, 1, 1, (uint8_t)(cov * 255), color);
        }
      };
      if (xi < 0) {
        span((int)floorf(cx - xo), (int)ceilf(cx + xo));
      } else {
        span((int)floorf(cx - xo), (int)ceilf(cx - xi));
        span((int)floorf(cx + xi), (int)ceilf(cx + xo));
      }
    }
  }

  // Шрифты грузятся один раз на все цели отрисовки: VLWfont держит таблицы
  // метрик в PSRAM, а растры читает прямо из флеша через PointerWrapper
  enum Face : uint8_t {
    F_SMALL, F_BODY, F_HEAD, F_TITLE, F_HUGE, F_SYM, F_SYM_BIG, F_ICON, F_COUNT
  };
  struct FaceSlot {
    lgfx::PointerWrapper data;
    lgfx::VLWfont font;
  };
  static FaceSlot* faces() {
    static FaceSlot f[F_COUNT];
    return f;
  }
  static const lgfx::IFont* face(int i) { return &faces()[i].font; }

  static int capOf(int f) {
    static const int CAP[F_COUNT] = {
        fontcap::INTER_SMALL, fontcap::INTER_BODY, fontcap::INTER_HEAD,
        fontcap::INTER_TITLE, fontcap::INTER_HUGE, fontcap::SYM_RING,
        fontcap::SYM_BIG, fontcap::ICONS};
    return CAP[f];
  }

  // Символ по кодовой точке в UTF-8: у LovyanGFX нет drawChar с юникодом
  // для VLW в обход строки
  static void utf8(uint16_t cp, char* out) {
    if (cp < 0x80) {
      out[0] = (char)cp;
      out[1] = 0;
    } else if (cp < 0x800) {
      out[0] = (char)(0xC0 | (cp >> 6));
      out[1] = (char)(0x80 | (cp & 0x3F));
      out[2] = 0;
    } else {
      out[0] = (char)(0xE0 | (cp >> 12));
      out[1] = (char)(0x80 | ((cp >> 6) & 0x3F));
      out[2] = (char)(0x80 | (cp & 0x3F));
      out[3] = 0;
    }
  }

  // Символ с центром в (x, y). Шрифты символов собраны так, что квадрат
  // глифа совпадает с рамкой строки, и middle_center ставит центр куда надо
  void drawSymbol(uint16_t cp, int x, int y, uint16_t color, int f) {
    char s[4];
    utf8(cp, s);
    _gfx->setFont(face(f));
    _gfx->setTextSize(1);
    _gfx->setTextDatum(lgfx::v1::middle_center);
    _gfx->setTextColor(color);
    _gfx->drawString(s, x, y);
  }

  static uint16_t planetCodepoint(int gi) {
    static const uint16_t CP[] = {0x2609, 0x263D, 0x263E, 0x263F, 0x2640, 0x2642,
                                  0x2643, 0x2644, 0x26E2, 0x2646, 0x2647};
    return CP[gi];
  }
#endif

 public:
  // Разовая загрузка шрифтов, до первой отрисовки
  static void begin() {
#ifdef BOARD_SMOOTH
    static const uint8_t* SRC[F_COUNT] = {INTER_SMALL, INTER_BODY, INTER_HEAD,
                                          INTER_TITLE, INTER_HUGE, SYM_RING,
                                          SYM_BIG, ICONS};
    for (int i = 0; i < F_COUNT; i++) {
      faces()[i].data.set(SRC[i]);
      faces()[i].font.loadFont(&faces()[i].data);
    }
#endif
  }

 private:
  void blitPlanetGlyph(int gi, int x, int y, uint16_t color, bool big) {
#ifdef BOARD_SMOOTH
    drawSymbol(planetCodepoint(gi), x, y, color, big ? F_SYM_BIG : F_SYM);
#else
    (void)big;
    const uint16_t* g = glyphs::planetGlyphs() + gi * 13;
    for (int row = 0; row < 13; row++)
      for (int col = 0; col < 13; col++)
        if (g[row] & (1 << (12 - col)))
          _gfx->drawPixel(x - 6 + col, y - 6 + row, color);
#endif
  }

 public:
  // Глиф тела. На C3 растр 13x13 из glyphs.h одного размера, big там ничего
  // не меняет: на тринадцати пикселях глиф либо читается, либо нет
  void drawPlanetGlyph(int body, int x, int y, uint16_t color, bool big = false) {
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
        dot(x, y, layout::px(2), color);
        return;
    }
    blitPlanetGlyph(gi, x, y, color, big);
  }

  // Растр по прямому индексу glyphs::PlanetGlyph, в обход выбора по текущей
  // фазе Луны. Нужен легенде: там оба серпа показываются рядом сразу, а не
  // только тот, что сейчас на небе.
  void drawPlanetGlyphByIndex(int gi, int x, int y, uint16_t color) {
    blitPlanetGlyph(gi, x, y, color, false);
  }

  // Пиктограммы аспектов: соединение ☌, секстиль ⚹, квадрат □, трин △,
  // оппозиция ☍. На C3 те же фигуры примитивами, s задаёт полуразмер
  void drawAspectGlyph(uint8_t kind, int x, int y, uint16_t color, int s) {
#ifdef BOARD_SMOOTH
    static const uint16_t CP[5] = {0x260C, 0x26B9, 0x25A1, 0x25B3, 0x260D};
    if (kind < 5) drawSymbol(CP[kind], x, y, color, s >= 7 ? F_SYM_BIG : F_SYM);
#else
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
#endif
  }

 private:
  // Тема одна: живая палитра из положения светил, с градиентом по долготе
  Theme active() const { return _liveTheme; }

  // --- растровый шрифт 5x7 (только C3) ------------------------------------

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
    // Прочие многобайтовые последовательности (тире, буллет) пропускаются
    // целиком, иначе каждый байт считался бы отдельной пустой клеткой
    if (c >= 0xE0 && c < 0xF0) { *adv = 3; return -1; }
    if (c >= 0xC0 && c < 0xE0) { *adv = 2; return -1; }
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

  static int scale57(TextRole r) {
    static const uint8_t S[TXT_ROLES] = {1, 1, 1, 2, 7};
    return S[r];
  }

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

  // Строка 5x7, левый верхний угол в (x, y)
  void drawText57(const char* str, int x, int y, int scale, uint16_t color) {
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

 public:
  // --- текст ----------------------------------------------------------------
  // Строки ставятся по базовой линии: у разных шрифтов разные поля над
  // заглавными, и верхний край строки на AMOLED и на C3 означал бы разное.

  int capHeight(TextRole r) const {
#ifdef BOARD_SMOOTH
    return capOf(r);
#else
    return 7 * scale57(r);
#endif
  }

  int lineHeight(TextRole r) const {
#ifdef BOARD_SMOOTH
    return faces()[r].font.yAdvance;
#else
    return 8 * scale57(r);
#endif
  }

  int textWidth(const char* s, TextRole r) {
#ifdef BOARD_SMOOTH
    _gfx->setFont(face(r));
    _gfx->setTextSize(1);
    return _gfx->textWidth(s);
#else
    return text57Width(s, scale57(r));
#endif
  }

  void textLeft(const char* s, int x, int baseline, TextRole r, uint16_t color) {
#ifdef BOARD_SMOOTH
    _gfx->setFont(face(r));
    _gfx->setTextSize(1);
    _gfx->setTextDatum(lgfx::v1::baseline_left);
    _gfx->setTextColor(color);
    _gfx->drawString(s, x, baseline);
#else
    drawText57(s, x, baseline - capHeight(r), scale57(r), color);
#endif
  }

  // По центру cx
  void text(const char* s, int cx, int baseline, TextRole r, uint16_t color) {
    textLeft(s, cx - textWidth(s, r) / 2, baseline, r, color);
  }

  // Заглавные отцентрованы по вертикали на cy: так подпись встаёт вровень с
  // глифом, центр которого тоже в cy
  void textMid(const char* s, int cx, int cy, TextRole r, uint16_t color) {
    text(s, cx, cy + capHeight(r) / 2, r, color);
  }
  void textMidLeft(const char* s, int x, int cy, TextRole r, uint16_t color) {
    textLeft(s, x, cy + capHeight(r) / 2, r, color);
  }

  // Полуширина полезной области на высоте y: экран круглый, у краёв строка
  // короче. Радиус взят меньше обода, чтобы текст не притирался к кольцу.
  static int halfWidthAt(int y) {
    int dy = y - layout::CY;
    int r = layout::px(112);
    if (dy <= -r || dy >= r) return 0;
    return (int)sqrt((double)(r * r - dy * dy));
  }

  // Сколько строк абзаца помещается между yTop и yBottom
  int linesFit(TextRole r, int yTop, int yBottom) const {
    return (yBottom - yTop) / lineHeight(r);
  }

  // Абзац с переносом по словам, вписанный в круг. skipLines пропускает первые
  // строки — так листается длинный текст. Возвращает, сколько строк вышло
  // всего, включая непоказанные: по этому числу считается прокрутка.
  int drawParagraph(const char* str, int yTop, int yBottom, TextRole role,
                    uint16_t color, int skipLines) {
    const int lineH = lineHeight(role);
    // Базовая линия ниже верха строки на её выносной элемент: у Inter это
    // верх Й, у растра 5x7 высота заглавной
#ifdef BOARD_SMOOTH
    const int asc = faces()[role].font.maxAscent;
#else
    const int asc = capHeight(role);
#endif
    int y = yTop;
    int lineNo = 0;
    char line[160];
    int len = 0;
    char probe[160];

    auto flush = [&]() {
      if (len == 0) return;
      line[len] = 0;
      if (lineNo >= skipLines && y + lineH <= yBottom) {
        text(line, layout::CX, y + asc, role, color);
        y += lineH;
      }
      lineNo++;
      len = 0;
    };

    const char* p = str;
    while (*p) {
      while (*p == ' ') p++;
      if (!*p) break;
      const char* w = p;
      while (*w && *w != ' ') w++;
      int bytes = (int)(w - p);
      if (bytes >= (int)sizeof(line) - 2) { p = w; continue; }

      // Ширина считается для той строки, куда слово ляжет: у круга каждая
      // строка своей длины, и мерить по текущей высоте нельзя
      int probeY = (lineNo >= skipLines) ? y : yTop;
      int maxW = 2 * halfWidthAt(probeY + lineH / 2);
      if (maxW < layout::px(40)) maxW = layout::px(40);

      if (len > 0) {
        memcpy(probe, line, len);
        probe[len] = ' ';
        memcpy(probe + len + 1, p, bytes);
        probe[len + 1 + bytes] = 0;
        if (len + 1 + bytes >= (int)sizeof(line) - 1 || textWidth(probe, role) > maxW)
          flush();
      }
      if (len > 0) line[len++] = ' ';
      memcpy(line + len, p, bytes);
      len += bytes;
      p = w;
    }
    flush();
    return lineNo;
  }

  // Иконка сферы с центром в (cx, cy). size — сторона в координатах 240x240.
  // slash перечёркивает: оранжевая диагональ означает «не для этого дня».
  // Оранжевый, а не красный, чтобы не спорить с красным номером осторожных дней
  void drawIcon(int idx, int cx, int cy, uint16_t color, bool slash) {
    if (idx < 0 || idx >= lunardays::ICON_COUNT) return;
#ifdef BOARD_SMOOTH
    drawSymbol(ICON_BASE + idx, cx, cy, color, F_ICON);
#else
    const int scale = 2;
    const uint16_t* g = lunardays::icons13() + idx * 13;
    int x0 = cx - 13 * scale / 2, y0 = cy - 13 * scale / 2;
    for (int row = 0; row < 13; row++)
      for (int col = 0; col < 13; col++)
        if (g[row] & (1u << (12 - col)))
          _gfx->fillRect(x0 + col * scale, y0 + row * scale, scale, scale, color);
#endif
    if (slash) {
      int r = layout::px(16);
      line(cx - r, cy + r, cx + r, cy - r, active().warn, 2.0f);
    }
  }

 #ifdef BOARD_SMOOTH
  // Иконка пункта меню из того же шрифта Material Symbols, что и сферы
  void drawMenuIcon(int idx, int cx, int cy, uint16_t color) {
    drawSymbol(ICON_BASE + MENU_ICON_FIRST + idx, cx, cy, color, F_ICON);
  }
#endif

 private:
  // Знак зодиака: растр 13x13 из glyphs.h на C3, символ Noto на AMOLED
  void drawSignGlyph(int index, int x, int y, uint16_t color) {
    if (index < 0 || index > 11) return;
#ifdef BOARD_SMOOTH
    drawSymbol(0x2648 + index, x, y, color, F_SYM);
#else
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
#endif
  }

 public:
  // Знак вне кольца: легенде нужен образец глифа рядом с подписью
  void drawSign(int index, int x, int y, uint16_t color) {
    drawSignGlyph(index, x, y, color);
  }

  explicit AstroUI(lgfx::v1::LovyanGFX* gfx) : _gfx(gfx) {}

  // Цель отрисовки меняется на спрайт, когда тот удалось создать
  void setTarget(lgfx::v1::LovyanGFX* gfx) { _gfx = gfx; }
  lgfx::v1::LovyanGFX* target() const { return _gfx; }

  // Фаза дыхания кольца VoC, 0..1. Задаётся перед отрисовкой кадра, чтобы
  // кольцо в спрайте совпадало по яркости с прямой подрисовкой pulseVoidRing()
  void setVoidBright(float b) { _voidBright = b; }
  void setMoonSignIndex(int index) { _moonSignIndex = index; }
  void setMoonPhase(float phase) { _moonPhase = phase; }
  void setMoonWaxing(bool waxing) { _moonWaxing = waxing; }
  void setAscendant(float asc) { _ascendant = asc; }
  Theme current() const { return active(); }

  // Живая палитра: тема и цвета знаков считаются снаружи из положения светил
  void useLive(const Theme& t, const uint16_t* signColors) {
    _liveTheme = t;
    _signColors = signColors;
  }

  // Засечка куспида в свободном кольце между натальными и транзитными
  // глифами. Угловые куспиды длиннее: их читают первыми
  void drawCusp(float lonDeg, uint16_t color, bool angular) {
    float a = getAngle(lonDeg);
    float r0 = layout::px(angular ? 65 : 66);
    float r1 = layout::px(angular ? 77 : 71);
    line(polarX(r0, a), polarY(r0, a), polarX(r1, a), polarY(r1, a), color,
         angular ? 1.3f : 1.0f);
  }

  void drawWheel() {
    Theme t = active();
    _gfx->fillScreen(t.bg);

    uint16_t ringCol = dim(t.ring, 1, 3);
    circle(layout::CX, layout::CY, layout::R_RING_OUT, ringCol);
    circle(layout::CX, layout::CY, layout::R_RING_IN, ringCol);
    circle(layout::CX, layout::CY, layout::R_NATAL_RING, dim(t.ring, 1, 5));

    for (int i = 0; i < 12; i++) {
      float radLine = getAngle(i * 30.0f);
      line(polarX(layout::R_RING_IN, radLine), polarY(layout::R_RING_IN, radLine),
           polarX(layout::R_RING_OUT, radLine), polarY(layout::R_RING_OUT, radLine),
           ringCol);

      float radGlyph = getAngle(i * 30.0f + 15.0f);
      int tx = polarX(layout::R_SIGN, radGlyph);
      int ty = polarY(layout::R_SIGN, radGlyph);

      // Знак красится собственной долготой, поэтому кольцо становится плавным
      // цветовым кругом. Пока палитра не собрана, остаётся стихия по кругу
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

  // Центр глифа транзитной планеты. Снаружи нужен подрисовке кольца VoC: ей
  // надо знать, какой кусок кадра сохранить
  void transitPoint(float degree, int* x, int* y) const {
    float rad = getAngle(degree);
    *x = polarX(layout::R_TRANSIT, rad);
    *y = polarY(layout::R_TRANSIT, rad);
  }

  // Транзитная планета на внешнем кольце. Ретроградность помечается точкой
  // под глифом: буква R на пяти пикселях нечитаема.
  void drawTransit(int body, float degree, uint16_t color, bool retro, bool highlight) {
    int x, y;
    transitPoint(degree, &x, &y);
    if (highlight) circle(x, y, layout::px(8), dim(color, 1, 2));
    drawPlanetGlyph(body, x, y, color);
    if (retro) dot(x, y + layout::px(8), layout::px(1), color);
  }

  // Кольцо безкурсовой Луны в кадре. Отдельно от drawTransit(), потому что
  // туда цвет приходит уже приглушённым разведением наложившихся глифов, а
  // прямая подрисовка pulseVoidRing() красит полным — при чередовании глифов
  // кольцо мигало в каждом втором слоте. Фаза дыхания та же, что у подрисовки
  void drawVoidRing(float degree, uint16_t color) {
    int x, y;
    transitPoint(degree, &x, &y);
    voidRingAt(x, y, color, _voidBright);
  }

  // Радиус, которого кольцу VoC хватает с запасом на сглаживание
  static int voidRingExtent() { return layout::px(11) + 3; }

  // Плавная яркость, а не пять ступеней dim(): на двадцати шагах за период
  // ступени читались как рывки. Рисует в текущую цель, координаты в ней
  void voidRingAt(int x, int y, uint16_t color, float bright) {
    uint16_t c = fade(color, 0.25f + 0.75f * bright);
    circle(x, y, layout::px(10), c);
    circle(x, y, layout::px(11), fade(c, 0.4f));
  }

  // Натальная планета на внутреннем кольце, приглушённая: она фон, а событие
  // происходит снаружи.
  // Приглушение три пятых, а не две: на двух пятых Меркурий и Сатурн выходили
  // цветом 0x3131 — почти чёрным на чёрном, и тонкие детали начертаний (рожки,
  // перекладина) тонули, отчего глиф читался бесформенным пятном. Натал всё
  // ещё заметно тусклее транзита, но остаётся глифом, а не кляксой.
  void drawNatal(int body, float degree, uint16_t color) {
    float rad = getAngle(degree);
    drawPlanetGlyph(body, polarX(layout::R_NATAL, rad), polarY(layout::R_NATAL, rad),
                    dim(color, 3, 5));
  }

  // Угловая точка натала: асцендент и МС рисуются засечкой, а не глифом.
  void drawNatalAngle(float degree, uint16_t color, bool isAsc) {
    float rad = getAngle(degree);
    int r0 = layout::R_NATAL - layout::px(6), r1 = layout::R_NATAL_RING;
    line(polarX(r0, rad), polarY(r0, rad), polarX(r1, rad), polarY(r1, rad), color);
    if (isAsc) {
      int rt = layout::R_NATAL - layout::px(10);
      dot(polarX(rt, rad), polarY(rt, rad), layout::px(2), color);
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
    const int r0 = layout::R_NATAL + layout::px(6);
    const int r1 = layout::R_TRANSIT - layout::px(7);
    int x0 = polarX(r0, rn), y0 = polarY(r0, rn);
    int x1 = polarX(r1, rt), y1 = polarY(r1, rt);
#ifdef BOARD_SMOOTH
    // Одна линия двойной толщины вместо двух соседних
    line(x0, y0, x1, y1, c, 2.0f);
#else
    _gfx->drawLine(x0, y0, x1, y1, c);
    // Вторая линия с боковым сдвигом: одиночный пиксель среди глифов теряется
    int dx = (y1 - y0), dy = -(x1 - x0);
    int len = (int)sqrt((double)(dx * dx + dy * dy));
    if (len > 0) {
      dx = dx / len;
      dy = dy / len;
      _gfx->drawLine(x0 + dx, y0 + dy, x1 + dx, y1 + dy, c);
    }
#endif
  }

  // Линия аспекта между транзитной и натальной точкой. Чем точнее аспект, тем
  // ярче линия: орбис приходит уже нормированным в 0..1, где 0 — точный.
  void drawAspectLink(float transitDeg, float natalDeg, uint16_t color, float slack) {
    float a1 = getAngle(transitDeg), a2 = getAngle(natalDeg);
    uint8_t num = (uint8_t)(5.0f - 4.0f * slack);
    if (num < 1) num = 1;
    uint16_t c = dim(color, num, 5);
    line(polarX(layout::R_ASPECT, a1), polarY(layout::R_ASPECT, a1),
         polarX(layout::R_ASPECT, a2), polarY(layout::R_ASPECT, a2), c);
  }

  // Метка текущего положения Солнца на внешнем ободе: суточная стрелка.
  void drawSunMark(float sunDegree, uint16_t color) {
    float rad = getAngle(sunDegree);
    int r0 = layout::R_RING_OUT, r1 = layout::R_RING_OUT + layout::px(3);
    if (r1 > layout::CX - 1) r1 = layout::CX - 1;
    line(polarX(r0, rad), polarY(r0, rad), polarX(r1, rad), polarY(r1, rad), color, 1.5f);
  }

  // Статусы поверх кадра (OTA, IP, код пейринга) рисуются прямо в панель, в
  // обход спрайта. Панель AMOLED не читается, поэтому здесь только заливки и
  // текст с собственным фоном, без смешивания с тем, что уже на экране
  void drawStatus(const char* status) {
    Theme t = active();
    int y = layout::CY + layout::px(30);
    int w = textWidth(status, TXT_BODY) + layout::px(8);
    int h = lineHeight(TXT_BODY);
    _gfx->fillRect(layout::CX - w / 2, y - h, w, h + layout::px(3), t.bg);
    statusText(status, layout::CX, y - layout::px(2), t.text, t.bg);
  }

  // Поверх колеса: код BLE-пейринга и прочие короткие статусы.
  void drawStatusBanner(const char* status) {
    Theme t = active();
    const int cx = layout::CX;
    const int cy = layout::CY + layout::px(36);
    const int hw = layout::px(54), hh = layout::px(10), rr = layout::px(6);
    _gfx->fillRoundRect(cx - hw, cy - hh, 2 * hw, 2 * hh, rr, t.bg);
    _gfx->drawRoundRect(cx - hw, cy - hh, 2 * hw, 2 * hh, rr, t.accent);
    statusText(status, cx, cy + capHeight(TXT_BODY) / 2, t.text, t.bg);
  }

 private:
  void statusText(const char* s, int cx, int baseline, uint16_t fg, uint16_t bg) {
#ifdef BOARD_SMOOTH
    _gfx->setFont(face(F_BODY));
    _gfx->setTextSize(1);
    _gfx->setTextDatum(lgfx::v1::baseline_center);
    _gfx->setTextColor(fg, bg);
    _gfx->drawString(s, cx, baseline);
#else
    // Статусы латиницей («paired», IP), а растр 5x7 её не знает
    _gfx->setFont(&lgfx::v1::fonts::Font0);
    _gfx->setTextDatum(lgfx::v1::baseline_center);
    _gfx->setTextColor(fg, bg);
    _gfx->drawString(s, cx, baseline);
#endif
  }
};

#endif
