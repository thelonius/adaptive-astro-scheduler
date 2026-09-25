#pragma once
// Неблокирующий автомат WiFi+NTP.
//
// Раньше подключение было одноразовым и блокирующим (старая syncTime() в
// main.cpp): до ~20с delay() при загрузке, дальше радио гасится. BLE-команда
// с телефона такого позволить себе не может — колбэк записи характеристики
// исполняется в контексте NimBLE host-таска, и 20с внутри него означали бы
// зависший BLE-стек на всё это время. Поэтому подключение продвигается по
// шагам из loop(), тем же способом, каким уже гоняются периодические задачи
// (пересчёт карты, сохранение времени в NVS).
//
// Модуль не знает про AstroUI и BLE: статусный текст и текущее состояние
// отдаются наружу через callback/геттер, вызывающая сторона (main.cpp)
// решает, что с ними делать.

#ifdef ASTRO_USE_WIFI
#include <WiFi.h>
#include <esp_sntp.h>

#include "config.h"
#include "wifi_nvs.h"

namespace wifitask {

// Значения совпадают с байт-протоколом WiFi Status (см.
// AstroClock/docs/ble-protocol.md) для OFF..ERR; UNSUPPORTED там же, но этот
// модуль компилируется только когда WiFi поддержан, поэтому его тут нет.
enum Status { OFF = 0, CONNECTING = 1, CONNECTED = 2, SYNCED = 3, ERR = 4 };

namespace detail {
inline Status state = OFF;
inline unsigned long connectStartedAt = 0;
inline unsigned long ntpStartedAt = 0;
// true — держать радио включённым и после успешного/неуспешного синка
// (запрошено с телефона по BLE); false — старое поведение, разовый NTP при
// загрузке с автоматическим выключением
inline bool holdOn = false;
inline void (*onStatusText)(const char*) = nullptr;
// Ответил ли NTP хоть раз за аптайм. Отдельно от state: после синка радио
// гасится, и state уходит в OFF
inline bool everSynced = false;

inline void notifyText(const char* s) {
  if (onStatusText) onStatusText(s);
}

inline void switchOff() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  state = OFF;
}

inline void loadCredentials(char* ssid, size_t ssidLen, char* pass,
                            size_t passLen) {
  if (wifinvs::hasSsid()) {
    wifinvs::loadSsid(ssid, ssidLen);
    wifinvs::loadPass(pass, passLen);
    return;
  }
#ifdef WIFI_SSID
  strncpy(ssid, WIFI_SSID, ssidLen - 1);
  ssid[ssidLen - 1] = '\0';
  strncpy(pass, WIFI_PASS, passLen - 1);
  pass[passLen - 1] = '\0';
#else
  ssid[0] = '\0';
  pass[0] = '\0';
#endif
}
}  // namespace detail

inline void onStatusText(void (*cb)(const char*)) { detail::onStatusText = cb; }

inline Status status() { return detail::state; }
inline bool synced() { return detail::everSynced; }

inline bool hasCredentials() {
  if (wifinvs::hasSsid()) return true;
#ifdef WIFI_SSID
  return WIFI_SSID[0] != '\0';
#else
  return false;
#endif
}

// hold=false — разовая попытка ради NTP при загрузке, автоматически гасит
// радио по завершении (успех или неудача). hold=true — команда с телефона:
// держать включённым, пока явно не попросят выключить
inline void requestOn(bool hold) {
  if (!hasCredentials()) return;
  detail::holdOn = hold;
  if (detail::state == CONNECTING || detail::state == CONNECTED) return;
  char ssid[wifinvs::kSsidMax + 1];
  char pass[wifinvs::kPassMax + 1];
  detail::loadCredentials(ssid, sizeof(ssid), pass, sizeof(pass));
  if (ssid[0] == '\0') return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);
  detail::connectStartedAt = millis();
  detail::state = CONNECTING;
  detail::notifyText("WiFi...");
}

inline void requestOff() {
#ifdef ASTRO_ENABLE_OTA
  // OTA держит радио включённым весь аптайм ради заливки по воздуху — иначе
  // это была бы возможность с телефона случайно отрезать себе OTA-канал
  return;
#else
  detail::holdOn = false;
  detail::switchOff();
  detail::notifyText("WiFi off");
#endif
}

inline void handleConfig(uint8_t opcode, const uint8_t* payload, size_t len) {
  switch (opcode) {
    case 0x01:
      if (len == 0 || len > wifinvs::kSsidMax) return;
      wifinvs::storeSsid(reinterpret_cast<const char*>(payload), len);
      break;
    case 0x02:
      if (len > wifinvs::kPassMax) return;
      wifinvs::storePass(reinterpret_cast<const char*>(payload), len);
      break;
    case 0x03:
      requestOn(/*hold=*/true);
      break;
    case 0x04:
      wifinvs::clear();
      requestOff();
      break;
    default:
      break;
  }
}

// Вызывается каждую итерацию loop(), без единого delay() внутри
inline void poll() {
  switch (detail::state) {
    case CONNECTING:
      if (WiFi.status() == WL_CONNECTED) {
        configTzTime(HOME_TZ, "pool.ntp.org", "time.google.com");
        detail::ntpStartedAt = millis();
        detail::state = CONNECTED;
      } else if (millis() - detail::connectStartedAt > 20000UL) {
        detail::state = ERR;
        detail::notifyText("WiFi fail");
#ifndef ASTRO_ENABLE_OTA
        if (!detail::holdOn) detail::switchOff();
#endif
      }
      break;
    case CONNECTED:
      // Синк NTP идёт в фоне у ESP-IDF SNTP-клиента с момента configTzTime();
      // здесь только смотрим, не подъехало ли уже время, не блокируя ничего.
      // Смотреть на само время бесполезно: часы стартуют от момента сборки,
      // NVS или RTC, и порог «после 2023 года» пройден ещё до всякого NTP
      if (sntp_get_sync_status() == SNTP_SYNC_STATUS_COMPLETED) {
        detail::state = SYNCED;
        detail::everSynced = true;
        detail::notifyText("WiFi ok");
#ifndef ASTRO_ENABLE_OTA
        if (!detail::holdOn) detail::switchOff();
#endif
      } else if (millis() - detail::ntpStartedAt > 10000UL) {
        detail::state = ERR;
        detail::notifyText("NTP fail");
#ifndef ASTRO_ENABLE_OTA
        if (!detail::holdOn) detail::switchOff();
#endif
      }
      break;
    default:
      break;
  }
}

}  // namespace wifitask
#endif  // ASTRO_USE_WIFI
