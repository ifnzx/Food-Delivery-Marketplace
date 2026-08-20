import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../theme/app_theme.dart';
import 'order_active_screen.dart';
import 'success_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<CourierOrder> _available = [];
  Timer? _timer;
  Timer? _countdownTimer;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _refresh(silent: true));
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final until = context.read<AuthState>().profile?.priorityUntil;
      if (until == null || until.isEmpty) return;
      setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  String? _priorityCountdown(String? untilIso) {
    if (untilIso == null || untilIso.isEmpty) return null;
    final until = DateTime.tryParse(untilIso)?.toLocal();
    if (until == null) return null;
    final left = until.difference(DateTime.now());
    if (left.inSeconds <= 0) return null;
    final d = left.inDays;
    final h = left.inHours % 24;
    final m = left.inMinutes % 60;
    final s = left.inSeconds % 60;
    final tail = '${m.toString().padLeft(2, '0')}m ${s.toString().padLeft(2, '0')}s';
    if (d > 0) return '${d}h ${h}j $tail';
    if (h > 0) return '${h}j $tail';
    return tail;
  }

  Future<void> _refresh({bool silent = false}) async {
    final api = context.read<ApiClient>();
    final auth = context.read<AuthState>();
    if (!silent) setState(() => _loading = true);
    try {
      await auth.refreshProfile();
      final list = await api.getAvailableOrders();
      if (mounted) setState(() => _available = list);
    } catch (_) {
    } finally {
      if (mounted && !silent) setState(() => _loading = false);
    }
  }

  Future<void> _toggle(bool value) async {
    try {
      await context.read<AuthState>().setOnline(value);
      await _refresh();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _accept(CourierOrder order) async {
    final api = context.read<ApiClient>();
    final auth = context.read<AuthState>();
    try {
      final accepted = await api.acceptOrder(order.id);
      await auth.refreshProfile();
      if (!mounted) return;
      final done = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => const SuccessScreen(
            title: 'Pesanan diterima!',
            message: 'Mulai menuju warung untuk mengambil pesanan.',
          ),
        ),
      );
      if (!mounted || done != true) return;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => OrderActiveScreen(orderId: accepted.id)),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), duration: const Duration(seconds: 6)),
      );
      await _refresh(silent: true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal terima order: $e'), duration: const Duration(seconds: 6)),
      );
    }
  }

  Future<void> _decline(CourierOrder order) async {
    final api = context.read<ApiClient>();
    try {
      await api.declineOrder(order.id);
      if (!mounted) return;
      setState(() => _available.removeWhere((e) => e.id == order.id));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Penawaran diteruskan ke kurir berikutnya')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      await _refresh(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<AuthState>().profile;
    final online = profile?.isOnline ?? false;
    final activeId = profile?.activeOrderId;
    final priorityCd = _priorityCountdown(profile?.priorityUntil);
    final priorityOn = profile?.priorityActive == true && priorityCd != null;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                profile?.fullName ?? 'Kurir',
                                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (priorityOn) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF3CD),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: const Color(0xFFFFE08A)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.workspace_premium, size: 14, color: Color(0xFFB45309)),
                                    const SizedBox(width: 4),
                                    Text(
                                      priorityCd!,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFFB45309),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: online
                                ? AppColors.success.withValues(alpha: 0.12)
                                : AppColors.line,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            online ? 'Online' : 'Offline',
                            style: TextStyle(
                              color: online ? AppColors.success : AppColors.body,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch.adaptive(
                    value: online,
                    activeThumbColor: AppColors.success,
                    onChanged: _toggle,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                color: online ? AppColors.success.withValues(alpha: 0.08) : AppColors.surface,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    online
                        ? 'Order ditawarkan ke kurir terdekat outlet dulu (anti-rebutan).'
                        : 'Kamu offline. Nyalakan untuk terima order.',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.payments_rounded, color: AppColors.primary),
                  title: const Text('Ongkir hari ini'),
                  trailing: Text(
                    rupiah(profile?.earningsToday ?? 0),
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                    ),
                  ),
                ),
              ),
              if (activeId != null) ...[
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => OrderActiveScreen(orderId: activeId),
                      ),
                    );
                  },
                  icon: const Icon(Icons.navigation_rounded),
                  label: Text('Lanjut order aktif $activeId'),
                ),
              ],
              const SizedBox(height: 20),
              const Text('Penawaran untukmu', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 10),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.only(top: 24),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (!online)
                const Text('Aktifkan online untuk melihat order.', style: TextStyle(color: AppColors.body))
              else if (_available.isEmpty)
                const Text(
                  'Menunggu giliran — hanya kurir terdekat outlet yang melihat order.',
                  style: TextStyle(color: AppColors.body),
                )
              else
                ..._available.map(
                  (order) {
                    final dist = order.offer?.distanceToOutletKm;
                    final ttl = order.offer?.ttlSec;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text('Khusus untukmu', style: TextStyle(fontWeight: FontWeight.w800)),
                                  const Spacer(),
                                  Text(
                                    rupiah(order.courierEarning),
                                    style: const TextStyle(
                                      color: AppColors.success,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                [
                                  if (dist != null) '±${dist.toStringAsFixed(1)} km ke outlet',
                                  if (ttl != null) 'sisa $ttl dtk',
                                ].join(' · '),
                                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 8),
                              Text('Pickup: ${order.merchantNames.join(', ')}'),
                              Text('Dropoff: ${order.customerName} · ${order.deliveryAddress}'),
                              Text(
                                'Bayar tunai ${rupiah(order.grandTotal)}',
                                style: const TextStyle(color: AppColors.body),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: () => _decline(order),
                                      child: const Text('Lewati'),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: () => _accept(order),
                                      child: const Text('Terima'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}
