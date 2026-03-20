#include <Arduino.h>
#define LGFX_USE_V1
#include "AstroUI.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LovyanGFX.hpp>
#include <WiFi.h>
#include <vector>

using namespace ArduinoJson;

// --- CONFIGURATION ---
const char *ssid = "gw.ed.st";
const char *password = "c5ynfrfp";
const char *serverUrl = "http://192.168.88.193:8000/api/v1/ephemeris/planets?latitude=55.75&longitude=37.61";

const int BTN_PIN = 9; 

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

LGFX tft;
AstroUI ui(&tft);

bool dataLoaded = false;
bool isMoonVoid = false;
float aspectProgress = 0;
JsonDocument currentData;

void renderAstroData() {
  if (!dataLoaded) return;
  
  tft.startWrite(); 

  // 1. Identify Houses/Ascendant
  JsonArray hArr;
  if (currentData["houses"].template is<JsonArray>()) hArr = currentData["houses"];
  else if (currentData["cusps"].template is<JsonArray>()) hArr = currentData["cusps"];
  else if (currentData["house_cusps"].template is<JsonArray>()) hArr = currentData["house_cusps"];
  else if (currentData["houseCusps"].template is<JsonArray>()) hArr = currentData["houseCusps"];
  else if (currentData["house_cuspids"].template is<JsonArray>()) hArr = currentData["house_cuspids"];

  if (hArr && hArr.size() >= 1) {
    float asc = hArr[0].as<float>();
    ui.setAscendant(asc);
    Serial.print("ASC Found: "); Serial.println(asc);
  } else {
    Serial.println("NO HOUSES IN JSON");
  }

  // 2. Detect if Moon is Void
  JsonArray planets = currentData["planets"].template as<JsonArray>();
  for (JsonObject planet : planets) {
    String pName = planet["name"] | "";
    if (pName == "Moon") {
      isMoonVoid = planet["is_void"] | false;
      float lon = planet["longitude"];
      ui.setMoonSignIndex((int)(lon / 30.0f));
      ui.setMoonPhase(planet["phase"] | 0.5f);
    }
  }
  ui.setMoonVoid(isMoonVoid);

  // 3. Draw background layers (Wheel + Houses)
  ui.drawWheel();

  if (hArr && hArr.size() >= 1) {
    std::vector<float> houses;
    for (float h : hArr) houses.push_back(h);
    ui.drawHouseCusps(houses, 0xFFFF); // Use white for better visibility
  }

  // 4. Draw planets
  for (JsonObject planet : planets) {
    const char *name = planet["name"];
    float longitude = planet["longitude"];

    uint16_t color = 0xFFFF;
    String pName = planet["name"].as<String>();
    if (pName == "Sun") color = 0xFFE0;
    else if (pName == "Moon") color = 0xCE79;
    else if (pName == "Mercury") color = 0x7BEF;
    else if (pName == "Venus") color = 0xFED7;
    else if (pName == "Mars") color = 0xF800;
    else if (pName == "Jupiter") color = 0xFD20;
    else if (pName == "Saturn") color = 0x8410;
    else if (pName == "Uranus") color = 0x07FF;
    else if (pName == "Neptune") color = 0x001F;
    else if (pName == "Pluto") color = 0x780F;

    ui.drawPlanet(name, longitude, color);
  }

  // 5. Draw aspects
  JsonArray aspects = currentData["aspects"];
  if (aspects) {
    for (JsonObject aspect : aspects) {
      float d1 = aspect["p1_longitude"];
      float d2 = aspect["p2_longitude"];
      String type = aspect["type"].as<String>();
      
      uint16_t color = 0xFFFF; // Default white
      if (type == "conjunction") color = 0x07FF;  // Cyan
      else if (type == "sextile" || type == "trine") color = 0x001F; // Blue
      else if (type == "square" || type == "opposition") color = 0xF800; // Red
      else if (type == "quincunx") color = 0x7BEF; // Light blue
      
      // Override if JSON provides a color
      if (aspect.containsKey("color")) {
         // Convert hex string if needed, but for now use type logic
      }

      ui.drawAspect(d1, d2, color, aspectProgress);
    }
  }

  tft.endWrite();
}

void fetchAstroData() {
  if (WiFi.status() == WL_CONNECTED) {
    ui.drawStatus("Updating...");
    HTTPClient http;
    http.begin(serverUrl);
    int httpCode = http.GET();

    if (httpCode == 200) {
      String payload = http.getString();
      if (!deserializeJson(currentData, payload)) {
        dataLoaded = true;
        aspectProgress = 0; // Reset animation
        ui.drawStatus("Data OK");
        renderAstroData();
      } else {
        ui.drawStatus("JSON Error");
      }
    } else {
      String err = "HTTP " + String(httpCode);
      ui.drawStatus(err.c_str());
    }
    http.end();
  } else {
    ui.drawStatus("WiFi Lost");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("AstroClock - Recovering Connectivity...");

  pinMode(BTN_PIN, INPUT_PULLUP);

  tft.init();
  tft.setRotation(0);
  pinMode(3, OUTPUT);
  digitalWrite(3, HIGH);

  ui.drawWheel();
  ui.drawStatus("WiFi Init...");

  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    if (attempts % 2 == 0) ui.drawStatus("Connecting...");
    else ui.drawStatus("Searching...");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    fetchAstroData();
  } else {
    Serial.println("\nWiFi Timed Out");
    ui.drawStatus("WiFi Fail");
  }
}

void loop() {
  static unsigned long lastUpdate = 0;
  static bool lastBtnState = HIGH;
  static unsigned long lastBtnTime = 0;

  // Theme switch logic
  bool btnState = digitalRead(BTN_PIN);
  if (btnState == LOW && lastBtnState == HIGH && (millis() - lastBtnTime > 200)) {
    ui.nextTheme();
    if (dataLoaded) renderAstroData();
    else ui.drawStatus("No Data");
    lastBtnTime = millis();
  }
  lastBtnState = btnState;

  // Update every 5 minutes
  if (dataLoaded && (millis() - lastUpdate > 300000)) {
    fetchAstroData();
    lastUpdate = millis();
  }
  
  // Retry fetch if never loaded and WiFi is up
  if (!dataLoaded && WiFi.status() == WL_CONNECTED && (millis() - lastUpdate > 5000)) {
    fetchAstroData();
    lastUpdate = millis();
  }

  // Moon Void flashing logic
  static unsigned long lastFlash = 0;
  static bool flashState = true;
  if (dataLoaded && isMoonVoid && (millis() - lastFlash > 500)) {
    flashState = !flashState;
    ui.setFlashState(flashState);
    renderAstroData();
    lastFlash = millis();
  }

  // Aspect animation
  if (dataLoaded && aspectProgress < 1.0) {
    aspectProgress += 0.05;
    if (aspectProgress > 1.0) aspectProgress = 1.0;
    renderAstroData();
  }

  delay(10);
}
