/// Секция «Часы AstroClock» в настройках: статус пейринга и переключатель
/// WiFi на устройстве.
library;

import 'package:flutter/material.dart';

import '../../state/device_controller.dart';
import 'device_pairing_sheet.dart';

class DeviceStatusSection extends StatelessWidget {
  final DeviceController controller;
  const DeviceStatusSection({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    final bool connected = controller.isConnected;
    final bool connecting = controller.isConnecting;

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
            onTap: connecting
                ? null
                : () => showDevicePairingSheet(context, controller),
          )
        else ...<Widget>[
          ListTile(
            title: Text(controller.pairedDeviceName?.isNotEmpty == true
                ? controller.pairedDeviceName!
                : 'AstroClock'),
            subtitle: Text(_connectionLabel(connected, connecting)),
            trailing: Icon(connecting
                ? Icons.bluetooth_searching
                : connected
                    ? Icons.bluetooth_connected
                    : Icons.bluetooth_disabled),
            onTap: (connected || connecting)
                ? null
                : controller.reconnectToSaved,
          ),
          if (controller.lastError != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(
                controller.lastError!,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontSize: 13,
                ),
              ),
            ),
          SwitchListTile(
            title: const Text('WiFi на часах'),
            subtitle: Text(_wifiSubtitle(controller)),
            value: controller.wifiStatus == WifiStatus.connecting ||
                controller.wifiStatus == WifiStatus.connected ||
                controller.wifiStatus == WifiStatus.synced,
            onChanged: controller.wifiStatus == WifiStatus.unsupported
                ? null
                : controller.setWifiOn,
          ),
          if (controller.wifiStatus == WifiStatus.unsupported &&
              controller.hasWifiConfig)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(
                'WiFi ещё не настроен на часах — введите сеть ниже '
                'и отправьте по Bluetooth.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          _WifiSetupSection(controller: controller),
          ListTile(
            title: const Text('Забыть устройство'),
            textColor: const Color(0xFFFF9A3C),
            onTap: controller.forgetDevice,
          ),
        ],
      ],
    );
  }

  String _connectionLabel(bool connected, bool connecting) {
    if (connecting) return 'подключение…';
    if (connected) return 'подключены';
    return 'не в сети — нажмите, чтобы переподключиться';
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
        return 'WiFi не настроен';
      case WifiStatus.unknown:
        return '—';
    }
  }

  String _wifiSubtitle(DeviceController controller) {
    final String status = _wifiLabel(controller.wifiStatus);
    if (controller.wifiStatus == WifiStatus.unsupported) {
      if (controller.hasWifiConfig) {
        return '$status — можно настроить через Bluetooth ниже';
      }
      return '$status — нужна прошивка с поддержкой WiFi';
    }
    if (!controller.isConnected) {
      return '$status — включится после подключения по Bluetooth';
    }
    return status;
  }
}

class _WifiSetupSection extends StatefulWidget {
  final DeviceController controller;
  const _WifiSetupSection({required this.controller});

  @override
  State<_WifiSetupSection> createState() => _WifiSetupSectionState();
}

class _WifiSetupSectionState extends State<_WifiSetupSection> {
  late final TextEditingController _ssidController;
  late final TextEditingController _passController;

  @override
  void initState() {
    super.initState();
    _ssidController = TextEditingController(
      text: widget.controller.settings.lastWifiSsid ?? '',
    );
    _passController = TextEditingController();
  }

  @override
  void didUpdateWidget(covariant _WifiSetupSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    final String? saved = widget.controller.settings.lastWifiSsid;
    if (saved != null &&
        _ssidController.text.isEmpty &&
        saved != _ssidController.text) {
      _ssidController.text = saved;
    }
  }

  @override
  void dispose() {
    _ssidController.dispose();
    _passController.dispose();
    super.dispose();
  }

  Future<void> _saveAndConnect() async {
    FocusScope.of(context).unfocus();
    await widget.controller.configureWifi(
      _ssidController.text,
      _passController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final DeviceController controller = widget.controller;
    final bool canConfigure =
        controller.isConnected && controller.hasWifiConfig;
    final bool busy = controller.isConfiguringWifi || controller.isConnecting;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'Настройка WiFi',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _ssidController,
            enabled: !busy,
            decoration: const InputDecoration(
              labelText: 'Имя сети (SSID)',
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.next,
            autocorrect: false,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _passController,
            enabled: !busy,
            decoration: const InputDecoration(
              labelText: 'Пароль',
              border: OutlineInputBorder(),
            ),
            obscureText: true,
            autocorrect: false,
            onSubmitted: (_) {
              if (canConfigure && !busy) _saveAndConnect();
            },
          ),
          const SizedBox(height: 12),
          if (!controller.isConnected)
            Text(
              'Подключите часы по Bluetooth, чтобы отправить настройки.',
              style: Theme.of(context).textTheme.bodySmall,
            )
          else if (!controller.hasWifiConfig)
            Text(
              'Эта прошивка не поддерживает настройку WiFi с телефона.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          FilledButton(
            onPressed: canConfigure && !busy ? _saveAndConnect : null,
            child: busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Сохранить и подключить'),
          ),
        ],
      ),
    );
  }
}
