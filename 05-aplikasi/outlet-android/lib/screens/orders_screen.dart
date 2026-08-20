import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../theme/app_theme.dart';

/// Badge komisi dengan countdown sejak app dibuka.
class _CommissionBadge extends StatefulWidget {
  const _CommissionBadge({required this.rate, required this.isFeatured});
  final double rate;
  final bool isFeatured;

  @override
  State<_CommissionBadge> createState() => _CommissionBadgeState();
}

class _CommissionBadgeState extends State<_CommissionBadge> {
  static const _defaultPct = 15;
  late final DateTime _since;
  Timer? _timer;
  Duration _elapsed = Duration.zero;

  bool get _changed => (widget.rate * 100).round() != _defaultPct;

  @override
  void initState() {
    super.initState();
    _since = DateTime.now();
    if (_changed) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _elapsed = DateTime.now().difference(_since));
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _fmt(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes % 60;
    final s = d.inSeconds % 60;
    if (h > 0) return '${h}j ${m.toString().padLeft(2, '0')}m ${s.toString().padLeft(2, '0')}s';
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final pct = (widget.rate * 100).round();
    if (!_changed) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.primarySoft,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.percent, size: 13, color: AppColors.primary),
            const SizedBox(width: 4),
            Text('Komisi $pct%',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary)),
          ],
        ),
      );
    }

    final bg = widget.isFeatured ? const Color(0xFFFFFBEB) : const Color(0xFFEFF6FF);
    final fg = widget.isFeatured ? const Color(0xFF92400E) : const Color(0xFF1E40AF);
    final border = widget.isFeatured ? const Color(0xFFFDE68A) : const Color(0xFFBFDBFE);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            widget.isFeatured ? Icons.star : Icons.percent,
            size: 13,
            color: fg,
          ),
          const SizedBox(width: 4),
          Text(
            '${widget.isFeatured ? 'Rekomendasi ' : ''}$pct% · ${_fmt(_elapsed)}',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: fg),
          ),
        ],
      ),
    );
  }
}

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  List<OutletOrder> _orders = [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _reload();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _reload(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _reload({bool silent = false}) async {
    final api = context.read<ApiClient>();
    final auth = context.read<AuthState>();
    if (!silent) setState(() => _loading = true);
    try {
      await auth.refreshProfile();
      final list = await api.getOrders();
      if (mounted) setState(() => _orders = list);
    } catch (_) {
    } finally {
      if (mounted && !silent) setState(() => _loading = false);
    }
  }

  List<OutletOrder> _filter(String tab) {
    switch (tab) {
      case 'baru':
        return _orders.where((o) => o.myStatus == 'WAITING').toList();
      case 'proses':
        return _orders
            .where((o) => o.myStatus == 'ACCEPTED' || o.myStatus == 'PREPARING')
            .toList();
      default:
        return _orders
            .where((o) => o.myStatus == 'READY' || o.myStatus == 'COMPLETED' || o.myStatus == 'REJECTED')
            .toList();
    }
  }

  Future<void> _respond(OutletOrder order, bool accept) async {
    final api = context.read<ApiClient>();
    try {
      await api.respondOrder(order.id, accept: accept);
      await _reload();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _status(OutletOrder order, String status) async {
    final api = context.read<ApiClient>();
    try {
      await api.updateOrderStatus(order.id, status);
      await _reload();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<AuthState>().profile;
    final open = profile?.isOpen ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(profile?.name ?? 'Outlet', style: const TextStyle(fontWeight: FontWeight.w800)),
            Text(
              open ? 'Buka' : 'Tutup',
              style: TextStyle(
                fontSize: 12,
                color: open ? AppColors.success : AppColors.danger,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        actions: [
          if (profile != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: _CommissionBadge(
                rate: profile.commissionRate,
                isFeatured: profile.isFeatured,
              ),
            ),
          Row(
            children: [
              const Text('Buka'),
              Switch.adaptive(
                value: open,
                activeThumbColor: AppColors.success,
                onChanged: (v) => context.read<AuthState>().setOpen(v),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.body,
          indicatorColor: AppColors.primary,
          tabs: [
            Tab(text: _filter('baru').isEmpty ? 'Baru' : 'Baru (${_filter('baru').length})'),
            const Tab(text: 'Diproses'),
            const Tab(text: 'Siap/Selesai'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _list(_filter('baru'), mode: 'baru'),
                _list(_filter('proses'), mode: 'proses'),
                _list(_filter('selesai'), mode: 'selesai'),
              ],
            ),
    );
  }

  Widget _list(List<OutletOrder> orders, {required String mode}) {
    if (orders.isEmpty) {
      return const Center(child: Text('Tidak ada pesanan', style: TextStyle(color: AppColors.body)));
    }
    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: orders.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, i) {
          final o = orders[i];
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(o.id, style: const TextStyle(fontWeight: FontWeight.w800)),
                      const Spacer(),
                      Text(
                        rupiah(o.subtotal),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('${o.customerName} · ${o.deliveryAddress}'),
                  Text(o.itemNames.join(', '), style: const TextStyle(color: AppColors.body)),
                  const SizedBox(height: 4),
                  Text(
                    'Hak outlet ${rupiah(o.merchantAmount)} · Komisi ${rupiah(o.commissionAmount)}',
                    style: const TextStyle(fontSize: 12, color: AppColors.body),
                  ),
                  const SizedBox(height: 12),
                  if (mode == 'baru')
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
                            onPressed: () => _respond(o, false),
                            child: const Text('Tolak'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: FilledButton(
                            onPressed: () => _respond(o, true),
                            child: const Text('Terima'),
                          ),
                        ),
                      ],
                    )
                  else if (mode == 'proses')
                    Row(
                      children: [
                        if (o.myStatus == 'ACCEPTED')
                          Expanded(
                            child: FilledButton(
                              onPressed: () => _status(o, 'PREPARING'),
                              child: const Text('Mulai masak'),
                            ),
                          ),
                        if (o.myStatus == 'PREPARING')
                          Expanded(
                            child: FilledButton(
                              onPressed: () => _status(o, 'READY'),
                              child: const Text('Siap diambil'),
                            ),
                          ),
                      ],
                    )
                  else
                    Text(
                      'Status: ${o.myStatus}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
