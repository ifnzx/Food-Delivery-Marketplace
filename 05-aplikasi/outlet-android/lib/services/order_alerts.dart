import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import 'api_client.dart';

/// Channel v2 — Importance.max (sama pola customer chat yang sudah terbukti di HP).
const _incomingChannelId = 'antarq_outlet_incoming_v2';
const _statusChannelId = 'antarq_outlet_status_v2';
const _selfTestKey = 'dk_outlet_notif_selftest_v2';

/// Notifikasi sistem Android (tray + suara + getar), pola sama customer Flutter.
class OutletOrderAlertService with WidgetsBindingObserver {
  OutletOrderAlertService(
    this._api, {
    this.onIncomingCount,
    this.onOpenOrders,
  });

  final ApiClient _api;
  final void Function(int count)? onIncomingCount;
  final VoidCallback? onOpenOrders;
  final _plugin = FlutterLocalNotificationsPlugin();
  final _seenIncoming = <String>{};
  final _seenPickup = <String>{};
  Timer? _timer;
  var _started = false;
  var _baseline = true;
  var _ready = false;

  Future<void> start() async {
    if (_started) return;
    _started = true;
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(
      const InitializationSettings(android: androidInit),
      onDidReceiveNotificationResponse: (_) => onOpenOrders?.call(),
    );
    await _ensureChannelsAndPermission();
    final launch = await _plugin.getNotificationAppLaunchDetails();
    if (launch?.didNotificationLaunchApp == true) {
      onOpenOrders?.call();
    }
    WidgetsBinding.instance.addObserver(this);
    _ready = true;
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _tick());
    await _tick();
    await _maybeSelfTest();
  }

  Future<void> _maybeSelfTest() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_selfTestKey) == true) return;
    await prefs.setBool(_selfTestKey, true);
    await _show(
      id: 72001,
      title: 'Notifikasi outlet aktif',
      body: 'Pesanan baru akan muncul di sini seperti app pelanggan.',
      incoming: true,
    );
  }

  Future<void> _ensureChannelsAndPermission() async {
    final android = _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _incomingChannelId,
        'Pesanan masuk outlet',
        description: 'Pesanan baru untuk dapur — heads-up seperti chat customer',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        showBadge: true,
      ),
    );
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _statusChannelId,
        'Status pesanan outlet',
        description: 'Kurir menjemput pesanan',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        showBadge: true,
      ),
    );
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    _started = false;
    _ready = false;
    _baseline = true;
    _seenIncoming.clear();
    _seenPickup.clear();
    WidgetsBinding.instance.removeObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_ensureChannelsAndPermission());
      _tick();
    }
  }

  Future<void> _tick() async {
    if (!_ready) return;
    try {
      final list = await _api.getOrders();
      final waiting = list.where((o) => o.myStatus == 'WAITING').toList();
      onIncomingCount?.call(waiting.length);

      for (final order in waiting) {
        if (_seenIncoming.contains(order.id)) continue;
        _seenIncoming.add(order.id);
        if (!_baseline) {
          await HapticFeedback.heavyImpact();
          await _show(
            id: 'in-${order.id}'.hashCode & 0x7fffffff,
            title: 'Pesanan baru masuk',
            body: _incomingBody(order),
            incoming: true,
          );
        }
      }

      for (final order in list) {
        final picked =
            order.status == 'PICKED_UP' ||
            order.status == 'DELIVERING' ||
            order.status == 'DELIVERED' ||
            order.status == 'COMPLETED';
        if (!picked || order.myStatus == 'REJECTED') continue;
        if (_seenPickup.contains(order.id)) continue;
        _seenPickup.add(order.id);
        if (!_baseline && order.status == 'PICKED_UP') {
          await _show(
            id: 'pick-${order.id}'.hashCode & 0x7fffffff,
            title: 'Kurir sudah jemput',
            body: '${order.id} · ${order.customerName}',
            incoming: false,
          );
        }
      }

      _baseline = false;
    } catch (_) {}
  }

  String _incomingBody(OutletOrder order) {
    final items = order.itemNames.isEmpty ? 'Pesanan baru' : order.itemNames.join(', ');
    return '${order.customerName} · $items';
  }

  /// Mirror customer chat notification (Importance.max → tray + heads-up di HP).
  Future<void> _show({
    required int id,
    required String title,
    required String body,
    required bool incoming,
  }) async {
    final channelId = incoming ? _incomingChannelId : _statusChannelId;
    final channelName = incoming ? 'Pesanan masuk outlet' : 'Status pesanan outlet';
    final android = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: incoming
          ? 'Pesanan baru untuk dapur'
          : 'Kurir menjemput pesanan',
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      enableVibration: true,
      category: AndroidNotificationCategory.message,
      visibility: NotificationVisibility.public,
      ticker: title,
      icon: '@mipmap/ic_launcher',
      channelShowBadge: true,
      styleInformation: BigTextStyleInformation(body, contentTitle: title),
      autoCancel: true,
    );
    await _plugin.show(
      id,
      title,
      body,
      NotificationDetails(android: android),
      payload: 'orders',
    );
  }
}
