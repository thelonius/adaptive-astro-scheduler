#include <Arduino.h>
#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <Preferences.h>
#include <time.h>

#include "AstroUI.h"
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
#endif

// Дисплей GC9A01 240x240 по SPI. Распиновка платы не менялась.
class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_GC9A01 _panel_instance;
  lgfx::Bus_SPI _bus_instance;

 public:
  LGFX(void) {
    {
      auto cfg = _bus_instance.config();
      cfg.spi_host = SPI2_HOST;
      cfg.freq_write = 40000000;
      cfg.pin_sclk = 6;
      cfg.pin_mosi = 7;
      cfg.pin_dc = 2;
      _bus_instance.config(cfg);
      _panel_instance.setBus(&_bus_instance);
    }
    {
      auto cfg = _panel_instance.config();
      cfg.pin_cs = 10;
      cfg.pin_rst = 1;
      cfg.panel_width = 240;
      cfg.panel_height = 240;
      cfg.invert = true;
      _panel_instance.config(cfg);
    }
    setPanel(&_panel_instance);
  }
};

static LGFX tft;
static LGFX_Sprite canvas(&tft);
static bool useCanvas = false;
static AstroUI ui(&tft);
static Preferences prefs;

static constexpr int BTN_PIN = 9;
static constexpr int BACKLIGHT_PIN = 3;

// Экран «небо» без наталa уступил место толкованиям: карта без аспектов
// дублировала биwheel, а текст даёт то, чего на кольцах не прочитать.
enum Mode { MODE_BIWHEEL = 0, MODE_TEXT, MODE_LIST, MODE_CAL, MODE_COUNT };
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
static constexpr float GLYPH_PX = 13.0f;
static constexpr unsigned long SWAP_SLOT_MS = 2000UL;
static bool wheelHasOverlap = false;

// Экран толкований: какой транзит показан и на сколько строк промотан
static int textIndex = 0;
static int textScroll = 0;
static int textLines = 0;

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

static void restoreTime() {
  uint64_t saved = prefs.getULong64("t", 0);
  time_t start = (time_t)BUILD_UNIX_TIME;
  if ((time_t)saved > start) {
    start = (time_t)saved;
    timeRestored = true;
  }
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
static void bleStatusText(const char* s) { ui.drawStatus(s); }

#ifdef ASTRO_USE_WIFI
static uint8_t wifiStatusByte() { return (uint8_t)wifitask::status(); }
static void wifiCommand(uint8_t cmd) {
  if (cmd == 0x01) {
    wifitask::requestOn(/*hold=*/true);
  } else if (cmd == 0x00) {
    wifitask::requestOff();
  }
}
#else
static uint8_t wifiStatusByte() { return 5; }  // UNSUPPORTED, см. ble-protocol.md
static void wifiCommand(uint8_t) {}
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
  ui.setMoonVoid(moonVoid);
  hitCount = transit::find(natal, jd, hits, (int)(sizeof(hits) / sizeof(hits[0])));
  // Состав транзитов сменился, прежняя позиция листания указывает не туда
  if (textIndex >= hitCount) textIndex = 0;
  textScroll = 0;
  applyPalette(jd);
}

// --- отрисовка -------------------------------------------------------------

static void formatHub(char* timeStr, char* subStr) {
  time_t now = time(nullptr);
  struct tm tmv;
  localtime_r(&now, &tmv);
  snprintf(timeStr, 8, "%02d:%02d", tmv.tm_hour, tmv.tm_min);
  // Тильда означает, что время не проверялось внешним источником
  snprintf(subStr, 12, "%s%02d.%02d", timeSynced ? "" : "~", tmv.tm_mday,
           tmv.tm_mon + 1);
}

static void renderBiwheel() {
  double jd = currentJD();
  unsigned long ms = millis();
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

  char t[8], s[12];
  formatHub(t, s);
  ui.drawHub(t, s);
  tft.endWrite();
}

// Толкование одного транзита текстом. Транзиты отсортированы по орбису, так
// что первым идёт самый точный. Короткий клик листает, длинный переключает
// тему, поэтому прокрутка длинного текста повешена на тот же короткий клик:
// сначала домотать до конца, потом перейти к следующему транзиту.
static void renderText() {
  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = useCanvas ? (lgfx::v1::LovyanGFX*)&canvas
                                     : (lgfx::v1::LovyanGFX*)&tft;
  wheelHasOverlap = false;
  tft.startWrite();
  g->fillScreen(th.bg);

  if (hitCount == 0) {
    ui.drawText57("НЕТ ТРАНЗИТОВ", layout::CX, 112, 2, th.text);
    tft.endWrite();
    return;
  }

  if (textIndex >= hitCount) textIndex = 0;
  const transit::Hit& h = hits[textIndex];
  uint16_t ac = aspectColor(h.kind);

  // Шапка: транзитное тело, аспект, натальная точка — теми же глифами, что на
  // биwheel, чтобы экран читался тем же языком символов
  ui.drawPlanetGlyph(h.transiting, layout::CX - 46, 30, ac, 5);
  ui.drawAspectGlyph(h.kind, layout::CX, 30, ac, 5);
  if (h.natalPoint < ephem::BODY_COUNT)
    ui.drawPlanetGlyph(h.natalPoint, layout::CX + 46, 30, ac, 5);
  else
    ui.drawText57(h.natalPoint == 10 ? "АСЦ" : "МС", layout::CX + 46, 26, 1, ac);

  // Орбис и направление, мелко под шапкой
  char sub[24];
  snprintf(sub, sizeof(sub), "%d.%d %s", (int)h.orb, (int)(h.orb * 10) % 10,
           h.applying ? "сходится" : "расходится");
  ui.drawText57(sub, layout::CX, 48, 1, AstroUI::fade(th.text, 0.6f));

  // Порядковый номер транзита, если их несколько
  if (hitCount > 1) {
    char pos[12];
    snprintf(pos, sizeof(pos), "%d/%d", textIndex + 1, hitCount);
    ui.drawText57(pos, layout::CX, 62, 1, AstroUI::fade(th.text, 0.5f));
  }

  int total = ui.drawParagraph(transittext::get(h.transiting, h.kind, h.natalPoint),
                               76, 214, 1, th.text, textScroll);
  textLines = total;

  // Многоточие снизу, пока текст не домотан до конца
  int shown = (214 - 76) / 8;
  if (textScroll + shown < total)
    ui.drawText57("...", layout::CX, 216, 1, AstroUI::fade(th.text, 0.5f));

  tft.endWrite();
}

// Список самых точных транзитов текстом. Помещается пять строк.
static void renderList() {
  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = useCanvas ? (lgfx::v1::LovyanGFX*)&canvas
                                     : (lgfx::v1::LovyanGFX*)&tft;
  tft.startWrite();
  g->fillScreen(th.bg);
  g->setFont(&lgfx::v1::fonts::Font2);
  g->setTextDatum(lgfx::v1::middle_center);
  g->setTextColor(th.text, th.bg);

  char line[24];
  time_t now = time(nullptr);
  struct tm tmv;
  localtime_r(&now, &tmv);
  snprintf(line, sizeof(line), "%02d:%02d  %02d.%02d", tmv.tm_hour, tmv.tm_min,
           tmv.tm_mday, tmv.tm_mon + 1);
  g->drawString(line, layout::CX, 46);

  // Символы вместо букв: транзитная и натальная планета — те же глифы, что
  // на биwheel, аспект — стандартная пиктограмма. Асцендент и середина неба
  // своего глифа не имеют, для них остаётся текст
  int shown = hitCount < 5 ? hitCount : 5;
  for (int i = 0; i < shown; i++) {
    const transit::Hit& h = hits[i];
    int y = 78 + i * 22;
    uint16_t c = aspectColor(h.kind);

    ui.drawPlanetGlyph(h.transiting, layout::CX - 55, y, c, 5);
    ui.drawAspectGlyph(h.kind, layout::CX - 20, y, c, 5);

    g->setTextColor(c, th.bg);
    if (h.natalPoint < ephem::BODY_COUNT)
      ui.drawPlanetGlyph(h.natalPoint, layout::CX + 12, y, c, 5);
    else
      g->drawString(NATAL_SHORT[h.natalPoint], layout::CX + 12, y);

    snprintf(line, sizeof(line), "%.1f%c", h.orb, h.applying ? '<' : '>');
    g->drawString(line, layout::CX + 60, y);
  }
  if (shown == 0) {
    g->setTextColor(th.text, th.bg);
    g->drawString("no transits", layout::CX, 110);
  }
  g->setFont(&lgfx::v1::fonts::Font0);
  tft.endWrite();
}

// Вывод в Serial: единственный способ проверить устройство, не глядя на экран.
// Заодно меряет, сколько занимают пересчёт и отрисовка на самом железе.
static void dumpDiagnostics(unsigned long calcMs, unsigned long drawMs) {
  double jd = currentJD();
  Serial.println();
  Serial.println("=== AstroClock ===");
  Serial.printf("время: %s\n", timeSynced ? "синхронизировано по NTP"
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

  Serial.printf("режим %d, спрайт %s, свободная куча %lu байт\n", mode,
                useCanvas ? "да" : "НЕТ", (unsigned long)ESP.getFreeHeap());
  Serial.println("==================");
}

// Названия знаков для строки «Луна в ...»
static const char* SIGN_RU[12] = {"ОВЕН", "ТЕЛЕЦ", "БЛИЗНЕЦЫ", "РАК", "ЛЕВ",
                                  "ДЕВА", "ВЕСЫ", "СКОРПИОН", "СТРЕЛЕЦ",
                                  "КОЗЕРОГ", "ВОДОЛЕЙ", "РЫБЫ"};

// Момент, за который показывается календарь: сейчас, либо полдень нужного дня
// при листании вперёд. Полдень, потому что в один календарный день обычно
// умещаются двое лунных суток, и надо выбрать какие-то одни
static double calendarJD(struct tm* outTm) {
  time_t now = time(nullptr);
  if (calOffset > 0) {
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

static void renderCalendar() {
  struct tm tmv;
  double jd = calendarJD(&tmv);

  // Кэш лунных суток: пересчёт стоит сотни миллисекунд на софт-даблах,
  // поэтому только при выходе за границы суток или смене смещения
  static lunar::Day day;
  static int cachedOffset = -1;
  if (cachedOffset != calOffset || jd < day.startJD || jd >= day.endJD) {
    day = lunar::compute(jd, HOME_LAT, HOME_LON);
    cachedOffset = calOffset;
  }
  const lunardays::DayInfo& info = lunardays::days()[day.number - 1];

  Theme th = ui.current();
  lgfx::v1::LovyanGFX* g = useCanvas ? (lgfx::v1::LovyanGFX*)&canvas
                                     : (lgfx::v1::LovyanGFX*)&tft;
  tft.startWrite();
  g->fillScreen(th.bg);

  // Дата и день недели, при листании приписывается +N.
  // 32, не 24: "ЛУНА - СКОРПИОН"/"БЛИЗНЕЦЫ" в UTF-8 — 28 байт с null, было
  // обрезание snprintf посреди двухбайтовой буквы
  char line[32];
  if (calOffset > 0)
    snprintf(line, sizeof(line), "%s %02d.%02d +%d", lunardays::weekday(tmv.tm_wday),
             tmv.tm_mday, tmv.tm_mon + 1, calOffset);
  else
    snprintf(line, sizeof(line), "%s %02d.%02d", lunardays::weekday(tmv.tm_wday),
             tmv.tm_mday, tmv.tm_mon + 1);
  ui.drawText57(line, layout::CX, 30, 2, ui.current().text);

  // Номер лунного дня крупно. Тон дня задаёт цвет: осторожные дни красноватые,
  // лёгкие в цвете акцента темы
  uint16_t toneColor = th.text;
  if (info.tone > 0) toneColor = th.good;
  else if (info.tone < 0) toneColor = th.warn;
  snprintf(line, sizeof(line), "%d", day.number);
  ui.drawText57(line, layout::CX, 56, 7, toneColor);

  // Символ дня
  ui.drawText57(info.title, layout::CX, 116, 2, th.text);

  // Луна в знаке
  snprintf(line, sizeof(line), "ЛУНА - %s", SIGN_RU[day.moonSign]);
  ui.drawText57(line, layout::CX, 138, 1, ui.current().text);

  // Иконки: чем день хорош и чего избегать. Перечёркнутая справа
  int icons[4];
  int n = 0;
  for (int i = 0; i < lunardays::ICON_COUNT && n < 3; i++)
    if (info.yes & (1uL << i)) icons[n++] = i;
  int noIcon = -1;
  for (int i = 0; i < lunardays::ICON_COUNT; i++)
    if (info.no & (1uL << i)) { noIcon = i; break; }
  int slots = n + (noIcon >= 0 ? 1 : 0);
  int stepX = 40;
  int x0 = layout::CX - (slots - 1) * stepX / 2;
  for (int i = 0; i < n; i++)
    ui.drawIcon13(icons[i], x0 + i * stepX, 168, 2, th.text, false);
  if (noIcon >= 0)
    ui.drawIcon13(noIcon, x0 + n * stepX, 168, 2, ui.current().text, true);

  // Границы лунных суток по Москве
  struct tm t1, t2;
  time_t ts1 = (time_t)((day.startJD - 2440587.5) * 86400.0);
  time_t ts2 = (time_t)((day.endJD - 2440587.5) * 86400.0);
  localtime_r(&ts1, &t1);
  localtime_r(&ts2, &t2);
  snprintf(line, sizeof(line), "%02d:%02d - %02d:%02d", t1.tm_hour, t1.tm_min,
           t2.tm_hour, t2.tm_min);
  ui.drawText57(line, layout::CX, 200, 2, ui.current().text);

  tft.endWrite();
}

static void render() {
  double jd = currentJD();
  // Асцендент бежит примерно на градус в четыре минуты, поэтому обновляется
  // на каждой перерисовке, а не только в пятиминутном пересчёте
  ui.setAscendant((float)ephem::ascendant(jd, HOME_LAT, HOME_LON));
  switch (mode) {
    case MODE_TEXT: renderText(); break;
    case MODE_LIST: renderList(); break;
    case MODE_CAL: renderCalendar(); break;
    default: renderBiwheel(); break;
  }
  if (useCanvas) canvas.pushSprite(0, 0);
}

// Кольцо VoC дышит раз в 2.4 с. Рисуется прямо в физическую панель, а не в
// спрайт: запись в спрайт на экране не появится без pushSprite всего кадра,
// а ради двух десятков пикселей контура гонять целый кадр незачем. Долгота
// Луны берётся заново, а не из recompute() — один вызов ряда Мёйса стоит
// микросекунды, тогда как весь recompute() тянет moonIsVoid() на ~150 мс.
static void pulseVoidRing() {
  double jd = currentJD();
  float lon = (float)ephem::longitude(ephem::MOON, jd);
  float phase = (float)(millis() % 2400UL) / 2400.0f;
  float bright = 0.5f + 0.5f * sinf(phase * 6.28318530718f);
  tft.startWrite();
  ui.pulseVoidRing(&tft, lon, bodyColor(ephem::MOON), bright);
  tft.endWrite();
}

// --- жизненный цикл --------------------------------------------------------

void setup() {
  Serial.begin(115200);
  // USB CDC поднимается не мгновенно, без паузы стартовый вывод теряется
  delay(2500);
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(BACKLIGHT_PIN, OUTPUT);
  digitalWrite(BACKLIGHT_PIN, HIGH);

  tft.init();
  tft.setRotation(0);

  // 240*240*2 = 115 КБ при свободных 300 КБ. Если память фрагментирована и
  // спрайт не создался, рисуем прямо в панель: будет моргать, но работать
  canvas.setColorDepth(16);
  useCanvas = canvas.createSprite(240, 240);
  if (useCanvas) ui.setTarget(&canvas);

  prefs.begin("astro", false);
  mode = prefs.getInt("mode", MODE_BIWHEEL);

  // Реклама BLE поднимается максимально рано и независимо от WiFi/времени —
  // часы должны быть видны телефону сразу, не дожидаясь блокирующего NTP-шага
  ble::begin(wifiCommand, wifiStatusByte, bleStatusText);

  ui.drawWheel();
  ui.drawStatus("natal...");

  restoreTime();
  setenv("TZ", HOME_TZ, 1);
  tzset();

#ifdef ASTRO_USE_WIFI
  // Тот же одноразовый NTP-синк, что был раньше в блокирующей syncTime(), но
  // теперь через общие с BLE-командой и loop() неблокирующие шаги wifi_task.h
  wifitask::onStatusText(bleStatusText);
  wifitask::requestOn(/*hold=*/false);
  while (wifitask::status() == wifitask::CONNECTING ||
         wifitask::status() == wifitask::CONNECTED) {
    wifitask::poll();
    delay(20);
  }
  timeSynced = time(nullptr) > 1700000000;
#ifdef ASTRO_ENABLE_OTA
  // Заливка по воздуху нужна независимо от того, подъехало ли время: часы
  // без NTP всё равно держат сессию, начатую от момента сборки/NVS
  if (WiFi.status() == WL_CONNECTED) setupOta();
#endif
#endif

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

  t0 = millis();
  render();
  unsigned long tDraw = millis() - t0;

  dumpDiagnostics(tCalc, tDraw);
}

void loop() {
  static unsigned long lastFull = 0;
  static unsigned long lastMinute = 0;
  static bool lastBtn = HIGH;
  static unsigned long btnDown = 0;

#ifdef ASTRO_ENABLE_OTA
  ArduinoOTA.handle();
#endif
  ble::poll();
#ifdef ASTRO_USE_WIFI
  wifitask::poll();
  if (wifitask::status() == wifitask::SYNCED) timeSynced = true;
#endif

  // В календаре короткий клик ждёт 400 мс: не пришёл ли второй. Двойной
  // листает день вперёд, одиночный выходит из режима. В остальных режимах
  // клик срабатывает сразу, задержки нет
  static unsigned long pendingShortAt = 0;

  bool btn = digitalRead(BTN_PIN);
  if (btn == LOW && lastBtn == HIGH) {
    btnDown = millis();
  } else if (btn == HIGH && lastBtn == LOW) {
    unsigned long held = millis() - btnDown;
    if (held > 800) {
      // Тема теперь одна, переключать нечего. Долгое нажатие пересобирает
      // карту: способ увидеть свежие транзиты, не дожидаясь пятиминутки
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
        // только пролистав все, выходит из режима. Длинный клик занят темой,
        // второй кнопки нет, поэтому всё листание висит на одной
        int shown = (214 - 76) / 8;
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
      } else {
        mode = (mode + 1) % MODE_COUNT;
        prefs.putInt("mode", mode);
        render();
      }
    }
  }
  lastBtn = btn;

  if (pendingShortAt != 0 && millis() - pendingShortAt >= 400UL) {
    pendingShortAt = 0;
    mode = (mode + 1) % MODE_COUNT;
    calOffset = 0;
    prefs.putInt("mode", mode);
    render();
  }

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
    // Раз в минуту кадр перерисовывается целиком. Частичное обновление одной
    // втулки не годится: подложки под цифрами больше нет, поэтому старые
    // цифры некому затирать, а при отрисовке в спрайт кадр ещё и не доходил
    // до панели без pushSprite
    render();
    lastMinute = now;
  }

  bool wheelOnScreen = (mode == MODE_BIWHEEL);

  // Чередование наложившихся глифов: переход занимает четверть слота, и чтобы
  // он выглядел плавно, кадр обновляется примерно пять раз в секунду. Только
  // при живых перекрытиях — иначе часы гоняли бы спрайт впустую
  static unsigned long lastSwap = 0;
  if (wheelHasOverlap && wheelOnScreen && now - lastSwap > 200UL) {
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

  delay(20);
}
