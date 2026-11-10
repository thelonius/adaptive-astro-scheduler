/// Шторка поиска и подключения к часам AstroClock.
///
/// При первом сопряжении система сама показывает диалог с 6-значным кодом —
/// его нужно сверить с тем, что появится на экране часов. Дальше приложение
/// только ждёт результата, рисовать код самому не нужно.
library;

import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../state/device_controller.dart';

Future<void> showDevicePairingSheet(
    BuildContext context, DeviceController controller) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (BuildContext context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.55,
      maxChildSize: 0.85,
      builder: (BuildContext context, ScrollController scrollController) =>
          _PairingBody(
        controller: controller,
        scrollController: scrollController,
      ),
    ),
  );
}

class _PairingBody extends StatefulWidget {
  final DeviceController controller;
  final ScrollController scrollController;
  const _PairingBody({required this.controller, required this.scrollController});

  @override
  State<_PairingBody> createState() => _PairingBodyState();
}

class _PairingBodyState extends State<_PairingBody> {
  String? _error;
  String? _status;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChange);
    _startScan();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChange);
    widget.controller.stopScan();
    super.dispose();
  }

  void _onChange() {
    if (!mounted) return;
    if (widget.controller.isPaired && widget.controller.isConnected) {
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      if (widget.controller.lastError != null) {
        _error = widget.controller.lastError;
      }
    });
  }

  Future<void> _startScan() async {
    final List<Permission> perms = <Permission>[
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ];
    // Android 6–11 без геолокации BLE-скан возвращает пустой список.
    if (Platform.isAndroid) {
      perms.add(Permission.locationWhenInUse);
    }
    final Map<Permission, PermissionStatus> statuses = await perms.request();
    if (!statuses[Permission.bluetoothScan]!.isGranted ||
        !statuses[Permission.bluetoothConnect]!.isGranted) {
      setState(() =>
          _error = 'Нужен доступ к Bluetooth, чтобы найти часы');
      return;
    }
    setState(() {
      _error = null;
      _status = null;
    });
    await widget.controller.startScan();
  }

  Future<void> _connect(ScanResult r) async {
    setState(() {
      _error = null;
      _status = 'Подключение… Сверьте код на часах и в системном диалоге '
          'Android, затем подтвердите на обоих устройствах.';
    });
    try {
      await widget.controller.connect(r);
      if (mounted && widget.controller.isPaired) {
        Navigator.of(context).pop();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = widget.controller.lastError ??
            'Не удалось подключиться. Сверьте код на часах и телефоне '
                'и попробуйте снова');
      }
    } finally {
      if (mounted) setState(() => _status = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final List<ScanResult> results = widget.controller.scanResults;
    final bool busy =
        widget.controller.isConnecting || widget.controller.isScanning;

    return ListView(
      controller: widget.scrollController,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
      children: <Widget>[
        Text('Поиск часов', style: theme.textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          'Часы должны быть включены и рядом. При первом подключении на их '
          'экране появится код — сверьте его с тем, что покажет телефон, '
          'и подтвердите на обоих устройствах.',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 16),
        if (_status != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_status!, style: theme.textTheme.bodyMedium),
          ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_error!,
                style: TextStyle(color: theme.colorScheme.error)),
          ),
        if (widget.controller.isConnecting)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (widget.controller.isScanning && results.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (results.isEmpty)
          Text('Часы не найдены', style: theme.textTheme.bodyMedium)
        else
          for (final ScanResult r in results)
            ListTile(
              title: const Text('AstroClock'),
              subtitle: Text(r.device.remoteId.str),
              trailing: const Icon(Icons.bluetooth_outlined),
              enabled: !widget.controller.isConnecting,
              onTap: () => _connect(r),
            ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: busy ? null : _startScan,
          child: const Text('Искать снова'),
        ),
      ],
    );
  }
}
