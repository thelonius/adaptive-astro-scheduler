#include <Arduino.h>
#include <Preferences.h>
#include <time.h>

#include "board.h"
#include "AstroUI.h"
#include "periph.h"
#include "gesture.h"
#include "collide.h"
#include "config.h"
#include "ephemeris.h"
#include "lunar.h"
#include "palette.h"
#include "transits.h"
#include "transittext.h"

#ifdef ASTRO_USE_WIFI
#include <WiFi.h>
#endif
#ifdef ASTRO_ENABLE_OTA
#include <ArduinoOTA.h>
#endif

#include "ble.h"
#ifdef ASTRO_USE_WIFI
#include "wifi_task.h"
#include "wifi_nvs.h"
#endif

static LGFX tft;
static LGFX_Sprite canvas(&tft);
static bool useCanvas = false;
static AstroUI ui(&tft);
static Preferences prefs;

using layout::px;

#ifdef BOARD_SMOOTH
// Стек loop() 24 КБ вместо 8. VLW-шрифт кладёт на стек буфер под строку
// глифа, и номер лунного дня кеглем 112 px съедает на это около 6 КБ: вместе
// с цепочкой тап, меню, календарь стек переполнялся, и часы перезагружались
SET_LOOP_TASK_STACK_SIZE(24 * 1024);
#endif

// Экран «небо» без наталa уступил место толкованиям: карта без аспектов
// дублировала биwheel, а текст даёт то, чего на кольцах не прочитать.
// Порядок совпадает с каруселью свайпов: колесо домашнее, легенда справочная
// и потому в конце
// Меню стоит за пределами карусели: в него попадают с циферблата тапом или
// кнопкой, а не свайпом, и на C3 с одной кнопкой его нет вовсе
enum Mode { MODE_BIWHEEL = 0, MODE_TEXT, MODE_LIST, MODE_CAL, MODE_LEGEND, MODE_COUNT,
            MODE_MENU = MODE_COUNT, MODE_TOUCHTEST };
static int mode = MODE_BIWHEEL;

static transit::NatalChart natal;
static transit::Hit hits[24];
static int hitCount = 0;
static bool moonVoid = false;

// Смещение календаря в днях вперёд: двойной клик листает, выход из режима
// сбрасывает на сегодня
static int calOffset = 0;
static palette::Live live;

// Разведение наложившихся глифов. Слот — сколько одно тело держится наверху,
// прежде чем уступить соседу по группе. Флаг выставляется отрисовкой колеса и
// включает учащённую перерисовку: гонять кадр вчетверо чаще имеет смысл только
// когда на кольце реально есть что разводить.
static constexpr float GLYPH_PX = (float)layout::GLYPH;
static constexpr unsigned long SWAP_SLOT_MS = 2000UL;
static bool wheelHasOverlap = false;

// Экран толкований: какой транзит показан и на сколько строк промотан
static int textIndex = 0;
static int textScroll = 0;
static int textLines = 0;
// Экран погашен кнопкой: панель спит, кадры не выводятся, расчёты идут
static bool screenOff = false;
// Лента плавной прокрутки устарела: сменились транзиты или палитра
static bool textDocDirty = true;

// Легенда: страница. Клик листает, после последней уходит в следующий режим
static int legendPage = 0;
static constexpr int LEGEND_PAGES = 4;

// Цвет тела приходит из живой палитры по его эклиптической долготе:
// собственной таблицы цветов у прошивки больше нет.

static const char* PLANET_SHORT[ephem::BODY_COUNT] = {
    "So", "Lu", "Me", "Ve", "Ma", "Ju", "Sa", "Ur", "Ne", "Pl"};

static const char* NATAL_SHORT[transit::NATAL_POINTS] = {
    "So", "Lu", "Me", "Ve", "Ma", "Ju", "Sa", "Ur", "Ne", "Pl", "As", "MC"};

// --- время -----------------------------------------------------------------

// Проверено ли время внешним источником. Восстановленное из NVS считается
// правдоподобным, но не проверенным: во втулке оно помечается тильдой.
static bool timeSynced = false;
static bool timeRestored = false;

// Часы теряют время при отключении питания: батарейки нет. Раз в час текущее
// значение уходит в NVS, при старте берётся большее из сохранённого и момента
// сборки. Выдернутые из розетки часы отстанут на время простоя, а не на время
// с момента прошивки.
#ifndef TIME_SAVE_PERIOD_MS
#define TIME_SAVE_PERIOD_MS 3600000UL
#endif

static void persistTime() {
  time_t now = time(nullptr);
  if (now > 1700000000) prefs.putULong64("t", (uint64_t)now);
}

// Время из RTC платы, если он есть и не терял питание. Раньше NVS: RTC идёт,
// пока часы выключены, а NVS помнит только момент последнего сохранения
static bool timeFromRtc = false;

static void restoreTime() {
  uint64_t saved = prefs.getULong64("t", 0);
  time_t start = (time_t)BUILD_UNIX_TIME;
  if ((time_t)saved > start) {
    start = (time_t)saved;
    timeRestored = true;
  }
#ifdef BOARD_HAS_RTC
  time_t fromRtc = periph::rtc::read();
  Serial.printf("RTC: %s\n", fromRtc ? "время есть" : "пуст или терял питание");
  if (fromRtc > start) {
    start = fromRtc;
    timeFromRtc = true;
  }
#endif
  struct timeval tv;
  tv.tv_sec = start;
  tv.tv_usec = 0;
  settimeofday(&tv, nullptr);
}

static double currentJD() {
  time_t now = time(nullptr);
  return ephem::julianDayFromUnix((long long)now);
}

// --- мостик к BLE ------------------------------------------------------

// wifi_task.h и ble.h не знают друг о друге и не знают про AstroUI: обе связи
// проходят здесь, единственном месте, куда стянуты все #ifdef ASTRO_USE_WIFI

// Статус пейринга рисуем поверх спрайта прямо в панель: иначе drawStatus()
// пишет в off-screen буфер и следующий render() его стирает — отсюда «мигание».
static char gStatusOverlay[20] = "";
static unsigned long gStatusClearAt = 0;
static void render();

static void paintStatusOverlay() {
  if (!gStatusOverlay[0]) return;
  if (gStatusClearAt && millis() > gStatusClearAt) {
    gStatusOverlay[0] = '\0';
    render();
    return;
  }
  ui.setTarget(&tft);
  tft.startWrite();
  ui.drawStatusBanner(gStatusOverlay);
  tft.endWrite();
  if (useCanvas)
    ui.setTarget(&canvas);
  else
    ui.setTarget(&tft);
}

static void setStatusOverlay(const char* s, unsigned long showMs) {
  strncpy(gStatusOverlay, s, sizeof(gStatusOverlay) - 1);
  gStatusOverlay[sizeof(gStatusOverlay) - 1] = '\0';
  gStatusClearAt = showMs ? millis() + showMs : 0;
  Serial.printf("BLE status: %s\n", gStatusOverlay);
  paintStatusOverlay();
}

static void bleStatusText(const char* s) {
  unsigned long showMs = 8000;
  if (strncmp(s, "BLE ", 4) == 0)
    showMs = 120000;
  else if (strcmp(s, "paired") == 0)
    showMs = 5000;
  else if (strcmp(s, "pair fail") == 0)
    showMs = 10000;
  setStatusOverlay(s, showMs);
}

#ifdef ASTRO_USE_WIFI
static uint8_t wifiStatusByte() {
#if defined(ASTRO_ENABLE_OTA)
  return 5;
#else
  if (!wifitask::hasCredentials()) return 5;
  return (uint8_t)wifitask::status();
#endif
}
static void wifiCommand(uint8_t cmd) {
  if (cmd == 0x01) {
    wifitask::requestOn(/*hold=*/true);
  } else if (cmd == 0x00) {
    wifitask::requestOff();
  }
}
static void wifiConfig(uint8_t opcode, const uint8_t* payload, size_t len) {
  wifitask::handleConfig(opcode, payload, len);
}
#else
static uint8_t wifiStatusByte() { return 5; }  // UNSUPPORTED, см. ble-protocol.md
static void wifiCommand(uint8_t) {}
static void wifiConfig(uint8_t, const uint8_t*, size_t) {}
#endif

#if defined(ASTRO_USE_WIFI) && defined(ASTRO_ENABLE_OTA)
// OTA-сборка держит WiFi включённым весь аптайм (см. wifi_task.h,
// requestOff() там no-op) — эту разовую настройку логично оставить в
// main.cpp, а не тащить ArduinoOTA внутрь wifi_task.h ради одного env
static void setupOta() {
  ArduinoOTA.setHostname("astroclock");
  if (strlen(OTA_PASS) > 0) ArduinoOTA.setPassword(OTA_PASS);
  ArduinoOTA.onStart([]() {
    tft.startWrite();
    ui.drawStatus("OTA...");
    tft.endWrite();
  });
  ArduinoOTA.onEnd([]() {
    tft.startWrite();
    ui.drawStatus("OTA ok");
    tft.endWrite();
  });
  ArduinoOTA.onError([](ota_error_t) {
    tft.startWrite();
    ui.drawStatus("OTA fail");
    tft.endWrite();
  });
  ArduinoOTA.begin();
  ui.drawStatus(WiFi.localIP().toString().c_str());
  delay(2500);
}
#endif

// --- расчёт ----------------------------------------------------------------

// Цвет аспекта из живой палитры. transit::aspectColor() остался опорным
// набором на случай, если палитра ещё не собрана.
static uint16_t aspectColor(uint8_t kind) {
  return kind < 5 ? live.aspect[kind] : transit::aspectColor(kind);
}

// Живая палитра пересобирается вместе с картой: управитель часа меняется раз
// в час, но модуляция от аспектов ползёт непрерывно.
static void applyPalette(double jd) {
  palette::compute(jd, HOME_LAT, HOME_LON, &live);
  Theme t;
  t.bg = live.bg;
  t.ring = live.border;
  t.text = live.text;
  t.fire = live.sign[0];
  t.earth = live.sign[1];
  t.air = live.sign[2];
  t.water = live.sign[3];
  t.muted = live.muted;
  t.accent = live.accent;
  t.warn = live.warn;
  t.good = live.good;
  ui.useLive(t, live.sign);
}

static uint16_t bodyColor(int b) { return live.body[b]; }

static void recompute() {
  double jd = currentJD();
  ui.setAscendant((float)ephem::ascendant(jd, HOME_LAT, HOME_LON));
  ui.setMoonPhase((float)ephem::moonIllumination(jd));
  ui.setMoonWaxing(ephem::moonWaxing(jd));
  ui.setMoonSignIndex((int)(ephem::longitude(ephem::MOON, jd) / 30.0));
  moonVoid = transit::moonIsVoid(jd);
  hitCount = transit::find(natal, jd, hits, (int)(sizeof(hits) / sizeof(hits[0])));
  // Состав транзитов сменился, прежняя позиция листания указывает не туда
  if (textIndex >= hitCount) textIndex = 0;
  textScroll = 0;
  applyPalette(jd);
  textDocDirty = true;
}

// --- отрисовка -------------------------------------------------------------
// Координаты ниже заданы для экрана 240x240 и пересчитываются через px(), см.
// layout в AstroUI.h. Строки ставятся по базовой линии.

// Фаза дыхания кольца VoC, период 2.4 с. Одна на кадр и на прямую подрисовку,
// иначе они спорят за яркость кольца
static float voidBreath() {
  float phase = (float)(millis() % 2400UL) / 2400.0f;
  return 0.5f + 0.5f * sinf(phase * 6.28318530718f);
}

#ifdef BOARD_SMOOTH
// Дыхание кольца VoC на AMOLED. Сглаженное кольцо смешивается с фоном, а
// панель фон не отдаёт, поэтому подрисовка поверх уже выведенного кадра, как
// на C3, накапливала бы яркость. Вместо этого кусок кадра под кольцом
// сохраняется до того, как кольцо в него легло, и каждый такт кольцо
// рисуется заново поверх сохранённого фона в маленький спрайт.
static LGFX_Sprite voidBg(&tft);
static LGFX_Sprite voidPatch(&tft);
static bool voidBgValid = false;
static int voidX0 = 0, voidY0 = 0, voidCx = 0, voidCy = 0;

static void captureVoidBg(float moonLon) {
  // Чётные координаты и размеры окна: SH8601 и CO5300 пишут столбцы парами
  const int box = (AstroUI::voidRingExtent() * 2 + 3) & ~1;
  if (voidBg.width() == 0) {
    voidBg.setPsram(true);
    voidPatch.setPsram(true);
    voidBg.setColorDepth(16);
    voidPatch.setColorDepth(16);
    if (!voidBg.createSprite(box, box) || !voidPatch.createSprite(box, box)) return;
  }
  ui.transitPoint(moonLon, &voidCx, &voidCy);
  voidX0 = (voidCx - box / 2) & ~1;
  voidY0 = (voidCy - box / 2) & ~1;
  canvas.pushSprite(&voidBg, -voidX0, -voidY0);
  voidBgValid = true;
}
#endif

static void renderBiwheel() {
  double jd = currentJD();
  unsigned long ms = millis();
  ui.setVoidBright(voidBreath());
  tft.startWrite();
  ui.drawWheel();

  // Натальный слой первым: он фон для происходящего снаружи. Наложившиеся
  // глифы разводятся по времени, но гаснут слабее транзитных: натал и так
  // приглушён, и вторая ступень затемнения увела бы его в фон совсем
  float nLons[ephem::BODY_COUNT];
  for (int b = 0; b < ephem::BODY_COUNT; b++) nLons[b] = (float)natal.lon[b];
  collide::Groups nGrp;
  collide::build(nLons, ephem::BODY_COUNT, layout::R_NATAL, GLYPH_PX, &nGrp);
  for (int pass = 0; pass < 2; pass++)
    for (int b = 0; b < ephem::BODY_COUNT; b++) {
      bool top = collide::onTop(nGrp, b, ms, SWAP_SLOT_MS);
      if (top != (pass == 1)) continue;  // верхние вторым проходом
      float k = collide::level(nGrp, b, ms, SWAP_SLOT_MS, 0.7f);
      ui.drawNatal(b, nLons[b], AstroUI::fade(bodyColor(b), k));
    }

  // Куспиды домов. Угловые — первый, четвёртый, седьмой, десятый — длиннее и
  // ярче: карту читают от них
  for (int i = 0; i < 12; i++) {
    bool angular = (i % 3 == 0);
    uint16_t c = palette::positional(natal.cusp[i], angular ? 0.72f : 0.52f,
                                     angular ? 0.13f : 0.07f);
    ui.drawCusp((float)natal.cusp[i], c, angular);
  }

  // Линии аспектов, самые точные ярче
  for (int i = 0; i < hitCount; i++) {
    const transit::Hit& h = hits[i];
    float slack = h.orb / transit::aspectDefs()[h.kind].orb;
    float tLon = (float)ephem::longitude((ephem::Body)h.transiting, jd);
    float nLon = (float)natal.lon[h.natalPoint];
    if (h.kind == transit::CONJUNCTION)
      ui.drawConjunctionLink(tLon, nLon, aspectColor(h.kind), slack);
    else
      ui.drawAspectLink(tLon, nLon, aspectColor(h.kind), slack);
  }

  // Транзитные планеты, участники аспектов обведены кружком
  float tLons[ephem::BODY_COUNT];
  for (int b = 0; b < ephem::BODY_COUNT; b++)
    tLons[b] = (float)ephem::longitude((ephem::Body)b, jd);
  collide::Groups tGrp;
  collide::build(tLons, ephem::BODY_COUNT, layout::R_TRANSIT, GLYPH_PX, &tGrp);
  wheelHasOverlap = tGrp.any || nGrp.any;

  for (int pass = 0; pass < 2; pass++)
    for (int b = 0; b < ephem::BODY_COUNT; b++) {
      bool top = collide::onTop(tGrp, b, ms, SWAP_SLOT_MS);
      if (top != (pass == 1)) continue;
      bool involved = false;
      for (int i = 0; i < hitCount && !involved; i++)
        involved = (hits[i].transiting == b);
      float k = collide::level(tGrp, b, ms, SWAP_SLOT_MS, 0.3f);
      // Обводка аспекта только у верхнего: под чужим глифом она читалась бы
      // как принадлежащая ему
      ui.drawTransit(b, tLons[b], AstroUI::fade(bodyColor(b), k),
                     ephem::isRetrograde((ephem::Body)b, jd), involved && top);
    }

  ui.drawSunMark(tLons[ephem::SUN], bodyColor(ephem::SUN));

  if (moonVoid) {
#ifdef BOARD_SMOOTH
    if (useCanvas) captureVoidBg(tLons[ephem::MOON]);
#endif
    ui.drawVoidRing(tLons[ephem::MOON], bodyColor(ephem::MOON));
  }
  tft.endWrite();
}

// Легенда в четыре страницы: планеты, аспекты, устройство колец, состояния.
// На биwheel всё это голые значки без подписи, и без разбора его не прочитать.
// Раскладка строками: образец слева, название и пояснение справа.

// Строка легенды: заголовок над пояснением, оба выровнены по левому краю.
// Образец рисует вызывающий в точке (LEGEND_SAMPLE_X, y)
static constexpr int LEGEND_SAMPLE_X = layout::CX - px(70);
static constexpr int LEGEND_TEXT_X = layout::CX - px(58);

static void legendRow(int y, const char* name, const char* hint) {
  Theme th = ui.current();
  ui.textLeft(name, LEGEND_TEXT_X, y - px(1), TXT_BODY, th.text);
  if (hint)
    ui.textLeft(hint, LEGEND_TEXT_X, y + px(8), TXT_SMALL, AstroUI::fade(th.text, 0.6f));
}

static void legendPlanets(lgfx::v1::LovyanGFX* g) {
  (void)g;
  Theme th = ui.current();
  static const char* NAMES[ephem::BODY_COUNT] = {
      "СОЛНЦЕ", "ЛУНА", "МЕРКУРИЙ", "ВЕНЕРА", "МАРС",
      "ЮПИТЕР", "САТУРН", "УРАН", "НЕПТУН", "ПЛУТОН"};
  // Две колонки по пять: одной колонкой десять строк в круг не встают
  for (int b = 0; b < ephem::BODY_COUNT; b++) {
    int col = b / 5, row = b % 5;
    int gx = col == 0 ? layout::CX - px(66) : layout::CX + px(8);
    int y = px(52 + row * 24);
    ui.drawPlanetGlyph(b, gx, y, bodyColor(b));
    ui.textMidLeft(NAMES[b], gx + px(10), y, TXT_SMALL, th.text);
  }
  ui.text("цвет: градус эклиптики", layout::CX, px(187), TXT_SMALL,
          AstroUI::fade(th.text, 0.6f));
}

static void legendAspects(lgfx::v1::LovyanGFX* g) {
  (void)g;
  Theme th = ui.current();
  static const char* NAMES[transit::ASPECT_KINDS] = {
      "СОЕДИНЕНИЕ 0", "СЕКСТИЛЬ 60", "КВАДРАТ 90", "ТРИН 120", "ОППОЗИЦИЯ 180"};
  static const char* HINTS[transit::ASPECT_KINDS] = {
      "слияние, усиление", "лёгкая поддержка", "трение, напряжение",
      "гармония, поток", "противостояние"};
  for (int k = 0; k < transit::ASPECT_KINDS; k++) {
    int y = px(50 + k * 30);
    ui.drawAspectGlyph(k, LEGEND_SAMPLE_X - px(6), y, aspectColor(k), 7);
    legendRow(y, NAMES[k], HINTS[k]);
  }
  ui.text("линия ярче: аспект точнее", layout::CX, px(207), TXT_SMALL,
          AstroUI::fade(th.text, 0.6f));
}

static void legendRings(lgfx::v1::LovyanGFX* g) {
  Theme th = ui.current();
  const int SX = LEGEND_SAMPLE_X;
  int y = px(44);
  const int STEP = px(25);

  ui.drawSign(0, SX, y, live.sign[0]);
  legendRow(y, "ЗНАКИ", "внешнее кольцо");
  y += STEP;

  ui.drawPlanetGlyph(ephem::MARS, SX, y, bodyColor(ephem::MARS));
  legendRow(y, "ТРАНЗИТ", "среднее кольцо, ярко");
  y += STEP;

  ui.drawPlanetGlyph(ephem::MARS, SX, y, AstroUI::fade(bodyColor(ephem::MARS), 0.6f));
  legendRow(y, "НАТАЛ", "внутри, тускло");
  y += STEP;

  ui.line(SX - px(7), y + px(5), SX + px(7), y - px(5), aspectColor((uint8_t)transit::TRINE));
  legendRow(y, "АСПЕКТ", "линия через центр");
  y += STEP;

  ui.line(SX, y - px(6), SX, y + px(6), th.muted);
  legendRow(y, "КУСПИД ДОМА", "засечка меж колец");
  y += STEP;

  ui.line(SX - px(8), y + px(4), SX + px(8), y + px(4), AstroUI::fade(th.ring, 0.5f));
  ui.line(SX, y + px(4), SX, y - px(3), bodyColor(ephem::SUN), 1.5f);
  legendRow(y, "СОЛНЦЕ", "метка на ободе, сутки");
  y += STEP;

  ui.circle(SX, y, px(6), th.muted);
  ui.dot(SX - px(6), y, px(2), th.accent);
  legendRow(y, "АСЦЕНДЕНТ", "всегда слева");
  (void)g;
}

static void legendStates(lgfx::v1::LovyanGFX* g) {
  Theme th = ui.current();
  const int SX = LEGEND_SAMPLE_X;
  int y = px(44);
  const int STEP = px(25);

  ui.drawPlanetGlyph(ephem::MERCURY, SX, y, bodyColor(ephem::MERCURY));
  ui.dot(SX, y + px(8), px(1), bodyColor(ephem::MERCURY));
  legendRow(y, "РЕТРОГРАД", "точка под глифом");
  y += STEP;

  ui.circle(SX, y, px(8), AstroUI::fade(bodyColor(ephem::VENUS), 0.5f));
  ui.drawPlanetGlyph(ephem::VENUS, SX, y, bodyColor(ephem::VENUS));
  legendRow(y, "В АСПЕКТЕ", "обведён кружком");
  y += STEP;

  ui.drawPlanetGlyphByIndex(glyphs::PG_MOON_WAX, SX, y, bodyColor(ephem::MOON));
  ui.voidRingAt(SX, y, bodyColor(ephem::MOON), 0.6f);
  legendRow(y, "ЛУНА БЕЗ КУРСА", "кольцо, оно дышит");
  y += STEP;

  ui.drawPlanetGlyphByIndex(glyphs::PG_MOON_WAX, SX, y, bodyColor(ephem::MOON));
  legendRow(y, "ЛУНА РАСТЁТ", "свет справа");
  y += STEP;

  ui.drawPlanetGlyphByIndex(glyphs::PG_MOON_WANE, SX, y, bodyColor(ephem::MOON));
  legendRow(y, "ЛУНА УБЫВАЕТ", "свет слева");
  y += STEP;

  uint16_t cc = aspectColor((uint8_t)transit::CONJUNCTION);
  ui.line(SX - px(6), y + px(6), SX + px(6), y - px(6), cc, 2.0f);
  legendRow(y, "СОЕДИНЕНИЕ", "перемычка меж колец");
  y += STEP;

  g->fillRect(SX - px(6), y - px(6), px(13), px(13), live.surface);
  ui.dot(SX, y, px(3), th.accent);
  legendRow(y, "ФОН И АКЦЕНТ", "управители дня и часа");
}

static lgfx::v1::LovyanGFX* target() {
  return useCanvas ? (lgfx::v1::LovyanGFX*)&canvas : (lgfx::v1::LovyanGFX*)&tft;
}

static void renderLegend() {
  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = target();
  wheelHasOverlap = false;
  tft.startWrite();
  g->fillScreen(th.bg);

  static const char* TITLES[LEGEND_PAGES] = {"ПЛАНЕТЫ", "АСПЕКТЫ", "КОЛЬЦА",
                                             "СОСТОЯНИЯ"};
  if (legendPage >= LEGEND_PAGES) legendPage = 0;
  ui.text(TITLES[legendPage], layout::CX, px(23), TXT_HEAD, th.accent);

  switch (legendPage) {
    case 0: legendPlanets(g); break;
    case 1: legendAspects(g); break;
    case 2: legendRings(g); break;
    default: legendStates(g); break;
  }

  char pos[8];
  snprintf(pos, sizeof(pos), "%d/%d", legendPage + 1, LEGEND_PAGES);
  ui.text(pos, layout::CX, px(221), TXT_SMALL, AstroUI::fade(th.text, 0.5f));
  tft.endWrite();
}

// Поле абзаца на экране толкований и сколько строк в нём видно разом. Нужно
// и отрисовке, и листанию по кнопке
static constexpr int TEXT_TOP = px(76);
static constexpr int TEXT_BOTTOM = px(214);
static int textPageLines() { return ui.linesFit(TXT_BODY, TEXT_TOP, TEXT_BOTTOM); }

// Шапка толкования: транзитное тело, аспект, натальная точка — теми же
// глифами, что на биwheel, чтобы экран читался тем же языком символов. Под
// ней орбис с направлением и номер транзита
static void drawTextHeader(const transit::Hit& h) {
  Theme th = ui.current();
  uint16_t ac = aspectColor(h.kind);
  const int hy = px(30);
  ui.drawPlanetGlyph(h.transiting, layout::CX - px(46), hy, ac, true);
  ui.drawAspectGlyph(h.kind, layout::CX, hy, ac, 7);
  if (h.natalPoint < ephem::BODY_COUNT)
    ui.drawPlanetGlyph(h.natalPoint, layout::CX + px(46), hy, ac, true);
  else
    ui.textMid(h.natalPoint == 10 ? "АСЦ" : "МС", layout::CX + px(46), hy, TXT_HEAD, ac);

  char sub[32];
  snprintf(sub, sizeof(sub), "%d.%d %s", (int)h.orb, (int)(h.orb * 10) % 10,
           h.applying ? "сходится" : "расходится");
  ui.text(sub, layout::CX, px(55), TXT_SMALL, AstroUI::fade(th.text, 0.6f));

  if (hitCount > 1) {
    char pos[12];
    snprintf(pos, sizeof(pos), "%d/%d", textIndex + 1, hitCount);
    ui.text(pos, layout::CX, px(69), TXT_SMALL, AstroUI::fade(th.text, 0.5f));
  }
}

#ifdef BOARD_SMOOTH
// Плавная прокрутка толкования. Всё толкование вместе с шапкой рисуется один
// раз в высокую ленту в PSRAM, а кадр прокрутки только копирует из неё окно
// высотой в экран: перерисовка текста на каждом шаге стоила бы десятки
// миллисекунд, копирование стоит единицы. Палец тянет ленту, после
// отпускания она едет по инерции и пружинит у краёв.
namespace scroll {
// Самое длинное толкование ~850 знаков, это около тридцати строк
constexpr int DOC_MAX = 1800;
// Ширина колонки: на такой строке верхний и нижний края текста ещё не
// упираются в обод, а там, где упираются, текст уже гаснет
constexpr int COL_W = px(170);
constexpr int FADE = px(36);

static LGFX_Sprite doc(&tft);
static bool valid = false;
static int docH = 0;
static float pos = 0, vel = 0;  // смещение в пикселях и скорость в px/мс
static bool dragging = false;
static int dragY0 = 0;
static float dragPos0 = 0;
static int lastY = 0;
static unsigned long lastT = 0, frameAt = 0;
static float drawnPos = -1;

static int maxPos() { return docH > board::H ? docH - board::H : 0; }

static bool build() {
  if (doc.width() == 0) {
    doc.setPsram(true);
    doc.setColorDepth(16);
    if (!doc.createSprite(board::W, DOC_MAX)) return false;
  }
  Theme th = ui.current();
  doc.fillScreen(th.bg);
  ui.setTarget(&doc);
  if (textIndex >= hitCount) textIndex = 0;
  const transit::Hit& h = hits[textIndex];
  drawTextHeader(h);
  int bottom = ui.drawColumn(transittext::get(h.transiting, h.kind, h.natalPoint),
                             layout::CX - COL_W / 2, TEXT_TOP, COL_W, TXT_BODY, th.text);
  ui.setTarget(target());
  docH = bottom + px(60);
  if (docH < board::H) docH = board::H;
  if (docH > DOC_MAX) docH = DOC_MAX;
  valid = true;
  return true;
}

// Окно ленты в кадр, гашение у краёв и дуга положения справа
static void compose() {
  Theme th = ui.current();
  int ip = (int)lroundf(pos);
  if (ip < 0 || ip > maxPos()) canvas.fillScreen(th.bg);
  doc.pushSprite(&canvas, 0, -ip);
  // Гаснет только тот край, за которым ещё есть текст
  for (int i = 0; i < FADE; i++) {
    uint8_t a = (uint8_t)(255 - 255 * i / FADE);
    if (ip > 2) canvas.fillRectAlpha(0, i, board::W, 1, a, th.bg);
    if (ip < maxPos() - 2) canvas.fillRectAlpha(0, board::H - 1 - i, board::W, 1, a, th.bg);
  }
  int mp = maxPos();
  if (mp > 0) {
    // Дуга у правого края, как у полосы прокрутки на Wear OS: ±24° от
    // горизонтали, бегунок по доле видимого текста
    const float SPAN = 48.0f, A0 = -24.0f;
    const float R = layout::CX - px(5);
    float frac = (float)board::H / docH;
    float t = pos < 0 ? 0 : pos > mp ? 1 : pos / mp;
    float th0 = A0 + (SPAN - SPAN * frac) * t, th1 = th0 + SPAN * frac;
    ui.setTarget(&canvas);
    ui.smoothArc(layout::CX, layout::CY, R, A0, A0 + SPAN, 1.2f, AstroUI::fade(th.text, 0.2f));
    ui.smoothArc(layout::CX, layout::CY, R, th0, th1, 2.6f, AstroUI::fade(th.text, 0.75f));
    ui.setTarget(target());
  }
  drawnPos = pos;
}

static void reset() {
  pos = vel = 0;
  dragging = false;
  valid = false;
}

static bool active() {
  return dragging || vel != 0 || pos < 0 || pos > maxPos();
}

// Шаг анимации: инерция и возврат к краю. Затухание 0.5% скорости на
// миллисекунду, это около 8% за кадр в 16 мс, как SCROLL_THROW у LVGL
static void step(unsigned long dt) {
  if (dragging) return;
  float mp = (float)maxPos();
  if (pos < 0 || pos > mp) {
    float target = pos < 0 ? 0 : mp;
    vel = 0;
    float k = dt * 0.015f;
    if (k > 1) k = 1;
    pos += (target - pos) * k;
    if (fabsf(target - pos) < 0.5f) pos = target;
    return;
  }
  if (vel == 0) return;
  pos += vel * dt;
  vel *= powf(0.995f, (float)dt);
  if (fabsf(vel) < 0.02f) vel = 0;
  // Разогнавшаяся лента проскакивает край чуть-чуть и возвращается
  if (pos < -px(20)) pos = -px(20);
  if (pos > mp + px(20)) pos = mp + px(20);
}
}  // namespace scroll

static void renderText() {
  Theme th = ui.current();
  wheelHasOverlap = false;
  if (hitCount == 0) {
    canvas.fillScreen(th.bg);
    ui.textMid("НЕТ ТРАНЗИТОВ", layout::CX, px(119), TXT_TITLE, th.text);
    return;
  }
  if (textDocDirty) {
    scroll::valid = false;
    textDocDirty = false;
  }
  if (!scroll::valid && !scroll::build()) return;
  scroll::compose();
}
#else
// Толкование одного транзита текстом. Транзиты отсортированы по орбису, так
// что первым идёт самый точный. Прокрутка длинного текста повешена на тот же
// короткий клик: сначала домотать до конца, потом перейти к следующему
// транзиту.
static void renderText() {
  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = target();
  wheelHasOverlap = false;
  tft.startWrite();
  g->fillScreen(th.bg);

  if (hitCount == 0) {
    ui.textMid("НЕТ ТРАНЗИТОВ", layout::CX, px(119), TXT_TITLE, th.text);
    tft.endWrite();
    return;
  }

  if (textIndex >= hitCount) textIndex = 0;
  const transit::Hit& h = hits[textIndex];
  drawTextHeader(h);

  int total = ui.drawParagraph(transittext::get(h.transiting, h.kind, h.natalPoint),
                               TEXT_TOP, TEXT_BOTTOM, TXT_BODY, th.text, textScroll);
  textLines = total;

  // Многоточие снизу, пока текст не домотан до конца
  if (textScroll + textPageLines() < total)
    ui.text("...", layout::CX, px(223), TXT_SMALL, AstroUI::fade(th.text, 0.5f));

  tft.endWrite();
}
#endif

// Список самых точных транзитов. Помещается пять строк.
static void renderList() {
  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = target();
  tft.startWrite();
  g->fillScreen(th.bg);

  char line[24];
  time_t now = time(nullptr);
  struct tm tmv;
  localtime_r(&now, &tmv);
  snprintf(line, sizeof(line), "%02d:%02d  %02d.%02d", tmv.tm_hour, tmv.tm_min,
           tmv.tm_mday, tmv.tm_mon + 1);
  ui.textMid(line, layout::CX, px(46), TXT_HEAD, th.text);

  // Символы вместо букв: транзитная и натальная планета — те же глифы, что
  // на биwheel, аспект — стандартная пиктограмма. Асцендент и середина неба
  // своего глифа не имеют, для них остаётся текст
  int shown = hitCount < 5 ? hitCount : 5;
  for (int i = 0; i < shown; i++) {
    const transit::Hit& h = hits[i];
    int y = px(78 + i * 22);
    uint16_t c = aspectColor(h.kind);

    ui.drawPlanetGlyph(h.transiting, layout::CX - px(55), y, c);
    ui.drawAspectGlyph(h.kind, layout::CX - px(20), y, c, 5);
    if (h.natalPoint < ephem::BODY_COUNT)
      ui.drawPlanetGlyph(h.natalPoint, layout::CX + px(12), y, c);
    else
      ui.textMid(h.natalPoint == 10 ? "АСЦ" : "МС", layout::CX + px(12), y, TXT_SMALL, c);

    snprintf(line, sizeof(line), "%.1f%s", h.orb, h.applying ? "<" : ">");
    ui.textMid(line, layout::CX + px(60), y, TXT_BODY, c);
  }
  if (shown == 0) ui.textMid("нет транзитов", layout::CX, px(110), TXT_BODY, th.text);
  tft.endWrite();
}

// Вывод в Serial: единственный способ проверить устройство, не глядя на экран.
// Заодно меряет, сколько занимают пересчёт и отрисовка на самом железе.
static void dumpDiagnostics(unsigned long calcMs, unsigned long drawMs) {
  double jd = currentJD();
  Serial.println();
  Serial.println("=== AstroClock ===");
  Serial.printf("время: %s\n", timeSynced ? "синхронизировано по NTP"
                : timeFromRtc ? "из RTC (не проверено)"
                : timeRestored ? "восстановлено из NVS (не проверено)"
                               : "от момента сборки (не проверено)");
  Serial.printf("JD сейчас  %.6f\n", jd);
  Serial.printf("JD натал   %.6f\n", natal.jd);
  Serial.printf("пересчёт %lu мс, отрисовка %lu мс\n", calcMs, drawMs);
  Serial.printf("ASC %.3f  MC %.3f\n", ephem::ascendant(jd, HOME_LAT, HOME_LON),
                ephem::midheaven(jd, HOME_LON));
  Serial.printf("Луна без курса: %s, фаза %.2f\n", moonVoid ? "да" : "нет",
                ephem::moonIllumination(jd));

  Serial.println("тело   транзит    натал");
  for (int b = 0; b < ephem::BODY_COUNT; b++) {
    Serial.printf("%-6s %8.3f%s %8.3f\n", PLANET_SHORT[b],
                  ephem::longitude((ephem::Body)b, jd),
                  ephem::isRetrograde((ephem::Body)b, jd) ? "R" : " ",
                  natal.lon[b]);
  }

  Serial.printf("транзитов: %d\n", hitCount);
  for (int i = 0; i < hitCount; i++) {
    const transit::Hit& h = hits[i];
    Serial.printf("  %s %s нат.%s  орбис %.2f  %s\n", PLANET_SHORT[h.transiting],
                  transit::aspectGlyph(h.kind), NATAL_SHORT[h.natalPoint], h.orb,
                  h.applying ? "сходится" : "расходится");
  }
  Serial.println("куспиды:");
  for (int i = 0; i < 12; i++)
    Serial.printf("  %2d  %8.3f%s", i + 1, natal.cusp[i],
                  (i % 4 == 3) ? "\n" : "");

  {
    Serial.printf("палитра: день %s, час %s (%d-й от восхода), "
                  "хрома +%.4f, контраст +%.2f\n",
                  PLANET_SHORT[live.dayRuler], PLANET_SHORT[live.hourRuler],
                  live.hourIndex + 1, live.chromaBoost, live.lightnessBoost);
    Serial.printf("  фон %04X  текст %04X  рамка %04X  акцент %04X\n", live.bg,
                  live.text, live.border, live.accent);
  }

  Serial.printf("режим %d, спрайт %s, свободная куча %lu байт, PSRAM %lu байт\n",
                mode, useCanvas ? "да" : "НЕТ", (unsigned long)ESP.getFreeHeap(),
                (unsigned long)ESP.getFreePsram());
  Serial.println("==================");
}

// Названия знаков для строки «Луна в ...»
static const char* SIGN_RU[12] = {"ОВЕН", "ТЕЛЕЦ", "БЛИЗНЕЦЫ", "РАК", "ЛЕВ",
                                  "ДЕВА", "ВЕСЫ", "СКОРПИОН", "СТРЕЛЕЦ",
                                  "КОЗЕРОГ", "ВОДОЛЕЙ", "РЫБЫ"};

// Момент, за который показывается календарь: сейчас, либо полдень нужного дня
// при листании. Полдень, потому что в один календарный день обычно
// умещаются двое лунных суток, и надо выбрать какие-то одни
static double calendarJD(struct tm* outTm) {
  time_t now = time(nullptr);
  if (calOffset != 0) {
    struct tm tmv;
    localtime_r(&now, &tmv);
    tmv.tm_mday += calOffset;
    tmv.tm_hour = 12;
    tmv.tm_min = 0;
    tmv.tm_sec = 0;
    now = mktime(&tmv);
  }
  if (outTm) localtime_r(&now, outTm);
  return ephem::julianDayFromUnix((long long)now);
}

// Кэш лунных суток. Полный расчёт идёт от новолуния через десятки поисков
// восхода и стоит почти секунду, поэтому новые сутки по возможности
// достраиваются от уже известных через lunar::advance(), одним поиском. Кольцо
// из восьми суток покрывает листание вперёд и обратно без повторного счёта
static lunar::Day lunarDayAt(double jd) {
  static lunar::Day known[8];
  static int count = 0, next = 0;
  const lunar::Day* base = nullptr;
  for (int i = 0; i < count; i++) {
    const lunar::Day& d = known[i];
    if (jd >= d.startJD && jd < d.endJD) return d;
    if (d.endJD <= jd && (!base || d.endJD > base->endJD)) base = &d;
  }
  // Достраивать дальше двух недель нет смысла: полный расчёт выйдет дешевле
  lunar::Day day = (base && jd - base->endJD < 14.0)
                       ? lunar::advance(*base, jd, HOME_LAT, HOME_LON)
                       : lunar::compute(jd, HOME_LAT, HOME_LON);
  known[next] = day;
  next = (next + 1) % 8;
  if (count < 8) count++;
  return day;
}

#ifdef BOARD_SMOOTH
// Лунные месяцы считаются в фоне на ядре 0, каждый около секунды: таблица
// начал всех суток от новолуния до новолуния (lunar::computeMonth). Готовый
// месяц отдаёт любой свой день мгновенно, поэтому календарь листается в обе
// стороны без пауз, пока фон держит соседние месяцы посчитанными. Пока
// нужного месяца нет, на месте номера крутится индикатор.
namespace moon {
constexpr int SLOTS = 5;
static portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
static lunar::Month slots[SLOTS];
static uint32_t used[SLOTS];
static uint32_t tick = 0;
static QueueHandle_t queue = nullptr;

static bool find(double jd, lunar::Month* out) {
  bool ok = false;
  portENTER_CRITICAL(&mux);
  for (int i = 0; i < SLOTS; i++)
    if (lunar::contains(slots[i], jd)) {
      *out = slots[i];
      used[i] = ++tick;
      ok = true;
      break;
    }
  portEXIT_CRITICAL(&mux);
  return ok;
}

// В слот, к которому дольше всех не обращались
static void store(const lunar::Month& m) {
  portENTER_CRITICAL(&mux);
  int victim = 0;
  for (int i = 1; i < SLOTS; i++)
    if (used[i] < used[victim]) victim = i;
  slots[victim] = m;
  used[victim] = ++tick;
  portEXIT_CRITICAL(&mux);
}

static void worker(void*) {
  double jd;
  for (;;) {
    if (xQueueReceive(queue, &jd, portMAX_DELAY) != pdTRUE) continue;
    lunar::Month m;
    if (find(jd, &m)) continue;
    unsigned long t0 = millis();
    // Между поисками восхода ядро отдаётся на тик. Без этого счёт трёх
    // месяцев подряд (~6 с) не пускал задачу простоя ядра 0, и сторожевой
    // таймер перезагружал часы
    m = lunar::computeMonth(jd, HOME_LAT, HOME_LON, [] { vTaskDelay(1); });
    store(m);
    Serial.printf("лунный месяц с JD %.2f посчитан за %lu мс\n", m.nm, millis() - t0);
  }
}

static void request(double jd) {
  if (queue) xQueueSend(queue, &jd, 0);
}

// Текущий месяц и оба соседних, чтобы листание сразу шло в обе стороны
static void begin(double jd) {
  queue = xQueueCreate(8, sizeof(double));
  // Приоритет ниже задачи тача: месяц может подождать, касание нет
  // 16 КБ: на 8 КБ стек переполнялся (printf с double плюс ряды эфемерид)
  xTaskCreatePinnedToCore(worker, "moon", 16384, nullptr, 1, nullptr, 0);
  request(jd);
  request(jd - 29.6);
  request(jd + 29.6);
}
}  // namespace moon

static bool calWaiting = false;
#endif

// Лунные сутки для календаря. false, если месяц ещё считается
static bool calendarDay(double jd, lunar::Day* out) {
#ifdef BOARD_SMOOTH
  lunar::Month m;
  if (!moon::find(jd, &m)) {
    moon::request(jd);
    return false;
  }
  *out = lunar::dayOf(m, jd);
  // Соседей подкладываем заранее: до края месяца можно долистать быстрее,
  // чем посчитается следующий
  moon::request(m.nmNext + 1.0);
  moon::request(m.nm - 1.0);
  return true;
#else
  *out = lunarDayAt(jd);
  return true;
#endif
}

#ifdef BOARD_SMOOTH
// Сколько дней календарь листается в каждую сторону от сегодня
constexpr int CAL_RANGE = 90;
static constexpr int SPINNER_Y = px(80);
static constexpr int SPINNER_R = px(18);

// Индикатор ожидания: дуга, бегущая по кругу. Рисуется в кадр и выводится
// только своим квадратом, чтобы не гонять весь экран
static void drawSpinner(bool pushNow) {
  Theme th = ui.current();
  const int box = (SPINNER_R * 2 + px(6)) & ~1;
  const int x0 = (layout::CX - box / 2) & ~1, y0 = (SPINNER_Y - box / 2) & ~1;
  canvas.fillRect(x0, y0, box, box, th.bg);
  ui.setTarget(&canvas);
  float a = (float)((millis() * 3 / 10) % 360);  // полоборота в секунду с небольшим
  ui.circle(layout::CX, SPINNER_Y, SPINNER_R, AstroUI::fade(th.text, 0.15f), 1.5f);
  ui.smoothArc(layout::CX, SPINNER_Y, SPINNER_R, a - 180.0f, a - 80.0f, 2.2f, th.accent);
  ui.setTarget(target());
  if (!pushNow) return;
  tft.startWrite();
  tft.setClipRect(x0, y0, box, box);
  canvas.pushSprite(0, 0);
  tft.clearClipRect();
  tft.endWrite();
}

// Стрелки у краёв: видно, что дни листаются в обе стороны. У предела
// диапазона стрелка пропадает
static void drawCalendarArrows() {
  Theme th = ui.current();
  uint16_t c = AstroUI::fade(th.text, 0.45f);
  const int s = px(5), h = px(8), xl = px(9), xr = board::W - px(9);
  if (calOffset > -CAL_RANGE) {
    ui.line(xl + s, layout::CY - h, xl, layout::CY, c, 1.6f);
    ui.line(xl, layout::CY, xl + s, layout::CY + h, c, 1.6f);
  }
  if (calOffset < CAL_RANGE) {
    ui.line(xr - s, layout::CY - h, xr, layout::CY, c, 1.6f);
    ui.line(xr, layout::CY, xr - s, layout::CY + h, c, 1.6f);
  }
}
#endif

static void renderCalendar() {
  struct tm tmv;
  double jd = calendarJD(&tmv);

  lunar::Day day;
  bool ready = calendarDay(jd, &day);

  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = target();
  tft.startWrite();
  g->fillScreen(th.bg);

  // Дата и день недели, при листании приписывается +N.
  // 32, не 24: "ЛУНА - СКОРПИОН"/"БЛИЗНЕЦЫ" в UTF-8 — 28 байт с null, было
  // обрезание snprintf посреди двухбайтовой буквы
  char line[32];
  if (calOffset != 0)
    snprintf(line, sizeof(line), "%s %02d.%02d %+d", lunardays::weekday(tmv.tm_wday),
             tmv.tm_mday, tmv.tm_mon + 1, calOffset);
  else
    snprintf(line, sizeof(line), "%s %02d.%02d", lunardays::weekday(tmv.tm_wday),
             tmv.tm_mday, tmv.tm_mon + 1);
  ui.text(line, layout::CX, px(44), TXT_TITLE, th.text);

#ifdef BOARD_SMOOTH
  drawCalendarArrows();
  calWaiting = !ready;
  if (!ready) {
    drawSpinner(false);
    ui.text("считаю лунный месяц", layout::CX, px(130), TXT_SMALL,
            AstroUI::fade(th.text, 0.6f));
    tft.endWrite();
    return;
  }
#else
  (void)ready;
#endif
  const lunardays::DayInfo& info = lunardays::days()[day.number - 1];

  // Номер лунного дня крупно. Тон дня задаёт цвет: осторожные дни красноватые,
  // лёгкие в цвете акцента темы
  uint16_t toneColor = th.text;
  if (info.tone > 0) toneColor = th.good;
  else if (info.tone < 0) toneColor = th.warn;
  snprintf(line, sizeof(line), "%d", day.number);
  ui.text(line, layout::CX, px(105), TXT_HUGE, toneColor);

  // Символ дня
  ui.text(info.title, layout::CX, px(130), TXT_TITLE, th.text);

  // Луна в знаке
  snprintf(line, sizeof(line), "ЛУНА - %s", SIGN_RU[day.moonSign]);
  ui.text(line, layout::CX, px(145), TXT_BODY, th.text);

  // Иконки: чем день хорош и чего избегать. Перечёркнутая справа
  int icons[4];
  int n = 0;
  for (int i = 0; i < lunardays::ICON_COUNT && n < 3; i++)
    if (info.yes & (1uL << i)) icons[n++] = i;
  int noIcon = -1;
  for (int i = 0; i < lunardays::ICON_COUNT; i++)
    if (info.no & (1uL << i)) { noIcon = i; break; }
  int slots = n + (noIcon >= 0 ? 1 : 0);
  int stepX = px(40);
  int x0 = layout::CX - (slots - 1) * stepX / 2;
  const int iy = px(168);
  for (int i = 0; i < n; i++) ui.drawIcon(icons[i], x0 + i * stepX, iy, th.text, false);
  if (noIcon >= 0) ui.drawIcon(noIcon, x0 + n * stepX, iy, th.text, true);

  // Границы лунных суток по местному времени
  struct tm t1, t2;
  time_t ts1 = (time_t)((day.startJD - 2440587.5) * 86400.0);
  time_t ts2 = (time_t)((day.endJD - 2440587.5) * 86400.0);
  localtime_r(&ts1, &t1);
  localtime_r(&ts2, &t2);
  snprintf(line, sizeof(line), "%02d:%02d - %02d:%02d", t1.tm_hour, t1.tm_min,
           t2.tm_hour, t2.tm_min);
  ui.text(line, layout::CX, px(214), TXT_TITLE, th.text);

  tft.endWrite();
}

#ifdef BOARD_HAS_TOUCH
// Меню разделов. Пункты строками с иконкой слева, как в списке приложений
// у часов: пять строк по центру круга, крайние не прижаты к ободу
struct MenuItem {
  int mode;
  const char* title;
};
static const MenuItem MENU[] = {
    {MODE_TEXT, "Толкования"},
    {MODE_LIST, "Транзиты"},
    {MODE_CAL, "Лунный день"},
    {MODE_LEGEND, "Легенда"},
    {MODE_TOUCHTEST, "Тест тача"},
};
static constexpr int MENU_COUNT = sizeof(MENU) / sizeof(MENU[0]);
static constexpr int MENU_TOP = px(58);
static constexpr int MENU_STEP = px(33);

static int menuItemAt(int y) {
  int i = (y - MENU_TOP + MENU_STEP / 2) / MENU_STEP;
  if (y < MENU_TOP - MENU_STEP / 2 || i < 0 || i >= MENU_COUNT) return -1;
  return i;
}

static void renderMenu() {
  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = target();
  wheelHasOverlap = false;
  tft.startWrite();
  g->fillScreen(th.bg);
  ui.text("МЕНЮ", layout::CX, px(32), TXT_SMALL, AstroUI::fade(th.text, 0.5f));
  for (int i = 0; i < MENU_COUNT; i++) {
    int y = MENU_TOP + i * MENU_STEP;
    // Цвет пункта из того же градиента по долготе, что красит знаки: меню
    // остаётся в палитре часов, а не в своей
    uint16_t c = live.sign[(i * 3) % 12];
    ui.drawMenuIcon(i, layout::CX - px(52), y, c);
    ui.textMidLeft(MENU[i].title, layout::CX - px(34), y, TXT_TITLE, th.text);
  }
  tft.endWrite();
}

// Экран отладки тача. След пальца рисуется, пока палец лежит, после
// отпускания крупно выводится распознанный жест и цифры: смещение, время,
// сколько точек дошло от чипа. Жесты здесь ничего не переключают, выход
// только кнопкой, поэтому проверить можно любой
namespace ttest {
constexpr int MAX_POINTS = 256;
static int16_t xs[MAX_POINTS], ys[MAX_POINTS];
static int count = 0;
static bool down = false;
static bool dirty = false;
static unsigned long frameAt = 0;
static uint32_t readsAtDown = 0;
static char result[40] = "коснись экрана";
static char detail[64] = "";
static char detail2[64] = "";

static bool gotGesture = false;

static void append(int x, int y) {
  if (count > 0 && xs[count - 1] == x && ys[count - 1] == y) return;
  if (count < MAX_POINTS) {
    xs[count] = x;
    ys[count] = y;
    count++;
  }
}

// Событие из задачи тача. Свайп и долгое касание выдаются, пока палец ещё
// лежит, поэтому результат появляется посреди следа, а цифры по всему
// касанию дописываются при отпускании
static void feed(const periph::touch::Msg& m, const char* name) {
  using periph::touch::Kind;
  switch (m.kind) {
    case periph::touch::DOWN:
      down = true;
      gotGesture = false;
      count = 0;
      readsAtDown = periph::touch::reads;
      result[0] = detail[0] = detail2[0] = 0;
      append(m.x, m.y);
      break;
    case periph::touch::MOVE:
      append(m.x, m.y);
      break;
    case periph::touch::GESTURE:
      gotGesture = true;
      snprintf(result, sizeof(result), "%s, %lu мс", name, (unsigned long)m.heldMs);
      break;
    case periph::touch::UP: {
      down = false;
      append(m.x, m.y);
      if (!gotGesture) snprintf(result, sizeof(result), "не распознан");
      uint32_t reads = periph::touch::reads - readsAtDown;
      snprintf(detail, sizeof(detail), "dx %d  dy %d  %lu мс", m.x - m.x0, m.y - m.y0,
               (unsigned long)m.heldMs);
      snprintf(detail2, sizeof(detail2), "точек %d, чтений %lu, раз в %lu мс", count,
               (unsigned long)reads, reads > 1 ? (unsigned long)m.heldMs / (reads - 1) : 0UL);
      break;
    }
  }
  dirty = true;
}
}  // namespace ttest

static void renderTouchTest() {
  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = target();
  wheelHasOverlap = false;
  tft.startWrite();
  g->fillScreen(th.bg);
  uint16_t faint = AstroUI::fade(th.text, 0.25f);
  ui.line(layout::CX - px(8), layout::CY, layout::CX + px(8), layout::CY, faint);
  ui.line(layout::CX, layout::CY - px(8), layout::CX, layout::CY + px(8), faint);

  if (ttest::count > 0) {
    // Круг порога свайпа вокруг точки касания: палец, не вышедший за него,
    // даёт тап или долгое касание
    ui.circle(ttest::xs[0], ttest::ys[0], px(30), faint);
    uint16_t c = ttest::down ? th.accent : AstroUI::fade(th.accent, 0.6f);
    for (int i = 1; i < ttest::count; i++)
      ui.line(ttest::xs[i - 1], ttest::ys[i - 1], ttest::xs[i], ttest::ys[i], c, 2.0f);
    // Каждая точка от чипа отдельной точкой: по густоте видно, где были
    // провалы в опросе
    for (int i = 0; i < ttest::count; i++) ui.dot(ttest::xs[i], ttest::ys[i], px(1), th.text);
    ui.dot(ttest::xs[ttest::count - 1], ttest::ys[ttest::count - 1], px(5), c);
  }

  if (ttest::result[0])
    ui.text(ttest::result, layout::CX, px(52), TXT_TITLE, th.text);
  if (ttest::detail[0]) {
    ui.text(ttest::detail, layout::CX, px(178), TXT_BODY, AstroUI::fade(th.text, 0.8f));
    ui.text(ttest::detail2, layout::CX, px(194), TXT_SMALL, AstroUI::fade(th.text, 0.6f));
  }
  ui.text("выход: кнопка", layout::CX, px(222), TXT_SMALL, AstroUI::fade(th.text, 0.4f));
  tft.endWrite();
}
#endif

#ifdef BOARD_HAS_TOUCH
static bool pressShown;
#endif

static void render() {
  if (screenOff) return;
  double jd = currentJD();
  // Асцендент бежит примерно на градус в четыре минуты, поэтому обновляется
  // на каждой перерисовке, а не только в пятиминутном пересчёте
  ui.setAscendant((float)ephem::ascendant(jd, HOME_LAT, HOME_LON));
#ifdef BOARD_SMOOTH
  voidBgValid = false;
#endif
  switch (mode) {
    case MODE_LEGEND: renderLegend(); break;
    case MODE_TEXT: renderText(); break;
    case MODE_LIST: renderList(); break;
    case MODE_CAL: renderCalendar(); break;
#ifdef BOARD_HAS_TOUCH
    case MODE_MENU: renderMenu(); break;
    case MODE_TOUCHTEST: renderTouchTest(); break;
#endif
    default: renderBiwheel(); break;
  }
  if (useCanvas) canvas.pushSprite(0, 0);
#ifdef BOARD_HAS_TOUCH
  // Полный кадр затёр кружок под пальцем
  pressShown = false;
#endif
  paintStatusOverlay();
}

// Кольцо VoC дышит раз в 2.4 с. Ради двух окружностей гонять весь кадр
// незачем, поэтому обновляется только клочок экрана под кольцом.
static void pulseVoidRing() {
  if (screenOff) return;
#ifdef BOARD_SMOOTH
  if (!voidBgValid) return;
  voidBg.pushSprite(&voidPatch, 0, 0);
  ui.setTarget(&voidPatch);
  ui.voidRingAt(voidCx - voidX0, voidCy - voidY0, bodyColor(ephem::MOON), voidBreath());
  ui.setTarget(target());
  tft.startWrite();
  voidPatch.pushSprite(voidX0, voidY0);
  tft.endWrite();
#else
  // На C3 кольцо рисуется прямо в панель поверх себя же: без сглаживания
  // каждый такт целиком перекрашивает те же пиксели. Долгота Луны берётся
  // заново, а не из recompute(): один вызов ряда Мёйса стоит микросекунды,
  // тогда как весь recompute() тянет moonIsVoid() на ~150 мс
  double jd = currentJD();
  float lon = (float)ephem::longitude(ephem::MOON, jd);
  int x, y;
  ui.transitPoint(lon, &x, &y);
  ui.setTarget(&tft);
  tft.startWrite();
  ui.voidRingAt(x, y, bodyColor(ephem::MOON), voidBreath());
  tft.endWrite();
  ui.setTarget(target());
#endif
}

// После NTP время записывается в RTC: при следующем старте без сети часы
// возьмут его оттуда
static void storeTimeToRtc() {
#ifdef BOARD_HAS_RTC
  static bool stored = false;
  if (stored || !timeSynced) return;
  stored = periph::rtc::write(time(nullptr));
  Serial.printf("RTC: %s\n", stored ? "записан" : "не отвечает");
#endif
}

// --- жизненный цикл --------------------------------------------------------

void setup() {
  unsigned blockBefore = ESP.getMaxAllocHeap();
#ifdef BOARD_SMOOTH
  // Полный кадр 466x466 весит 434 КБ и живёт в PSRAM
  canvas.setPsram(true);
  canvas.setColorDepth(16);
  useCanvas = canvas.createSprite(board::W, board::H);
#else
  // Кадровый буфер 239x239, а не 240x240. Куча C3 разрезана на два региона,
  // и наибольший сплошной блок ещё до setup() — 114 676 байт, а полный кадр
  // 16 бит весит 115 200. Без спрайта колесо рисуется прямо в панель и мигает
  // при каждой перерисовке. Круглый экран прощает потерю крайнего столбца и
  // строки: туда достаёт разве что последний пиксель солнечной метки.
  canvas.setColorDepth(16);
  useCanvas = canvas.createSprite(239, 239);
#endif
  if (useCanvas) ui.setTarget(&canvas);

  Serial.begin(115200);
  // Запись в USB-порт не ждёт. По умолчанию HWCDC ждёт до 100 мс на каждую
  // запись, когда буфер полон, а он полон всегда, если порт на компьютере
  // открыт, но никто его не читает. Тогда каждая строка лога стоила задаче,
  // которая её пишет, десятую долю секунды, и тач с прокруткой тормозили.
  // Лучше потерять строку лога, чем касание
  Serial.setTxTimeoutMs(0);
  // USB CDC поднимается не мгновенно, без паузы стартовый вывод теряется
  delay(2500);
  Serial.printf("наибольший блок кучи до спрайта %u, спрайт %s\n", blockBefore,
                useCanvas ? "есть" : "НЕТ");

  board::powerOn();
  tft.init();
  tft.setRotation(0);
  tft.setBrightness(board::BRIGHTNESS);
  // Спрайт на C3 не накрывает последний столбец и строку, а RAM панели после
  // включения хранит шум: без этой заливки он остался бы у обода
  tft.fillScreen(TFT_BLACK);
#if defined(BOARD_HAS_TOUCH) || defined(BOARD_HAS_RTC)
  periph::begin();
#endif
#ifdef BOARD_HAS_TOUCH
  // Пороги жеста: касание, ушедшее дальше 12 px в координатах 240x240, уже
  // не тап, свайп засчитывается с 40
  periph::touch::begin(px(12), px(40));
#endif
  AstroUI::begin();

  prefs.begin("astro", false);
#ifndef BOARD_HAS_TOUCH
  // На часах с одной кнопкой режим переживает перезагрузку: дойти до
  // нужного экрана заново стоит нескольких нажатий. С тачем, как у обычных
  // часов, старт всегда с циферблата
  mode = prefs.getInt("mode", MODE_BIWHEEL);
#endif

  // Реклама BLE поднимается максимально рано и независимо от WiFi/времени —
  // часы должны быть видны телефону сразу, не дожидаясь блокирующего NTP-шага
  wifinvs::begin();
  ble::begin(wifiCommand, wifiConfig, wifiStatusByte, bleStatusText);

  ui.drawWheel();
  ui.drawStatus("натал...");
  if (useCanvas) canvas.pushSprite(0, 0);

  restoreTime();
  setenv("TZ", HOME_TZ, 1);
  tzset();

#ifdef ASTRO_USE_WIFI
  // Тот же одноразовый NTP-синк, что был раньше в блокирующей syncTime(), но
  // теперь через общие с BLE-командой и loop() неблокирующие шаги wifi_task.h
  wifitask::onStatusText(bleStatusText);
  if (wifitask::hasCredentials()) {
    wifitask::requestOn(/*hold=*/false);
    while (wifitask::status() == wifitask::CONNECTING ||
           wifitask::status() == wifitask::CONNECTED) {
      wifitask::poll();
      delay(20);
    }
  }
  timeSynced = wifitask::synced();
#ifdef ASTRO_ENABLE_OTA
  // Заливка по воздуху нужна независимо от того, подъехало ли время: часы
  // без NTP всё равно держат сессию, начатую от момента сборки/NVS
  if (WiFi.status() == WL_CONNECTED) setupOta();
#endif
#endif
  storeTimeToRtc();

  // Первое сохранение сразу: иначе выдернутые в первый час часы ничего не
  // запомнят
  persistTime();

  natal.compute(config::natalJulianDay(), NATAL_LAT, NATAL_LON);

  // Инициализировать палитру ДО первого рисования, чтобы drawWheel()
  // использовала правильные цвета
  applyPalette(currentJD());

  unsigned long t0 = millis();
  recompute();
  unsigned long tCalc = millis() - t0;

  // Сегодняшние лунные сутки считаются заранее: полный расчёт стоит почти
  // секунду, и без этого первый вход в календарь заметно подвисал
#ifdef BOARD_SMOOTH
  moon::begin(calendarJD(nullptr));
#else
  lunarDayAt(calendarJD(nullptr));
#endif

  t0 = millis();
  render();
  unsigned long tDraw = millis() - t0;

  dumpDiagnostics(tCalc, tDraw);
}

// --- навигация -------------------------------------------------------------

static void showMode(int m) {
#ifdef BOARD_SMOOTH
  if (m == MODE_TEXT) scroll::reset();
#endif
  mode = m;
  legendPage = 0;
  calOffset = 0;
  textScroll = 0;
#ifndef BOARD_HAS_TOUCH
  prefs.putInt("mode", mode);
#endif
  render();
}

#ifdef BOARD_HAS_TOUCH
// Момент последнего касания или нажатия: анимация колеса ждёт после него,
// чтобы кадр не задерживал отклик
static unsigned long lastInputAt = 0;

// Экран гасится и зажигается кнопкой, без таймаута: на сложной карте
// таймаут гасил бы экран посреди разглядывания. Панель уходит в сон
// (0x10), погашенный пиксель AMOLED не светится и не выгорает
static void setScreen(bool on) {
  if (on == !screenOff) return;
  screenOff = !on;
  if (on) {
    tft.wakeup();
    tft.setBrightness(board::BRIGHTNESS);
    render();
  } else {
    tft.setBrightness(0);
    tft.sleep();
  }
  Serial.printf("экран %s\n", on ? "включён" : "погашен");
}
// Палец на экране: пока он лежит, loop() крутится без паузы, чтобы не терять
// точки
static bool touchDown = false;

// Страница толкования вперёд или назад. Дойдя до края текста, листание
// переходит к соседнему транзиту, по кругу
static void textPage(int dir) {
  if (hitCount == 0) return;
  int step = textPageLines() - 1;  // строка внахлёст, чтобы не терять нить
  if (step < 1) step = 1;
  if (dir > 0) {
    if (textScroll + textPageLines() < textLines) {
      textScroll += step;
    } else {
      textIndex = (textIndex + 1) % hitCount;
      textScroll = 0;
    }
  } else if (textScroll > 0) {
    textScroll = textScroll > step ? textScroll - step : 0;
  } else {
    textIndex = (textIndex + hitCount - 1) % hitCount;
    textScroll = 0;
  }
  render();
}

// Прокрутка внутри экрана: палец вверх показывает то, что ниже или дальше
static void scrollScreen(int dir) {
  switch (mode) {
#ifndef BOARD_SMOOTH
    case MODE_TEXT: textPage(dir); break;
#endif
    case MODE_CAL: {
      static constexpr int CAL_MAX = 30;
      int next = calOffset + dir;
      if (next < 0 || next > CAL_MAX) return;
      calOffset = next;
      render();
      break;
    }
    case MODE_LEGEND: {
      int next = legendPage + dir;
      if (next < 0 || next >= LEGEND_PAGES) return;
      legendPage = next;
      render();
      break;
    }
    default: break;
  }
}

static void openText(int index) {
  textIndex = (index < hitCount) ? index : 0;
  showMode(MODE_TEXT);
}

// Тап выполняет действие на месте. С циферблата он открывает меню, из меню
// раздел, из списка толкование того транзита, по строке которого ткнули
static void tapScreen(int x, int y) {
  (void)x;
  switch (mode) {
    case MODE_BIWHEEL: showMode(MODE_MENU); break;
    case MODE_MENU: {
      int i = menuItemAt(y);
      if (i >= 0) {
        if (MENU[i].mode == MODE_TEXT) openText(0);
        else showMode(MENU[i].mode);
      }
      break;
    }
    case MODE_TEXT:
#ifdef BOARD_SMOOTH
      // Текст листается пальцем, тап ведёт к следующему транзиту
      if (hitCount > 0) {
        textIndex = (textIndex + 1) % hitCount;
        scroll::reset();
        render();
      }
#else
      textPage(+1);
#endif
      break;
    case MODE_LIST: {
      int row = (y - px(78) + px(11)) / px(22);
      int shown = hitCount < 5 ? hitCount : 5;
      if (y >= px(67) && row >= 0 && row < shown) openText(row);
      break;
    }
    case MODE_CAL: calOffset = (calOffset + 1) % 31; render(); break;
    case MODE_LEGEND: legendPage = (legendPage + 1) % LEGEND_PAGES; render(); break;
  }
}

static const char* gestureName(gesture::Event e) {
  static const char* N[] = {"", "тап", "долго", "влево", "вправо", "вверх", "вниз"};
  return N[e];
}

#ifdef BOARD_SMOOTH
static bool calendarGesture(gesture::Event e, int x);
#endif

static void onGesture(const periph::touch::Msg& m) {
  unsigned long t0 = millis();
  gesture::Event e = m.gesture;
#ifdef BOARD_SMOOTH
  if (mode == MODE_CAL && calendarGesture(e, m.x0)) {
    Serial.printf("[%lu] тач: %s в календаре, ждал %lu мс, кадр %lu мс\n", (unsigned long)m.ms,
                  gestureName(e), t0 - m.ms, millis() - t0);
    return;
  }
#endif
  switch (e) {
    case gesture::LONG: recompute(); render(); break;
    // Карусель без зацикливания, как у часов: с колеса вправо идти некуда.
    // Из меню свайп вправо ведёт назад на циферблат, влево некуда
    case gesture::SWIPE_LEFT: if (mode + 1 < MODE_COUNT) showMode(mode + 1); break;
    case gesture::SWIPE_RIGHT:
      if (mode == MODE_MENU) showMode(MODE_BIWHEEL);
      else if (mode > 0) showMode(mode - 1);
      break;
    case gesture::SWIPE_UP: scrollScreen(+1); break;
    case gesture::SWIPE_DOWN: scrollScreen(-1); break;
    case gesture::TAP: tapScreen(m.x0, m.y0); break;
    default: break;
  }
  // Задержка от события в задаче тача до выведенного кадра: сколько событие
  // ждало в очереди, пока loop() дорисовывал прошлый кадр, плюс новый кадр
  Serial.printf("[%lu] тач: %s (%d,%d)->(%d,%d) на %lu мс касания, ждал %lu мс, кадр %lu мс\n",
                (unsigned long)m.ms, gestureName(e), m.x0, m.y0, m.x, m.y,
                (unsigned long)m.heldMs, t0 - m.ms, millis() - t0);
}

#ifdef BOARD_SMOOTH
// Смена дня в календаре сдвигом: старый кадр уезжает, новый въезжает с той
// стороны, куда листают. Оба кадра уже готовы в PSRAM, анимация только
// выводит их со смещением прямо в панель, по экрану за шаг
static LGFX_Sprite prevFrame(&tft);

static bool savePrevFrame() {
  if (!useCanvas) return false;
  if (prevFrame.width() == 0) {
    prevFrame.setPsram(true);
    prevFrame.setColorDepth(16);
    if (!prevFrame.createSprite(board::W, board::H)) return false;
  }
  memcpy(prevFrame.getBuffer(), canvas.getBuffer(), (size_t)board::W * board::H * 2);
  return true;
}

// dir > 0: новое приходит справа
static void slideIn(int dir) {
  const int STEPS = 12;
  tft.startWrite();
  for (int k = 1; k <= STEPS; k++) {
    float t = (float)k / STEPS;
    float e = 1.0f - (1.0f - t) * (1.0f - t) * (1.0f - t);  // ease-out
    // Чётный сдвиг: CO5300 пишет столбцы парами
    int o = ((int)(e * board::W)) & ~1;
    if (k == STEPS) o = board::W;
    if (dir > 0) {
      prevFrame.pushSprite(-o, 0);
      canvas.pushSprite(board::W - o, 0);
    } else {
      prevFrame.pushSprite(o, 0);
      canvas.pushSprite(o - board::W, 0);
    }
  }
  tft.endWrite();
  pressShown = false;
}

static void showCalendarDay(int offset, int dir) {
  if (offset < -CAL_RANGE || offset > CAL_RANGE) return;
  bool slide = savePrevFrame();
  calOffset = offset;
  renderCalendar();
  if (slide) {
    slideIn(dir);
  } else {
    tft.startWrite();
    canvas.pushSprite(0, 0);
    tft.endWrite();
  }
}

// Жесты календаря. Дни листаются в обе стороны свайпами и тапом по краю со
// стрелкой, тап в середине возвращает на сегодня. Свайпы вбок здесь заняты
// днями и разделы не переключают, выход кнопкой. true, если жест разобран
static bool calendarGesture(gesture::Event e, int x) {
  switch (e) {
    case gesture::SWIPE_LEFT:
    case gesture::SWIPE_UP: showCalendarDay(calOffset + 1, +1); return true;
    case gesture::SWIPE_RIGHT:
    case gesture::SWIPE_DOWN: showCalendarDay(calOffset - 1, -1); return true;
    case gesture::TAP:
      if (x < px(45)) showCalendarDay(calOffset - 1, -1);
      else if (x > board::W - px(45)) showCalendarDay(calOffset + 1, +1);
      else if (calOffset != 0) showCalendarDay(0, calOffset > 0 ? -1 : +1);
      return true;
    default: return false;
  }
}

// Пока месяц считается, крутится индикатор; как только готов, день
// рисуется на месте без сдвига
static bool calendarWaitTick() {
  if (mode != MODE_CAL || !calWaiting) return false;
  static unsigned long at = 0;
  unsigned long now = millis();
  if (now - at < 33) return true;
  at = now;
  struct tm tmv;
  lunar::Month m;
  if (moon::find(calendarJD(&tmv), &m)) {
    render();
    return false;
  }
  drawSpinner(true);
  return true;
}
#endif

// Отклик под пальцем: кружок в точке касания появляется, как только палец
// лёг, ещё до того, как ясно, какой это жест. Рисуется в маленький спрайт
// поверх сохранённого куска кадра и выводится только этот кусок
static LGFX_Sprite pressPatch(&tft);

static int pressX0 = 0, pressY0 = 0;
static constexpr int PRESS_BOX = (px(16) * 2 + 2) & ~1;

static void pushPressPatch(int x, int y, bool withMark) {
  if (!useCanvas) return;
  if (pressPatch.width() == 0) {
    pressPatch.setPsram(true);
    pressPatch.setColorDepth(16);
    if (!pressPatch.createSprite(PRESS_BOX, PRESS_BOX)) return;
  }
  if (withMark) {
    // Чётные координаты окна: CO5300 пишет столбцы парами
    pressX0 = constrain(x - PRESS_BOX / 2, 0, board::W - PRESS_BOX) & ~1;
    pressY0 = constrain(y - PRESS_BOX / 2, 0, board::H - PRESS_BOX) & ~1;
  }
  canvas.pushSprite(&pressPatch, -pressX0, -pressY0);
  if (withMark) {
    Theme th = ui.current();
    ui.setTarget(&pressPatch);
    ui.dot(x - pressX0, y - pressY0, px(12), AstroUI::fade(th.accent, 0.3f));
    ui.circle(x - pressX0, y - pressY0, px(12), th.accent, 1.5f);
    ui.setTarget(target());
  }
  tft.startWrite();
  pressPatch.pushSprite(pressX0, pressY0);
  tft.endWrite();
  pressShown = withMark;
}

static void showPress(int x, int y) { pushPressPatch(x, y, true); }
static void hidePress() {
  if (pressShown) pushPressPatch(0, 0, false);
}
#endif

#ifdef BOARD_SMOOTH
// Палец в толкованиях. Вертикальное движение дальше порога тапа берёт ленту
// и тянет её за собой, за краем с сопротивлением. Свайпы вверх и вниз здесь
// не листают страницы, их работу делает сама лента; вбок по-прежнему
// переключают разделы. Возвращает true, если событие съедено прокруткой
static bool textScrollInput(const periph::touch::Msg& m) {
  using namespace periph::touch;
  switch (m.kind) {
    case DOWN:
      // Касание ловит разогнавшуюся ленту, как на телефоне
      scroll::vel = 0;
      return true;
    case MOVE: {
      int dy = m.y - m.y0, dx = m.x - m.x0;
      if (!scroll::dragging) {
        if (abs(dy) < px(12) || abs(dy) < abs(dx)) return true;
        scroll::dragging = true;
        scroll::dragY0 = m.y;
        scroll::dragPos0 = scroll::pos;
        scroll::lastY = m.y;
        scroll::lastT = m.ms;
        return true;
      }
      float raw = scroll::dragPos0 - (m.y - scroll::dragY0);
      float mp = (float)scroll::maxPos();
      if (raw < 0) raw *= 0.4f;
      if (raw > mp) raw = mp + (raw - mp) * 0.4f;
      scroll::pos = raw;
      if (m.ms > scroll::lastT) {
        float v = -(float)(m.y - scroll::lastY) / (float)(m.ms - scroll::lastT);
        scroll::vel = 0.6f * v + 0.4f * scroll::vel;
      }
      scroll::lastY = m.y;
      scroll::lastT = m.ms;
      return true;
    }
    case UP:
      if (!scroll::dragging) return false;
      scroll::dragging = false;
      // Палец замер перед отпусканием: ленту не бросаем
      if (m.ms - scroll::lastT > 60) scroll::vel = 0;
      if (scroll::vel > 4) scroll::vel = 4;
      if (scroll::vel < -4) scroll::vel = -4;
      return true;
    case GESTURE:
      if (scroll::dragging) return true;
      return m.gesture == gesture::SWIPE_UP || m.gesture == gesture::SWIPE_DOWN;
  }
  return false;
}

// Кадр прокрутки: не чаще 60 раз в секунду и только когда лента сдвинулась
static bool textScrollTick() {
  if (mode != MODE_TEXT || !scroll::valid) return false;
  unsigned long now = millis();
  unsigned long dt = now - scroll::frameAt;
  if (dt < 16) return scroll::active();
  scroll::frameAt = now;
  if (dt > 50) dt = 50;
  scroll::step(dt);
  static unsigned long worst = 0;
  static int frames = 0;
  if (fabsf(scroll::pos - scroll::drawnPos) >= 0.5f) {
    unsigned long t0 = millis();
    scroll::compose();
    tft.startWrite();
    canvas.pushSprite(0, 0);
    tft.endWrite();
    pressShown = false;
    unsigned long spent = millis() - t0;
    if (spent > worst) worst = spent;
    frames++;
  }
  bool going = scroll::active();
  // Итог прокрутки в лог: сколько кадров и самый долгий из них
  if (!going && frames > 0) {
    Serial.printf("прокрутка: %d кадров, самый долгий %lu мс\n", frames, worst);
    frames = 0;
    worst = 0;
  }
  return going;
}
#endif

// Кнопка и тач. С тачем кнопка сбоку работает как у обычных часов: с любого
// экрана домой, с циферблата в меню, долгое нажатие пересчитывает карту.
// Без тача (C3) кнопка одна на всё и листает режимы по кругу
static void handleInput() {
  static bool lastBtn = HIGH;
  static unsigned long btnDown = 0;
  bool btn = digitalRead(board::BTN_PIN);
  bool released = false;
  unsigned long held = 0;
  if (btn == LOW && lastBtn == HIGH) {
    btnDown = millis();
  } else if (btn == HIGH && lastBtn == LOW) {
    released = true;
    held = millis() - btnDown;
  }
  lastBtn = btn;

#ifdef BOARD_HAS_TOUCH
  // Кнопка сбоку: короткое нажатие гасит и зажигает экран, двойное ведёт на
  // колесо, долгое пересчитывает карту. Гашение ждёт 350 мс, не придёт ли
  // второе нажатие; включение срабатывает сразу, ведь двойное нажатие экран
  // тоже включает
  static unsigned long pendingPressAt = 0;
  static bool pending = false, offWhenDue = false;
  if (released && held > 30) {
    lastInputAt = millis();
    if (held > 800) {
      pending = false;
      setScreen(true);
      recompute();
      render();
    } else if (pending) {
      pending = false;
      setScreen(true);
      if (mode != MODE_BIWHEEL) showMode(MODE_BIWHEEL);
    } else {
      pending = true;
      pendingPressAt = millis();
      offWhenDue = !screenOff;
      if (screenOff) setScreen(true);
    }
  }
  if (pending && millis() - pendingPressAt >= 350UL) {
    pending = false;
    if (offWhenDue) setScreen(false);
  }

  periph::touch::Msg m;
  while (periph::touch::poll(&m)) {
    // Погашенный экран касания не будят: часы лежат на столе или в руке,
    // случайное касание не должно их зажигать. Будит кнопка
    if (screenOff) continue;
    lastInputAt = millis();
    if (m.kind == periph::touch::DOWN) touchDown = true;
    if (m.kind == periph::touch::UP) touchDown = false;
    if (mode == MODE_TOUCHTEST) {
      ttest::feed(m, gestureName(m.gesture));
      continue;
    }
#ifdef BOARD_SMOOTH
    if (mode == MODE_TEXT && textScrollInput(m)) continue;
#endif
    switch (m.kind) {
      case periph::touch::DOWN: showPress(m.x, m.y); break;
      case periph::touch::UP: hidePress(); break;
      case periph::touch::GESTURE:
        hidePress();
        onGesture(m);
        break;
      default: break;
    }
  }
#else
  // В календаре короткий клик ждёт 400 мс: не пришёл ли второй. Двойной
  // листает день вперёд, одиночный выходит из режима. В остальных режимах
  // клик срабатывает сразу, задержки нет
  static unsigned long pendingShortAt = 0;

  if (released) {
    if (held > 800) {
      // Долгое нажатие пересобирает карту: способ увидеть свежие транзиты,
      // не дожидаясь пятиминутки
      pendingShortAt = 0;
      recompute();
      render();
    } else if (held > 30) {
      if (mode == MODE_CAL) {
        if (pendingShortAt != 0) {
          pendingShortAt = 0;
          calOffset = (calOffset + 1) % 8;  // после +7 обратно к сегодня
          render();
        } else {
          pendingShortAt = millis();
        }
      } else if (mode == MODE_TEXT && hitCount > 0) {
        // Клик сначала мотает текст, потом переходит к следующему транзиту, и
        // только пролистав все, выходит из режима. Второй кнопки нет, поэтому
        // всё листание висит на одной
        int shown = textPageLines();
        if (textScroll + shown < textLines) {
          textScroll += shown - 1;  // строка внахлёст, чтобы не терять нить
        } else if (textIndex + 1 < hitCount) {
          textIndex++;
          textScroll = 0;
        } else {
          textIndex = 0;
          textScroll = 0;
          mode = (mode + 1) % MODE_COUNT;
          prefs.putInt("mode", mode);
        }
        render();
      } else if (mode == MODE_LEGEND && legendPage + 1 < LEGEND_PAGES) {
        legendPage++;
        render();
      } else {
        legendPage = 0;
        mode = (mode + 1) % MODE_COUNT;
        prefs.putInt("mode", mode);
        render();
      }
    }
  }

  if (pendingShortAt != 0 && millis() - pendingShortAt >= 400UL) {
    pendingShortAt = 0;
    mode = (mode + 1) % MODE_COUNT;
    calOffset = 0;
    prefs.putInt("mode", mode);
    render();
  }

#endif
}

void loop() {
#ifdef TOUCH_DEBUG
  // Самый долгий проход loop() за пять секунд: если он сравним с задержкой
  // тача, виновата отрисовка, а не чип
  static unsigned long loopStart = 0, worst = 0, lastBeat = 0;
  unsigned long nowDbg = millis();
  if (loopStart && nowDbg - loopStart > worst) worst = nowDbg - loopStart;
  loopStart = nowDbg;
  if (nowDbg - lastBeat > 5000) {
    Serial.printf("[%lu] жив, худший проход loop %lu мс, режим %d\n", nowDbg, worst, mode);
    worst = 0;
    lastBeat = nowDbg;
  }
#endif
  static unsigned long lastFull = 0;
  static unsigned long lastMinute = 0;

#ifdef ASTRO_ENABLE_OTA
  ArduinoOTA.handle();
#endif
  ble::poll();
#ifdef ASTRO_USE_WIFI
  wifitask::poll();
  if (wifitask::synced()) timeSynced = true;
#endif
  storeTimeToRtc();

  handleInput();

  unsigned long now = millis();

  static unsigned long lastSave = 0;
  if (now - lastSave > TIME_SAVE_PERIOD_MS) {
    persistTime();
    lastSave = now;
  }

  // Полный пересчёт раз в пять минут: быстрее ничего заметно не меняется
  if (now - lastFull > 300000UL) {
    recompute();
    render();
    lastFull = now;
    lastMinute = now;
  } else if (now - lastMinute > 60000UL) {
    // Раз в минуту кадр перерисовывается целиком: асцендент ползёт, а в
    // списке стоят часы
    render();
    lastMinute = now;
  }

  bool wheelOnScreen = (mode == MODE_BIWHEEL);

  // Чередование наложившихся глифов: переход занимает четверть слота, и чтобы
  // он выглядел плавно, кадр обновляется примерно пять раз в секунду. Только
  // при живых перекрытиях — иначе часы гоняли бы спрайт впустую
  static unsigned long lastSwap = 0;
  // Пока палец на экране и сразу после, анимацию не гоняем: кадр колеса
  // занимает ядро на 150 мс, и событие жеста ждало бы его конца
  bool touchBusy = false;
#ifdef BOARD_HAS_TOUCH
  touchBusy = touchDown || now - lastInputAt < 400UL;
#endif
  if (wheelHasOverlap && wheelOnScreen && !touchBusy && now - lastSwap > 200UL) {
    render();
    lastSwap = now;
  }

  // Дыхание кольца VoC. Только там, где на экране колесо: в списке и
  // календаре Луна не нарисована, и кольцо мазало бы поверх текста
  static unsigned long lastPulse = 0;
  if (moonVoid && wheelOnScreen && now - lastPulse > 120UL) {
    pulseVoidRing();
    lastPulse = now;
  }

#ifdef BOARD_SMOOTH
  // Пока лента едет или крутится индикатор, loop() без паузы
  if (screenOff) {
    delay(20);
    return;
  }
  if (textScrollTick()) return;
  if (calendarWaitTick()) return;
#endif
#ifdef BOARD_HAS_TOUCH
  // Экран теста тача обновляется по мере прихода точек, не чаще 30 раз в
  // секунду: кадр на AMOLED выходит за ~25 мс
  if (mode == MODE_TOUCHTEST && ttest::dirty && now - ttest::frameAt >= 33UL) {
    ttest::dirty = false;
    ttest::frameAt = now;
    render();
  }
  if (touchDown) return;
#endif
  delay(20);
}
