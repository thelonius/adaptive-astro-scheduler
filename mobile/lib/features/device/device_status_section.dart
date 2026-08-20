/// Секция «Часы AstroClock» в настройках: статус пейринга и переключатель
/// WiFi на устройстве.
library;

import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

import '../../state/device_controller.dart';
import 'device_pairing_sheet.dart';

class DeviceStatusSection extends StatelessWidget {
  final DeviceController controller;
  const DeviceStatusSection({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    final bool connected =
        controller.connectionState == BluetoothConnectionState.connected;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 4),
          child: Text(
            'ЧАСЫ ASTROCLOCK',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 1.2,
                  color: Theme.of(context).colorScheme.primary,
                ),
          ),
        ),
        if (!controller.isPaired)
          ListTile(
            title: const Text('Часы не привязаны'),
            subtitle: const Text('Найти и сопрячь по Bluetooth'),
            trailing: const Icon(Icons.bluetooth_outlined),
            onTap: () => showDevicePairingSheet(context, controller),
          )
        else ...<Widget>[
          ListTile(
            title: Text(controller.pairedDeviceName?.isNotEmpty == true
                ? controller.pairedDeviceName!
                : 'AstroClock'),
            subtitle: Text(connected
                ? 'подключены'
                : 'не в сети — нажмите, чтобы переподключиться'),
            trailing: Icon(connected
                ? Icons.bluetooth_connected
                : Icons.bluetooth_disabled),
            onTap: connected ? null : controller.reconnectToSaved,
          ),
          SwitchListTile(
            title: const Text('WiFi на часах'),
            subtitle: Text(_wifiLabel(controller.wifiStatus)),
            value: controller.wifiStatus == WifiStatus.connecting ||
                controller.wifiStatus == WifiStatus.connected ||
                controller.wifiStatus == WifiStatus.synced,
            onChanged: connected ? controller.setWifiOn : null,
          ),
          ListTile(
            title: const Text('Забыть устройство'),
            textColor: const Color(0xFFFF9A3C),
            onTap: controller.forgetDevice,
          ),
        ],
      ],
    );
  }

  String _wifiLabel(WifiStatus s) {
    switch (s) {
      case WifiStatus.off:
        return 'выключен';
      case WifiStatus.connecting:
        return 'подключение...';
      case WifiStatus.connected:
        return 'подключено, ждём NTP';
      case WifiStatus.synced:
        return 'синхронизировано';
      case WifiStatus.error:
        return 'ошибка подключения';
      case WifiStatus.unsupported:
        return 'прошивка собрана без WiFi';
      case WifiStatus.unknown:
        return '—';
    }
  }
}
