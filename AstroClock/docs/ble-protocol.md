# BLE-протокol: пейринг и управление WiFi

Канал связи между часами и приложением. WiFi-креды задаются с телефона через
BLE и хранятся в NVS (namespace `astro`, ключи `wifi_ssid`/`wifi_pass`).
Compile-time `ASTRO_WIFI_SSID` остаётся запасным вариантом для разработки.

## Сервис

- UUID: `6b4a6604-c005-4c8e-bd10-66de4f397125`
- Advertised name: `AstroClock`
- Security: bonding, MITM, Secure Connections, IO capability Display Only.
  Часы показывают 6-значный код через `ui.drawStatus()`, телефон подтверждает
  в системном диалоге Android. После первого сопряжения обе стороны хранят
  bond и код не спрашивают повторно.

## Характеристики

### WiFi Command — `4452159d-6713-4a4a-be64-f8497ae1de73`

Write, Write No Response. 1 байт:

- `0x00` — выключить WiFi
- `0x01` — включить и держать включённым

Это отдельный ручной режим поверх старого поведения (WiFi включается при
загрузке только ради NTP и сразу гасится). Неверная длина или значение —
игнорируется, статус не меняется.

В сборке с `ASTRO_ENABLE_OTA` WiFi и так держится включённым весь аптайм ради
заливки по воздуху. `0x00` в такой сборке — no-op: статус всегда
`UNSUPPORTED`, разрывать OTA-канал командой с телефона не нужно. Сборка с OTA
и так временная, для разработки.

### WiFi Config — `8c3e9a12-4f5b-4d6a-9e7c-1a2b3c4d5e6f`

Write, Write No Response. Encrypted + authenticated (bonded).

Формат: `byte0 = opcode`, далее UTF-8 payload:

| Opcode | Payload | Действие |
|---|---|---|
| `0x01` | SSID, 1–32 байта | сохранить SSID в NVS |
| `0x02` | пароль, 0–64 байта | сохранить пароль в NVS |
| `0x03` | нет | подключиться с сохранёнными кредами, держать WiFi включённым |
| `0x04` | нет | стереть креды из NVS и выключить WiFi |

Неверная длина или opcode — игнорируется. `0x03` без SSID в NVS (и без
compile-time `WIFI_SSID`) — no-op.

Типичная последовательность с телефона: `0x01` + SSID → `0x02` + пароль →
`0x03`.

### WiFi Status — `ba810c70-a319-474d-bb7c-3ed0d6b62537`

Read, Notify. 1 байт-энум:

| Значение | Смысл |
|---|---|
| `0` | OFF |
| `1` | CONNECTING |
| `2` | CONNECTED (ассоциация есть, NTP ещё нет) |
| `3` | SYNCED (NTP успешен) |
| `4` | ERROR (не подключился или NTP не ответил за таймаут) |
| `5` | UNSUPPORTED (нет SSID ни в NVS, ни в compile-time кредах; либо сборка с OTA) |

Notify шлётся при каждом изменении значения, независимо от того, кто
инициировал переход (команда с телефона или автоматический синк при
загрузке).


[You have received this identical output 3 times. Re-reading '/Users/eddubnitsky/adaptive-astro-scheduler/AstroClock/docs/ble-protocol.md:raw' will not change it — use a narrower selector (path:A-B), or proceed with the edit.]