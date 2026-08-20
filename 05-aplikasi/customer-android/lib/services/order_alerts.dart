import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter/webview_flutter.dart';

import '../config/api_config.dart';

const _chatChannelId = 'antarq_chat_v2';
const _orderChannelId = 'antarq_order_v2';

/// Notifikasi lokal: chat kurir, warung siap, kurir jemput/OTW, tolakan.
class OrderAlertService with WidgetsBindingObserver {
  OrderAlertService(this._web, {required this.onOpenPayload});

  final WebViewController _web;
  final void Function(String payload) onOpenPayload;
  final _plugin = FlutterLocalNotificationsPlugin();
  final _seenStatus = <String, String>{};
  final _seenChat = <String, String>{};
  final _seenReady = <String>{};
  Timer? _timer;
  var _ready = false;
  var _baseline = true;
  var _started = false;
  var _webReady = false;
  String? _pending;

  Future<void> start() async {
    if (_started) return;
    _started = true;
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(
      const InitializationSettings(android: androidInit),
      onDidReceiveNotificationResponse: (response) {
        _open(response.payload);
      },
    );
    final android = _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _chatChannelId,
        'Chat kurir',
        description: 'Pesan baru dari kurir',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        showBadge: true,
      ),
    );
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _orderChannelId,
        'Pesanan ANTARQ',
        description: 'Progres pesanan dan tolakan warung',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
        showBadge: true,
      ),
    );
    final launch = await _plugin.getNotificationAppLaunchDetails();
    if (launch?.didNotificationLaunchApp == true) {
      _open(launch!.notificationResponse?.payload);
    }
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _tick());
    _ready = true;
    await _tick();
  }

  void markWebReady() {
    _webReady = true;
    final pending = _pending;
    _pending = null;
    if (pending != null) _open(pending);
  }

  void _open(String? payload) {
    if (payload == null || payload.isEmpty) return;
    if (!_webReady) {
      _pending = payload;
      return;
    }
    onOpenPayload(payload);
  }

  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _tick();
  }

  Future<void> _tick() async {
    if (!_ready) return;
    final token = await _token();
    if (token == null || token.isEmpty) return;

    try {
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/orders'),
        headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
      );
      if (res.statusCode >= 400) return;
      final orders = jsonDecode(res.body);
      if (orders is! List) return;

      for (final raw in orders) {
        if (raw is! Map) continue;
        final id = raw['id']?.toString();
        final status = raw['status']?.toString() ?? '';
        if (id == null || id.isEmpty) continue;
        final prev = _seenStatus[id];
        _seenStatus[id] = status;
        if (!_baseline && prev != null && prev != status) {
          await _notifyStatus(id, status);
        }
        if (status == 'COMPLETED' || status == 'CANCELLED') continue;
        if (!_seenReady.contains(id) && _foodReady(raw, status)) {
          _seenReady.add(id);
          if (!_baseline && status != 'READY_FOR_PICKUP') {
            await _notifyStatus(id, 'READY_FOR_PICKUP');
          }
        }

        if (_hasCourier(raw)) {
          await _pollChat(token, id);
        }
      }
      _baseline = false;
    } catch (_) {}
  }

  bool _hasCourier(Map raw) {
    final cid = raw['courierId']?.toString();
    if (cid != null && cid.isNotEmpty && cid != 'null') return true;
    return raw['courier'] != null;
  }

  bool _foodReady(Map raw, String status) {
    if (status == 'READY_FOR_PICKUP') return true;
    final merchants = raw['merchants'];
    if (merchants is! List || merchants.isEmpty) return false;
    final live = merchants
        .whereType<Map>()
        .where((m) => m['status']?.toString() != 'REJECTED')
        .toList();
    return live.isNotEmpty &&
        live.every((m) {
          final st = m['status']?.toString();
          return st == 'READY' || st == 'COMPLETED';
        });
  }

  Future<void> _pollChat(String token, String orderId) async {
    try {
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/orders/${Uri.encodeComponent(orderId)}/chat'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode >= 400) return;
      final data = jsonDecode(res.body);
      final messages = data is Map ? data['messages'] : null;
      if (messages is! List || messages.isEmpty) return;
      Map<String, dynamic>? lastCourier;
      for (final m in messages) {
        if (m is! Map) continue;
        final role = m['senderRole']?.toString().toUpperCase();
        if (role == 'COURIER') {
          lastCourier = Map<String, dynamic>.from(m);
        }
      }
      if (lastCourier == null) return;
      final msgId = lastCourier['id']?.toString();
      if (msgId == null || msgId.isEmpty) return;
      final prev = _seenChat[orderId];
      if (_baseline) {
        _seenChat[orderId] = msgId;
        return;
      }
      if (prev == msgId) return;
      _seenChat[orderId] = msgId;

      var body = (lastCourier['body'] as String?) ?? 'Pesan baru';
      if (body.startsWith('IMG:')) body = 'Kurir mengirim foto';
      if (body.length > 80) body = '${body.substring(0, 80)}…';
      await _show(
        id: 'chat-$orderId-$msgId'.hashCode & 0x7fffffff,
        title: lastCourier['senderName']?.toString().trim().isNotEmpty == true
            ? 'Pesan dari ${lastCourier['senderName']}'
            : 'Pesan dari kurir',
        body: body,
        payload: 'chat:$orderId',
        chat: true,
      );
    } catch (_) {}
  }

  Future<void> _notifyStatus(String orderId, String status) async {
    if (status == 'READY_FOR_PICKUP') {
      await _show(
        id: 'ready-$orderId'.hashCode & 0x7fffffff,
        title: 'Warung sudah siap',
        body: 'Makananmu sudah siap. Kurir akan menjemput pesanan.',
        payload: 'order:$orderId',
      );
    } else if (status == 'PICKED_UP') {
      await _show(
        id: 'pick-$orderId'.hashCode & 0x7fffffff,
        title: 'Kurir sudah menjemput',
        body: 'Pesanan sudah diambil kurir.',
        payload: 'order:$orderId',
      );
    } else if (status == 'DELIVERING') {
      await _show(
        id: 'otw-$orderId'.hashCode & 0x7fffffff,
        title: 'Kurir menuju lokasi kamu',
        body: 'Pesanan sudah di jalan. Lacak di aplikasi.',
        payload: 'order:$orderId',
      );
    } else if (status == 'CANCELLED') {
      await _show(
        id: 'cancel-$orderId'.hashCode & 0x7fffffff,
        title: 'Warung menolak pesanan',
        body: 'Silakan pesan makanan dari warung lain.',
        payload: 'home:',
      );
    }
  }

  Future<void> _show({
    required int id,
    required String title,
    required String body,
    required String payload,
    bool chat = false,
  }) async {
    final android = AndroidNotificationDetails(
      chat ? _chatChannelId : _orderChannelId,
      chat ? 'Chat kurir' : 'Pesanan ANTARQ',
      channelDescription: chat ? 'Pesan baru dari kurir' : 'Progres pesanan',
      importance: chat ? Importance.max : Importance.high,
      priority: chat ? Priority.max : Priority.high,
      playSound: true,
      enableVibration: true,
      category: chat ? AndroidNotificationCategory.message : AndroidNotificationCategory.status,
      visibility: NotificationVisibility.public,
      ticker: title,
      icon: '@mipmap/ic_launcher',
    );
    await _plugin.show(id, title, body, NotificationDetails(android: android), payload: payload);
  }

  Future<String?> _token() async {
    try {
      final raw = await _web.runJavaScriptReturningResult(
        "(function(){ try { return localStorage.getItem('dk_customer_token') || ''; } catch(e) { return ''; } })()",
      );
      var s = raw.toString().trim();
      if (s == 'null' || s.isEmpty) return null;
      if (s.startsWith('"') && s.endsWith('"')) {
        try {
          s = jsonDecode(s) as String;
        } catch (_) {
          s = s.substring(1, s.length - 1);
        }
      }
      s = s.trim();
      return s.isEmpty || s == 'null' ? null : s;
    } catch (_) {
      return null;
    }
  }
}
