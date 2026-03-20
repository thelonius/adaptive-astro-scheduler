#ifndef ASTRO_UI_H
#define ASTRO_UI_H

#include <Arduino.h>
#include <LovyanGFX.hpp>
#include <vector>

struct Theme {
  uint16_t bg;
  uint16_t ring;
  uint16_t fire;
  uint16_t earth;
  uint16_t air;
  uint16_t water;
  uint16_t text;
};

class AstroUI {
private:
  lgfx::LGFX_Device *_gfx;
  const int centerX = 120;
  const int centerY = 120;
  const int radius = 118;
  const int outerRingRadius = 115;
  const int innerRingRadius = 85;

  Theme themes[8] = {
    {0x0000, 0xCE79, 0xF800, 0x07E0, 0xFFE0, 0x001F, 0xFFFF}, // Classic
    {0x0008, 0x07FF, 0xF81F, 0x07E0, 0x07FF, 0x001F, 0xFFFF}, // Cyber
    {0x1000, 0xF800, 0xA000, 0x4000, 0x6000, 0x2000, 0xDEFB}, // Blood Moon
    {0x0000, 0x07E0, 0x0400, 0x07E0, 0x0600, 0x0200, 0xE7FF}, // Emerald
    {0x2008, 0xF81F, 0x07FF, 0xF81F, 0xFFE0, 0x780F, 0xFFFF}, // Vaporwave
    {0x2000, 0xFD20, 0xF800, 0xFD20, 0xFFE0, 0xFFFF, 0xFFFF}, // Solar
    {0x0005, 0x07FF, 0x03FF, 0x07FF, 0x05FF, 0x001F, 0xFFFF}, // Deep Sea
    {0x0000, 0x780F, 0xF81F, 0x780F, 0x07FF, 0x001F, 0xFFFF}  // Nebula
  };

  int currentThemeIndex = 0;
  bool _moonVoid = false;
  bool _flashState = true;
  int _moonSignIndex = -1;
  float _moonPhase = 1.0; 
  float _ascendant = 0.0;

  float getAngle(float longitude) {
    // CCW mapping: 180 is Left (ASC).
    float a = 180.0f - (longitude - _ascendant);
    while (a < 0) a += 360.0f;
    while (a >= 360) a -= 360.0f;
    return a * 3.14159265f / 180.0f;
  }

  void drawPlanetGlyph(const char *name, int x, int y, uint16_t color) {
    int s = 5; 
    String n = String(name);
    
    if (n == "Sun") {
      _gfx->drawCircle(x, y, s, color);
      _gfx->fillCircle(x, y, 1, color);
    } else if (n == "Moon") {
      _gfx->drawCircle(x, y, s, color);
      if (_moonPhase > 0.5f) {
          _gfx->fillArc(x, y, 0, s-1, 90, 270, color);
          if (_moonPhase > 0.7f) _gfx->drawArc(x, y, s-1, s-1, 270, 450, color);
      } else {
          _gfx->drawArc(x, y, s-1, s-1, 90, 270, color);
      }
    } else if (n == "Mercury") {
      _gfx->drawCircle(x, y + 1, 3, color);
      _gfx->drawLine(x, y + 4, x, y + 7, color);
      _gfx->drawLine(x - 2, y + 5, x + 2, y + 5, color);
    } else if (n == "Venus") {
      _gfx->drawCircle(x, y - 2, 3, color);
      _gfx->drawLine(x, y + 1, x, y + 5, color);
      _gfx->drawLine(x - 2, y + 3, x + 2, y + 3, color);
    } else if (n == "Mars") {
      _gfx->drawCircle(x, y + 2, 3, color);
      _gfx->drawLine(x + 2, y - 2, x + 5, y - 5, color);
    } else if (n == "Jupiter") {
      _gfx->drawLine(x - 2, y - 4, x - 2, y + 4, color);
      _gfx->drawLine(x - 4, y + 1, x + 1, y + 1, color);
    } else if (n == "Saturn") {
      _gfx->drawLine(x - 2, y - 5, x - 2, y + 3, color);
      _gfx->drawArc(x, y + 1, 3, 3, 0, 180, color);
    } else {
      _gfx->fillCircle(x, y, 2, color);
    }
  }

  void drawSignGlyph(int index, int x, int y, uint16_t color) {
    int s = 5; 
    switch (index) {
    case 0: _gfx->drawArc(x - s, y, s, s, 180, 360, color); _gfx->drawLine(x, y, x, y + s, color); break;
    case 1: _gfx->drawCircle(x, y + 2, s - 2, color); _gfx->drawArc(x, y - 2, s, s, 180, 360, color); break;
    case 2: _gfx->drawLine(x - 2, y - s, x - 2, y + s, color); _gfx->drawLine(x + 2, y - s, x + 2, y + s, color); break;
    case 3: _gfx->drawCircle(x - 3, y - 2, 2, color); _gfx->drawCircle(x + 3, y + 2, 2, color); break;
    case 4: _gfx->drawCircle(x - 2, y + 2, 2, color); _gfx->drawArc(x + 2, y, 4, 4, 90, 360, color); break;
    case 5: _gfx->drawLine(x-4, y-4, x-4, y+4, color); _gfx->drawArc(x-1, y-1, 3, 3, 180, 360, color); break;
    case 6: _gfx->drawArc(x, y, s, s, 180, 360, color); _gfx->drawLine(x - 6, y + 3, x + 6, y + 3, color); break;
    case 7: _gfx->drawLine(x-4, y-4, x-4, y+4, color); _gfx->drawArc(x-1, y-1, 3, 3, 180, 360, color); _gfx->drawLine(x+2, y+2, x+4, y, color); break;
    case 8: _gfx->drawLine(x - 4, y + 4, x + 4, y - 4, color); _gfx->drawLine(x, y, x + 4, y - 4, color); break;
    case 9: _gfx->drawLine(x - 4, y - 4, x, y + 4, color); _gfx->drawLine(x, y + 4, x + 4, y, color); break;
    case 10: _gfx->drawLine(x-4, y-2, x, y-4, color); _gfx->drawLine(x, y-4, x+4, y-2, color); break;
    case 11: _gfx->drawArc(x - 3, y, 4, 4, 90, 270, color); _gfx->drawArc(x + 3, y, 4, 4, 270, 450, color); break;
    }
  }

  const char* getRoman(int n) {
    static const char* r[] = {"I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"};
    return (n >= 1 && n <= 12) ? r[n-1] : "?";
  }

public:
  AstroUI(lgfx::LGFX_Device *gfx) : _gfx(gfx) {}

  void setMoonVoid(bool isVoid) { _moonVoid = isVoid; }
  void setFlashState(bool state) { _flashState = state; }
  void setMoonSignIndex(int index) { _moonSignIndex = index; }
  void setMoonPhase(float phase) { _moonPhase = phase; }
  void setAscendant(float asc) { _ascendant = asc; }

  void nextTheme() { currentThemeIndex = (currentThemeIndex + 1) % 8; }

  void drawWheel() {
    Theme t = themes[currentThemeIndex];
    _gfx->fillScreen(t.bg);
    
    uint16_t ringCol = 0x3186; // Lighter grey for visibility
    _gfx->drawCircle(centerX, centerY, outerRingRadius, ringCol);
    _gfx->drawCircle(centerX, centerY, innerRingRadius, ringCol);

    for (int i = 0; i < 12; i++) {
      float startAngle = i * 30.0f;
      float radLine = getAngle(startAngle);
      
      // Sign divider lines
      _gfx->drawLine(
        centerX + innerRingRadius * cos(radLine), centerY + innerRingRadius * sin(radLine),
        centerX + outerRingRadius * cos(radLine), centerY + outerRingRadius * sin(radLine),
        ringCol
      );

      // Sign glyphs centered in the ring
      float radGlyph = getAngle(startAngle + 15.0f);
      int tx = centerX + 100 * cos(radGlyph);
      int ty = centerY + 100 * sin(radGlyph);
      
      if (!(i == _moonSignIndex && _moonVoid && !_flashState)) {
        uint16_t color;
        switch (i % 4) {
          case 0: color = t.fire; break;
          case 1: color = t.earth; break;
          case 2: color = t.air; break;
          default: color = t.water; break;
        }
        drawSignGlyph(i, tx, ty, color);
      }
    }
  }

  void drawHouseCusps(const std::vector<float>& houses, uint16_t color) {
    if (houses.empty()) return;
    _gfx->setTextDatum(lgfx::v1::middle_center);
    
    for (size_t i = 0; i < houses.size(); i++) {
        float rad = getAngle(houses[i]);
        
        // Cusp lines from inner ring inward
        int x1 = centerX + innerRingRadius * cos(rad);
        int y1 = centerY + innerRingRadius * sin(rad);
        int x2 = centerX + 20 * cos(rad); 
        int y2 = centerY + 20 * sin(rad);
        
        uint16_t hColor = color;
        if (i == 0 || i == 6) hColor = 0xF800; // Red for ASC/DSC
        else if (i == 3 || i == 9) hColor = 0x07E0; // Green for IC/MC

        _gfx->drawLine(x1, y1, x2, y2, hColor);
        
        // Label position: middle of the house segment
        float hStart = houses[i];
        float hEnd = (i < houses.size() - 1) ? houses[i+1] : houses[0];
        
        float diff = hEnd - hStart;
        if (diff < 0) diff += 360.0f;
        float midAngle = hStart + (diff / 2.0f);
        
        float radLabel = getAngle(midAngle);
        int lx = centerX + 50 * cos(radLabel);
        int ly = centerY + 50 * sin(radLabel);
        
        _gfx->setTextColor(hColor);
        _gfx->drawString(getRoman(i+1), lx, ly);
    }
  }

  void drawAspect(float deg1, float deg2, uint16_t color, float progress) {
    float r1 = getAngle(deg1);
    float r2 = getAngle(deg2);
    int x1 = centerX + 40 * cos(r1); int y1 = centerY + 40 * sin(r1);
    int x2 = centerX + 40 * cos(r2); int y2 = centerY + 40 * sin(r2);
    _gfx->drawLine(x1, y1, x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress, color);
  }

  void drawPlanet(const char *name, float degree, uint16_t color) {
    if (String(name) == "Moon" && _moonVoid && !_flashState) return;
    float rad = getAngle(degree);
    drawPlanetGlyph(name, centerX + 75 * cos(rad), centerY + 75 * sin(rad), color);
  }

  void drawStatus(const char *status) {
    _gfx->setTextColor(themes[currentThemeIndex].text);
    _gfx->setTextDatum(lgfx::v1::bottom_center);
    _gfx->drawString(status, centerX, centerY + 30);
  }
};

#endif
