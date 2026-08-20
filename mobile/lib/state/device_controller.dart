/// Пейринг с часами AstroClock по BLE и переключение WiFi на них.
///
/// UUID сервиса и характеристик, формат байтов — см.
/// AstroClock/docs/ble-protocol.md, общий источник истины для прошивки и
/// приложения. Пейринг (bonding с passkey) делает сама ОС при первом
/// подключении к защищённой характеристике — здесь только GATT-обмен поверх
/// уже установленного/устанавливаемого соединения.
library;

import 'dart:async';

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

  static const String _advertisedName = 'AstroClock';

  DeviceController(this.settings);

  final Settings settings;

  bool _isScanning = false;
  List<ScanResult> _scanResults = <ScanResult>[];
  BluetoothDevice? _device;
  BluetoothConnectionState _connectionState =
      BluetoothConnectionState.disconnected;
  WifiStatus _wifiStatus = WifiStatus.unknown;
  BluetoothCharacteristic? _commandChar;

  StreamSubscription<List<ScanResult>>? _scanSub;
  StreamSubscription<BluetoothConnectionState>? _connectionSub;
  StreamSubscription<List<int>>? _statusSub;

  bool get isScanning => _isScanning;
  List<ScanResult> get scanResults => _scanResults;
  BluetoothConnectionState get connectionState => _connectionState;
  WifiStatus get wifiStatus => _wifiStatus;
  bool get isPaired => settings.pairedDeviceId != null;
  String? get pairedDeviceName => settings.pairedDeviceName;

  Future<void> startScan() async {
    if (_isScanning) return;
    _scanResults = <ScanResult>[];
    _isScanning = true;
    notifyListeners();

    await _scanSub?.cancel();
    _scanSub = FlutterBluePlus.scanResults.listen((List<ScanResult> results) {
      _scanResults = results
          .where((ScanResult r) =>
              r.advertisementData.advName == _advertisedName)
          .toList();
      notifyListeners();
    });

    await FlutterBluePlus.startScan(
      withServices: <Guid>[serviceUuid],
      timeout: const Duration(seconds: 15),
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
    await _connectDevice(BluetoothDevice.fromId(id));
  }

  Future<void> _connectDevice(BluetoothDevice device) async {
    _device = device;
    _wifiStatus = WifiStatus.unknown;

    await _connectionSub?.cancel();
    _connectionSub =
        device.connectionState.listen((BluetoothConnectionState state) {
      _connectionState = state;
      if (state == BluetoothConnectionState.disconnected) {
        _wifiStatus = WifiStatus.unknown;
        _commandChar = null;
      }
      notifyListeners();
    });

    await device.connect();
    final List<BluetoothService> services = await device.discoverServices();
    for (final BluetoothService service in services) {
      if (service.uuid != serviceUuid) continue;
      for (final BluetoothCharacteristic c in service.characteristics) {
        if (c.uuid == commandUuid) {
          _commandChar = c;
        } else if (c.uuid == statusUuid) {
          await c.setNotifyValue(true);
          await _statusSub?.cancel();
          _statusSub = c.lastValueStream.listen((List<int> value) {
            if (value.isNotEmpty) _wifiStatus = _wifiStatusFromByte(value[0]);
            notifyListeners();
          });
          final List<int> initial = await c.read();
          if (initial.isNotEmpty) _wifiStatus = _wifiStatusFromByte(initial[0]);
        }
      }
    }

    // Сохраняем только после успешного discoverServices: значит GATT-обмен
    // (а с ним и bonding, если это первое подключение) состоялся
    await settings.setPairedDevice(device.remoteId.str, device.platformName);
    notifyListeners();
  }

  Future<void> setWifiOn(bool on) async {
    final BluetoothCharacteristic? c = _commandChar;
    if (c == null) return;
    await c.write(<int>[on ? 0x01 : 0x00], withoutResponse: true);
  }

  Future<void> disconnect() async {
    await _device?.disconnect();
  }

  Future<void> forgetDevice() async {
    await disconnect();
    await settings.setPairedDevice(null, null);
    _device = null;
    _commandChar = null;
    _wifiStatus = WifiStatus.unknown;
    _connectionState = BluetoothConnectionState.disconnected;
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
