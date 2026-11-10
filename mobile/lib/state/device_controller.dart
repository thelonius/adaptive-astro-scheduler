/// Пейринг с часами AstroClock по BLE и переключение WiFi на них.
///
/// UUID сервиса и характеристик, формат байтов — см.
/// AstroClock/docs/ble-protocol.md, общий источник истины для прошивки и
/// приложения. Пейринг (bonding с passkey) делает сама ОС при первом
/// подключении к защищённой характеристике — здесь только GATT-обмен поверх
/// уже установленного/устанавливаемого соединения.
library;

import 'dart:async';
import 'dart:convert' show utf8;
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

import '../data/settings.dart';

/// Зеркалит байт-протокол WiFi Status. unknown — до первого чтения
/// характеристики или после разрыва связи.
enum WifiStatus { off, connecting, connected, synced, error, unsupported, unknown }

WifiStatus _wifiStatusFromByte(int b) {
  switch (b) {
    case 0:
      return WifiStatus.off;
    case 1:
      return WifiStatus.connecting;
    case 2:
      return WifiStatus.connected;
    case 3:
      return WifiStatus.synced;
    case 4:
      return WifiStatus.error;
    case 5:
      return WifiStatus.unsupported;
    default:
      return WifiStatus.unknown;
  }
}

class DeviceController extends ChangeNotifier {
  static final Guid serviceUuid = Guid('6b4a6604-c005-4c8e-bd10-66de4f397125');
  static final Guid commandUuid = Guid('4452159d-6713-4a4a-be64-f8497ae1de73');
  static final Guid statusUuid = Guid('ba810c70-a319-474d-bb7c-3ed0d6b62537');
  static final Guid configUuid = Guid('8c3e9a12-4f5b-4d6a-9e7c-1a2b3c4d5e6f');

  static const int _maxSsidBytes = 32;
  static const int _maxPassBytes = 64;

  static const String advertisedName = 'AstroClock';

  /// Сколько ждать системный диалог с PIN при первом сопряжении.
  static const Duration bondTimeout = Duration(seconds: 120);

  /// Совпадение с рекламой часов: имя или UUID сервиса в scan response.
  /// ESP32 часто кладёт UUID только во второй пакет — жёсткий фильтр по
  /// advName одному ломает поиск на части телефонов.
  static bool matchesScanResult(ScanResult result) {
    final AdvertisementData adv = result.advertisementData;
    if (adv.advName == advertisedName) return true;
    if (result.device.platformName == advertisedName) return true;
    for (final Guid uuid in adv.serviceUuids) {
      if (uuid == serviceUuid) return true;
    }
    return false;
  }

  DeviceController(this.settings);

  final Settings settings;

  bool _isScanning = false;
  bool _isConnecting = false;
  List<ScanResult> _scanResults = <ScanResult>[];
  BluetoothDevice? _device;
  BluetoothConnectionState _connectionState =
      BluetoothConnectionState.disconnected;
  WifiStatus _wifiStatus = WifiStatus.unknown;
  BluetoothCharacteristic? _commandChar;
  BluetoothCharacteristic? _configChar;
  bool _isConfiguringWifi = false;
  String? _lastError;

  StreamSubscription<List<ScanResult>>? _scanSub;
  StreamSubscription<BluetoothConnectionState>? _connectionSub;
  StreamSubscription<List<int>>? _statusSub;

  bool get isScanning => _isScanning;
  bool get isConnecting => _isConnecting;
  List<ScanResult> get scanResults => _scanResults;
  BluetoothConnectionState get connectionState => _connectionState;
  WifiStatus get wifiStatus => _wifiStatus;
  bool get hasWifiConfig => _configChar != null;
  bool get isConfiguringWifi => _isConfiguringWifi;
  String? get lastError => _lastError;
  bool get isPaired => settings.pairedDeviceId != null;
  String? get pairedDeviceName => settings.pairedDeviceName;
  bool get isConnected =>
      _connectionState == BluetoothConnectionState.connected;

  Future<void> startScan() async {
    if (_isScanning) return;
    _scanResults = <ScanResult>[];
    _isScanning = true;
    _lastError = null;
    notifyListeners();

    await _scanSub?.cancel();
    _scanSub = FlutterBluePlus.scanResults.listen((List<ScanResult> results) {
      _scanResults =
          results.where(matchesScanResult).toList(growable: false);
      notifyListeners();
    });

    // Без withServices: на Android аппаратный фильтр по UUID иногда не
    // видит ESP32, если UUID только в scan response.
    await FlutterBluePlus.startScan(
      timeout: const Duration(seconds: 15),
      androidUsesFineLocation: false,
    );
    _isScanning = false;
    notifyListeners();
  }

  Future<void> stopScan() async {
    await FlutterBluePlus.stopScan();
    _isScanning = false;
    notifyListeners();
  }

  Future<void> connect(ScanResult result) => _connectDevice(result.device);

  /// Вызывается один раз при старте приложения, без ожидания результата:
  /// если часы рядом и уже сопряжены, ОС переподключит без нового ввода кода.
  Future<void> reconnectToSaved() async {
    final String? id = settings.pairedDeviceId;
    if (id == null) return;
    try {
      await _connectDevice(BluetoothDevice.fromId(id));
    } catch (e) {
      _lastError = _humanizeError(e);
      notifyListeners();
    }
  }

  Future<void> _connectDevice(BluetoothDevice device) async {
    if (_isConnecting) return;

    _isConnecting = true;
    _lastError = null;
    _device = device;
    _wifiStatus = WifiStatus.unknown;
    _commandChar = null;
    _configChar = null;
    notifyListeners();

    try {
      await stopScan();
      await _connectionSub?.cancel();
      _connectionSub =
          device.connectionState.listen((BluetoothConnectionState state) {
        _connectionState = state;
        if (state == BluetoothConnectionState.disconnected) {
          _wifiStatus = WifiStatus.unknown;
          _commandChar = null;
          _configChar = null;
        }
        notifyListeners();
      });

      await device.connect(timeout: const Duration(seconds: 35));

      // Явно ждём bonding на Android: иначе setNotifyValue/read с 15-сек
      // таймаутом падают, пока пользователь вводит PIN — на часах уже paired,
      // а приложение считает, что подключение не удалось.
      if (!kIsWeb && Platform.isAndroid) {
        await device.createBond(timeout: bondTimeout.inSeconds);
      }

      await _setupGattWithRetry(device);

      // Сохраняем только после успешного discoverServices: значит GATT-обмен
      // (а с ним и bonding, если это первое подключение) состоялся
      final String name = device.platformName.isNotEmpty
          ? device.platformName
          : advertisedName;
      await settings.setPairedDevice(device.remoteId.str, name);
    } catch (e) {
      _lastError = _humanizeError(e);
      rethrow;
    } finally {
      _isConnecting = false;
      notifyListeners();
    }
  }

  Future<void> _setupGattWithRetry(BluetoothDevice device) async {
    Object? lastError;
    for (int attempt = 0; attempt < 3; attempt++) {
      try {
        if (device.isDisconnected) {
          await device.connect(timeout: const Duration(seconds: 35));
        }
        await _setupGatt(device);
        return;
      } catch (e) {
        lastError = e;
        if (attempt == 2) rethrow;
        await Future<void>.delayed(Duration(milliseconds: 400 * (attempt + 1)));
      }
    }
    throw lastError ?? StateError('GATT setup failed');
  }

  Future<void> _setupGatt(BluetoothDevice device) async {
    await _statusSub?.cancel();
    _statusSub = null;
    _commandChar = null;
    _configChar = null;

    final List<BluetoothService> services = await device.discoverServices();
    BluetoothCharacteristic? statusChar;

    for (final BluetoothService service in services) {
      if (service.uuid != serviceUuid) continue;
      for (final BluetoothCharacteristic c in service.characteristics) {
        if (c.uuid == commandUuid) {
          _commandChar = c;
        } else if (c.uuid == statusUuid) {
          statusChar = c;
        } else if (c.uuid == configUuid) {
          _configChar = c;
        }
      }
    }

    if (_commandChar == null || statusChar == null) {
      throw StateError('Сервис AstroClock не найден на устройстве');
    }

    await statusChar.setNotifyValue(true, timeout: 30);
    _statusSub = statusChar.lastValueStream.listen((List<int> value) {
      if (value.isNotEmpty) _wifiStatus = _wifiStatusFromByte(value[0]);
      notifyListeners();
    });
    final List<int> initial = await statusChar.read(timeout: 30);
    if (initial.isNotEmpty) _wifiStatus = _wifiStatusFromByte(initial[0]);
    notifyListeners();
  }

  String _humanizeError(Object error) {
    final String text = error.toString();
    if (text.contains('createBond') ||
        text.contains('bond') ||
        text.contains('pair')) {
      return 'Не удалось сопрячь. Сверьте код на часах и телефоне '
          'и попробуйте снова';
    }
    if (text.contains('timeout') || text.contains('Timeout')) {
      return 'Часы не ответили вовремя. Поднесите ближе и попробуйте снова';
    }
    if (text.contains('device is not connected') ||
        text.contains('disconnected')) {
      return 'Связь оборвалась. Попробуйте подключиться ещё раз';
    }
    return 'Не удалось подключиться к часам';
  }

  /// Записать SSID и пароль на часы и подключиться. Требует характеристику
  /// WiFi Config и активное BLE-соединение.
  Future<void> configureWifi(String ssid, String pass) async {
    final String trimmedSsid = ssid.trim();
    if (trimmedSsid.isEmpty) {
      _lastError = 'Введите имя сети WiFi';
      notifyListeners();
      return;
    }

    final List<int> ssidBytes = utf8.encode(trimmedSsid);
    final List<int> passBytes = utf8.encode(pass);
    if (ssidBytes.length > _maxSsidBytes) {
      _lastError = 'Имя сети длиннее $_maxSsidBytes байт в UTF-8';
      notifyListeners();
      return;
    }
    if (passBytes.length > _maxPassBytes) {
      _lastError = 'Пароль длиннее $_maxPassBytes байт в UTF-8';
      notifyListeners();
      return;
    }

    if (!isConnected) {
      final String? id = settings.pairedDeviceId;
      if (id == null) {
        _lastError = 'Сначала подключите часы по Bluetooth';
        notifyListeners();
        return;
      }
      try {
        await _connectDevice(_device ?? BluetoothDevice.fromId(id));
      } catch (e) {
        _lastError = _humanizeError(e);
        notifyListeners();
        return;
      }
    }

    final BluetoothCharacteristic? c = _configChar;
    if (c == null) {
      _lastError =
          'Часы не поддерживают настройку WiFi — нужна более новая прошивка';
      notifyListeners();
      return;
    }

    _isConfiguringWifi = true;
    _lastError = null;
    notifyListeners();

    try {
      await c.write(<int>[0x01, ...ssidBytes]);
      await c.write(<int>[0x02, ...passBytes]);
      await c.write(<int>[0x03]);
      await settings.setLastWifiSsid(trimmedSsid);
      _lastError = null;
    } catch (e) {
      _lastError = _humanizeError(e);
    } finally {
      _isConfiguringWifi = false;
      notifyListeners();
    }
  }

  /// Вкл/выкл WiFi на часах. Требует настроенный WiFi и активное BLE.
  Future<void> setWifiOn(bool on) async {
    if (_wifiStatus == WifiStatus.unsupported) {
      _lastError = hasWifiConfig
          ? 'Сначала сохраните сеть WiFi ниже'
          : 'На часах нет WiFi — нужна прошивка с поддержкой сети';
      notifyListeners();
      return;
    }

    if (!isConnected) {
      final String? id = settings.pairedDeviceId;
      if (id == null) {
        _lastError = 'Сначала подключите часы по Bluetooth';
        notifyListeners();
        return;
      }
      try {
        await _connectDevice(_device ?? BluetoothDevice.fromId(id));
      } catch (e) {
        _lastError = _humanizeError(e);
        notifyListeners();
        return;
      }
    }

    final BluetoothCharacteristic? c = _commandChar;
    if (c == null) {
      _lastError = 'Сервис AstroClock недоступен — попробуйте переподключиться';
      notifyListeners();
      return;
    }

    try {
      // Защищённая характеристика: write with response надёжнее на Android.
      await c.write(<int>[on ? 0x01 : 0x00]);
      _lastError = null;
      notifyListeners();
    } catch (e) {
      _lastError = _humanizeError(e);
      notifyListeners();
    }
  }

  Future<void> disconnect() async {
    await _device?.disconnect();
  }

  Future<void> forgetDevice() async {
    await disconnect();
    await settings.setPairedDevice(null, null);
    _device = null;
    _commandChar = null;
    _configChar = null;
    _wifiStatus = WifiStatus.unknown;
    _connectionState = BluetoothConnectionState.disconnected;
    _lastError = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _scanSub?.cancel();
    _connectionSub?.cancel();
    _statusSub?.cancel();
    super.dispose();
  }
}
