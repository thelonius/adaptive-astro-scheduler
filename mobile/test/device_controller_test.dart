library;

import 'package:astro_clock/state/device_controller.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('matchesScanResult по имени в advName', () {
    final ScanResult r = ScanResult(
      device: BluetoothDevice.fromId('AA:BB:CC:DD:EE:FF'),
      advertisementData: AdvertisementData(
        advName: 'AstroClock',
        appearance: null,
        txPowerLevel: null,
        connectable: true,
        manufacturerData: <int, List<int>>{},
        serviceData: <Guid, List<int>>{},
        serviceUuids: <Guid>[],
      ),
      rssi: -50,
      timeStamp: DateTime.now(),
    );
    expect(DeviceController.matchesScanResult(r), isTrue);
  });

  test('matchesScanResult по UUID сервиса без имени', () {
    final ScanResult r = ScanResult(
      device: BluetoothDevice.fromId('AA:BB:CC:DD:EE:FF'),
      advertisementData: AdvertisementData(
        advName: '',
        appearance: null,
        txPowerLevel: null,
        connectable: true,
        manufacturerData: <int, List<int>>{},
        serviceData: <Guid, List<int>>{},
        serviceUuids: <Guid>[DeviceController.serviceUuid],
      ),
      rssi: -50,
      timeStamp: DateTime.now(),
    );
    expect(DeviceController.matchesScanResult(r), isTrue);
  });

  test('matchesScanResult отвергает посторонние устройства', () {
    final ScanResult r = ScanResult(
      device: BluetoothDevice.fromId('AA:BB:CC:DD:EE:FF'),
      advertisementData: AdvertisementData(
        advName: 'NothingEar',
        appearance: null,
        txPowerLevel: null,
        connectable: true,
        manufacturerData: <int, List<int>>{},
        serviceData: <Guid, List<int>>{},
        serviceUuids: <Guid>[],
      ),
      rssi: -50,
      timeStamp: DateTime.now(),
    );
    expect(DeviceController.matchesScanResult(r), isFalse);
  });
}
