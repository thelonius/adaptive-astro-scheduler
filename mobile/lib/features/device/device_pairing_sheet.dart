/// Шторка поиска и подключения к часам AstroClock.
///
/// При первом сопряжении система сама показывает диалог с 6-значным кодом —
/// его нужно сверить с тем, что появится на экране часов. Дальше приложение
/// только ждёт результата, рисовать код самому не нужно.
library;

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
  bool _connecting = false;
  String? _error;

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
    if (mounted) setState(() {});
  }

  Future<void> _startScan() async {
    final Map<Permission, PermissionStatus> statuses = await <Permission>[
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ].request();
    if (statuses.values.any((PermissionStatus s) => !s.isGranted)) {
      setState(() =>
          _error = 'Нужен доступ к Bluetooth, чтобы найти часы');
      return;
    }
    setState(() => _error = null);
    await widget.controller.startScan();
  }

  Future<void> _connect(ScanResult r) async {
    setState(() {
      _connecting = true;
      _error = null;
    });
    try {
      await widget.controller.connect(r);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) {
        setState(() => _error =
            'Не удалось подключиться. Сверьте код на часах и телефоне '
            'и попробуйте снова');
      }
    } finally {
      if (mounted) setState(() => _connecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final List<ScanResult> results = widget.controller.scanResults;

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
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_error!,
                style: TextStyle(color: theme.colorScheme.error)),
          ),
        if (_connecting)
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
              onTap: () => _connect(r),
            ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: widget.controller.isScanning ? null : _startScan,
          child: const Text('Искать снова'),
        ),
      ],
    );
  }
}
