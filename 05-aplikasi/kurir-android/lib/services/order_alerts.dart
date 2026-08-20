import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';
import 'api_client.dart';

/// Channel v2 — Importance.max (sama pola customer chat yang sudah terbukti di HP).
const _incomingChannelId = 'antarq_courier_incoming_v2';
const _statusChannelId = 'antarq_courier_status_v2';
const _selfTestKey = 'dk_courier_notif_selftest_v2';

/// Notifikasi sistem Android (tray + suara + getar), pola sama customer Flutter.
class CourierOrderAlertService with WidgetsBindingObserver {
  CourierOrderAlertService(
    this._api, {
    this.onAvailableCount,
    this.onOpenHome,
  });

  final ApiClient _api;
  final void Function(int count)? onAvailableCount;
  final VoidCallback? onOpenHome;
  final _plugin = FlutterLocalNotificationsPlugin();
  final _seenAvailable = <String>{};
  final _seenReady = <String>{};
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
      onDidReceiveNotificationResponse: (_) => onOpenHome?.call(),
    );
    await _ensureChannelsAndPermission();
    final launch = await _plugin.getNotificationAppLaunchDetails();
    if (launch?.didNotificationLaunchApp == true) {
      onOpenHome?.call();
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
      id: 71001,
      title: 'Notifikasi kurir aktif',
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
        'Pesanan masuk kurir',
        description: 'Order baru yang bisa diambil — heads-up seperti chat customer',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        showBadge: true,
      ),
    );
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _statusChannelId,
        'Status antar kurir',
        description: 'Dapur siap diambil',
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
    _seenAvailable.clear();
    _seenReady.clear();
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
      final available = await _api.getAvailableOrders();
      onAvailableCount?.call(available.length);

      for (final order in available) {
        if (_seenAvailable.contains(order.id)) continue;
        _seenAvailable.add(order.id);
        if (!_baseline) {
          await HapticFeedback.heavyImpact();
          await _show(
            id: 'avail-${order.id}'.hashCode & 0x7fffffff,
            title: 'Pesanan baru masuk',
            body: _availableBody(order),
            incoming: true,
          );
        }
      }

      _seenAvailable.removeWhere((id) => !available.any((o) => o.id == id));

      final me = await _api.getMe();
      final activeId = me.activeOrderId;
      if (activeId != null && activeId.isNotEmpty) {
        final active = await _api.getOrder(activeId);
        if (active.foodReady || active.status == 'READY_FOR_PICKUP') {
          if (!_seenReady.contains(active.id)) {
            _seenReady.add(active.id);
            if (!_baseline) {
              await _show(
                id: 'ready-${active.id}'.hashCode & 0x7fffffff,
                title: 'Dapur siap diambil',
                body:
                    '${active.merchantNames.isEmpty ? 'Outlet' : active.merchantNames.join(', ')} · ${active.customerName}',
                incoming: false,
              );
            }
          }
        }
      }

      _baseline = false;
    } catch (_) {}
  }

  String _availableBody(CourierOrder order) {
    final outlet = order.merchantNames.isEmpty
        ? 'Outlet'
        : order.merchantNames.join(', ');
    final addr = order.deliveryAddress.trim().isEmpty
        ? order.customerName
        : order.deliveryAddress;
    return '$outlet · Ongkir ${rupiah(order.courierEarning)} · $addr';
  }

  /// Mirror customer chat notification (Importance.max → tray + heads-up di HP).
  Future<void> _show({
    required int id,
    required String title,
    required String body,
    required bool incoming,
  }) async {
    final channelId = incoming ? _incomingChannelId : _statusChannelId;
    final channelName = incoming ? 'Pesanan masuk kurir' : 'Status antar kurir';
    final android = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: incoming
          ? 'Order baru yang bisa diambil'
          : 'Dapur siap diambil',
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
      payload: 'home',
    );
  }
}
