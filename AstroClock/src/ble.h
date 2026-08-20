#pragma once
// GATT-сервер пейринга и управления WiFi. Протокол — см.
// AstroClock/docs/ble-protocol.md.
//
// Компилируется безусловно (в отличие от WiFi не требует secrets.ini, а
// флеш-бюджет позволяет держать BLE всегда включённым, см. README/platformio.ini).
// Модуль не знает, собрана ли прошивка с ASTRO_USE_WIFI — WiFi-статус и
// обработка команды приходят снаружи через callback'и, чтобы не тащить сюда
// WiFi-ifdef'ы: их и без того хватает в main.cpp/wifi_task.h.
//
// Security — bonding + MITM + Secure Connections, IO capability Display
// Only: часы показывают 6-значный код через переданный statusText-callback
// (в main.cpp это ui.drawStatus), телефон подтверждает системным диалогом
// Android. Just Works был бы дешевле в коде, но не защищён от перехвата
// ключей в момент первого сопряжения кем угодно в радиусе действия BLE —
// экран для кода и так есть, поэтому экономить на защите незачем.

#include <NimBLEDevice.h>

namespace ble {

using WifiCommandFn = void (*)(uint8_t cmd);
using WifiStatusFn = uint8_t (*)();
using StatusTextFn = void (*)(const char*);

namespace detail {

constexpr const char* SERVICE_UUID = "6b4a6604-c005-4c8e-bd10-66de4f397125";
constexpr const char* CMD_UUID = "4452159d-6713-4a4a-be64-f8497ae1de73";
constexpr const char* STATUS_UUID = "ba810c70-a319-474d-bb7c-3ed0d6b62537";

inline WifiCommandFn onCommand = nullptr;
inline WifiStatusFn wifiStatusByte = nullptr;
inline StatusTextFn drawStatus = nullptr;

inline NimBLECharacteristic* statusChar = nullptr;
inline uint8_t lastNotified = 0xFF;  // заведомо не совпадает ни с одним статусом

class CommandCallbacks : public NimBLECharacteristicCallbacks {
  // Пишет пришедший байт в wifi_task через callback и обязана вернуться
  // мгновенно: это контекст NimBLE host-таска, не loop()
  void onWrite(NimBLECharacteristic* chr, NimBLEConnInfo& connInfo) override {
    const std::string v = chr->getValue();
    if (v.length() != 1) return;
    if (onCommand) onCommand((uint8_t)v[0]);
  }
};

class ServerCallbacks : public NimBLEServerCallbacks {
  void onDisconnect(NimBLEServer* server, NimBLEConnInfo& connInfo,
                     int reason) override {
    // Часы остаются обнаружимыми и после разрыва связи: одна кнопка на
    // экране, повторный вход в "режим пейринга" неоткуда взять
    NimBLEDevice::startAdvertising();
  }

  // Часы — единственная сторона с экраном, поэтому показывают код именно они
  uint32_t onPassKeyDisplay() override {
    uint32_t passkey = 100000 + (esp_random() % 900000);
    if (drawStatus) {
      char buf[16];
      snprintf(buf, sizeof(buf), "BLE %06u", (unsigned)passkey);
      drawStatus(buf);
    }
    return passkey;
  }

  void onAuthenticationComplete(NimBLEConnInfo& connInfo) override {
    if (drawStatus) drawStatus(connInfo.isEncrypted() ? "paired" : "pair fail");
  }
};

}  // namespace detail

inline void begin(WifiCommandFn onCommand, WifiStatusFn wifiStatusByte,
                   StatusTextFn drawStatus) {
  detail::onCommand = onCommand;
  detail::wifiStatusByte = wifiStatusByte;
  detail::drawStatus = drawStatus;

  NimBLEDevice::init("AstroClock");
  NimBLEDevice::setSecurityAuth(/*bonding=*/true, /*mitm=*/true, /*sc=*/true);
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_DISPLAY_ONLY);

  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new detail::ServerCallbacks());

  NimBLEService* service = server->createService(detail::SERVICE_UUID);

  NimBLECharacteristic* cmdChar = service->createCharacteristic(
      detail::CMD_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR |
                             NIMBLE_PROPERTY::WRITE_ENC |
                             NIMBLE_PROPERTY::WRITE_AUTHEN);
  cmdChar->setCallbacks(new detail::CommandCallbacks());

  detail::statusChar = service->createCharacteristic(
      detail::STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY |
                                NIMBLE_PROPERTY::READ_ENC |
                                NIMBLE_PROPERTY::READ_AUTHEN);
  uint8_t initial = wifiStatusByte ? wifiStatusByte() : 5;
  detail::statusChar->setValue(&initial, 1);
  detail::lastNotified = initial;

  service->start();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(detail::SERVICE_UUID);
  adv->start();
}

// Вызывается каждую итерацию loop(): без нового статуса — почти бесплатная
// проверка одного байта, со сменой — шлёт notify подписанному телефону
inline void poll() {
  if (!detail::statusChar || !detail::wifiStatusByte) return;
  uint8_t current = detail::wifiStatusByte();
  if (current == detail::lastNotified) return;
  detail::lastNotified = current;
  detail::statusChar->setValue(&current, 1);
  detail::statusChar->notify();
}

}  // namespace ble
