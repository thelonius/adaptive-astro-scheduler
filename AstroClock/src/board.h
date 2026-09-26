#pragma once
// Всё, чем платы отличаются друг от друга: панель, пины, размер экрана и
// периферия. Остальная прошивка про конкретное железо не знает и рисует в
// координатах, пересчитанных из 240x240 через layout::px().
//
// BOARD_AMOLED143 — LilyGO T-Display S3 AMOLED 1.43: ESP32-S3R8, круглый
// AMOLED 466x466 по QSPI, тач FT3168, RTC PCF8563. Без флага собирается
// прежняя плата: ESP32-C3 и GC9A01 240x240 по SPI.

#include <Arduino.h>
#define LGFX_USE_V1
#include <LovyanGFX.hpp>

#if defined(BOARD_AMOLED143)

#if defined(AMOLED_SH8601)
#include <lgfx/v1/panel/Panel_SH8601Z.hpp>
#else
#include <lgfx/v1/panel/Panel_CO5300.hpp>
#endif

namespace board {
constexpr int W = 466, H = 466;
// BOOT. Единственная механическая кнопка, которой можно пользоваться: вторая
// на плате сбрасывает контроллер
constexpr int BTN_PIN = 0;
constexpr int BACKLIGHT_PIN = -1;
// Питание панели. Пока на нём нет единицы, экран молчит при любой инициализации
constexpr int LCD_EN = 16;
constexpr int I2C_SDA = 7, I2C_SCL = 6;
// Прерывание тача. На той же линии сидит INT часов PCF8563, но будильник
// у RTC не включается, так что линию опускает только тач
constexpr int TP_INT = 9;
// Яркость AMOLED задаётся командой панели, подсветки нет. Полная не нужна:
// часы стоят в комнате, а пиксели выгорают быстрее на высокой яркости
constexpr uint8_t BRIGHTNESS = 200;
}  // namespace board

#define BOARD_HAS_TOUCH 1
#define BOARD_HAS_RTC 1
// Сглаженные шрифты и линии. Им нужен полный кадровый буфер, из которого
// читается фон для смешивания, а его даёт только PSRAM
#define BOARD_SMOOTH 1

// У 1.43 бывают две панели: DO0143FMST10 на CO5300 и DO0143FAT01 на SH8601.
// Маркировка на шлейфе. Наша плата на CO5300: с инициализацией SH8601 экран
// остаётся чёрным без единой ошибки в логе. CO5300 сдвинута на 6 столбцов
class LGFX : public lgfx::LGFX_Device {
#if defined(AMOLED_SH8601)
  lgfx::Panel_SH8601Z _panel;
#else
  lgfx::Panel_CO5300 _panel;
#endif
  lgfx::Bus_SPI _bus;

 public:
  LGFX(void) {
    {
      auto cfg = _bus.config();
      cfg.spi_host = SPI2_HOST;
      cfg.spi_mode = 0;
      // 80 МГц, предел SPI у S3: полный кадр уходит за ~11 мс против ~22 на
      // 40, и прокрутке текста это даёт вдвое больше кадров в секунду
      cfg.freq_write = 80000000;
      cfg.freq_read = 16000000;
      cfg.pin_sclk = 12;
      cfg.pin_io0 = 11;
      cfg.pin_io1 = 13;
      cfg.pin_io2 = 14;
      cfg.pin_io3 = 15;
      cfg.dma_channel = SPI_DMA_CH_AUTO;
      _bus.config(cfg);
      _panel.setBus(&_bus);
    }
    {
      auto cfg = _panel.config();
      cfg.pin_cs = 10;
      cfg.pin_rst = 17;
      cfg.panel_width = board::W;
      cfg.panel_height = board::H;
      cfg.memory_width = board::W;
      cfg.memory_height = board::H;
#if !defined(AMOLED_SH8601)
      cfg.offset_x = 6;
#endif
      cfg.readable = false;
      cfg.invert = false;
      _panel.config(cfg);
    }
    setPanel(&_panel);
  }
};

#else  // ESP32-C3 + GC9A01

namespace board {
constexpr int W = 240, H = 240;
constexpr int BTN_PIN = 9;
constexpr int BACKLIGHT_PIN = 3;
constexpr int LCD_EN = -1;
constexpr uint8_t BRIGHTNESS = 255;
}  // namespace board

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

#endif

namespace board {
// Питание панели и подсветка до tft.init(): SH8601 без LCD_EN не отвечает на
// команды инициализации
inline void powerOn() {
  if (LCD_EN >= 0) {
    pinMode(LCD_EN, OUTPUT);
    digitalWrite(LCD_EN, HIGH);
    delay(10);
  }
  if (BACKLIGHT_PIN >= 0) {
    pinMode(BACKLIGHT_PIN, OUTPUT);
    digitalWrite(BACKLIGHT_PIN, HIGH);
  }
  pinMode(BTN_PIN, INPUT_PULLUP);
}
}  // namespace board
