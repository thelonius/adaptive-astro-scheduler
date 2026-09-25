#pragma once
// Учётные данные WiFi в NVS (namespace astro, ключи wifi_ssid/wifi_pass).
// Пишутся с телефона через BLE WiFi Config; wifi_task читает их при подключении.

#include <Preferences.h>
#include <cstring>

namespace wifinvs {

constexpr size_t kSsidMax = 32;
constexpr size_t kPassMax = 64;

inline Preferences prefs;

inline void begin() { prefs.begin("astro", false); }

// isKey перед чтением: статус WiFi опрашивается часто, а getString() на
// отсутствующем ключе пишет ошибку в лог при каждом вызове
inline bool hasSsid() {
  return prefs.isKey("wifi_ssid") && prefs.getString("wifi_ssid", "").length() > 0;
}

inline bool loadSsid(char* out, size_t outLen) {
  if (!prefs.isKey("wifi_ssid")) return false;
  String s = prefs.getString("wifi_ssid", "");
  if (s.length() == 0) return false;
  strncpy(out, s.c_str(), outLen - 1);
  out[outLen - 1] = '\0';
  return true;
}

inline void loadPass(char* out, size_t outLen) {
  String s = prefs.isKey("wifi_pass") ? prefs.getString("wifi_pass", "") : String();
  strncpy(out, s.c_str(), outLen - 1);
  out[outLen - 1] = '\0';
}

inline bool storeSsid(const char* ssid, size_t len) {
  if (len == 0 || len > kSsidMax) return false;
  return prefs.putString("wifi_ssid", String(ssid, len)) > 0;
}

inline bool storePass(const char* pass, size_t len) {
  if (len > kPassMax) return false;
  return prefs.putString("wifi_pass", String(pass, len)) >= 0;
}

inline void clear() {
  prefs.remove("wifi_ssid");
  prefs.remove("wifi_pass");
}

}  // namespace wifinvs
