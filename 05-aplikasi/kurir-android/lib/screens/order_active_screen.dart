import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../theme/app_theme.dart';
import 'success_screen.dart';

class OrderActiveScreen extends StatefulWidget {
  const OrderActiveScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderActiveScreen> createState() => _OrderActiveScreenState();
}

class _OrderActiveScreenState extends State<OrderActiveScreen> {
  CourierOrder? _order;
  String? _error;
  bool _busy = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final order = await context.read<ApiClient>().getOrder(widget.orderId);
      if (mounted) setState(() => _order = order);
    } on ApiException catch (e) {
      if (!silent && mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _run(Future<CourierOrder> Function() action) async {
    final auth = context.read<AuthState>();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final order = await action();
      await auth.refreshProfile();
      if (mounted) setState(() => _order = order);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.orderId, style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: order == null
          ? Center(
              child: _error != null
                  ? Text(_error!, style: const TextStyle(color: AppColors.danger))
                  : const CircularProgressIndicator(),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  height: 160,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF264653), AppColors.success],
                    ),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.map_rounded, color: Colors.white, size: 42),
                        const SizedBox(height: 8),
                        Text(
                          statusLabel(order.status),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.storefront_rounded, color: AppColors.primary),
                    title: const Text('Pickup outlet', style: TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text(order.merchantNames.join(', ')),
                  ),
                ),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.person_pin_circle_rounded, color: AppColors.success),
                    title: Text(order.customerName, style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text(order.deliveryAddress),
                  ),
                ),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Checklist item', style: TextStyle(fontWeight: FontWeight.w800)),
                        const SizedBox(height: 8),
                        ...order.itemNames.map(
                          (name) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              children: [
                                const Icon(Icons.check_box_outline_blank, size: 18),
                                const SizedBox(width: 8),
                                Expanded(child: Text(name)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Card(
                  color: AppColors.primarySoft,
                  child: ListTile(
                    leading: const Icon(Icons.payments_rounded, color: AppColors.success),
                    title: Text(
                      'Tagih tunai ${rupiah(order.grandTotal)}',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text(
                      'Ongkir milikmu ${rupiah(order.courierEarning)} · Makanan ${rupiah(order.foodSubtotal)}',
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: const TextStyle(color: AppColors.danger)),
                ],
                const SizedBox(height: 80),
              ],
            ),
      bottomNavigationBar: order == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: _actionButton(order),
              ),
            ),
    );
  }

  Widget _actionButton(CourierOrder order) {
    if (_busy) {
      return const FilledButton(
        onPressed: null,
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
        ),
      );
    }

    switch (order.status) {
      case 'COURIER_ASSIGNED':
        return FilledButton(
          onPressed: () => _run(
            () => context.read<ApiClient>().updateStatus(
                  order.id,
                  'COURIER_GOING_TO_OUTLET',
                ),
          ),
          child: const Text('Menuju outlet'),
        );
      case 'COURIER_GOING_TO_OUTLET':
      case 'READY_FOR_PICKUP':
      case 'OUTLET_ACCEPTED':
      case 'PREPARING':
        if (!order.foodReady) {
          return const FilledButton(
            onPressed: null,
            child: Text('Menunggu dapur siap'),
          );
        }
        return FilledButton(
          onPressed: () => _run(
            () => context.read<ApiClient>().updateStatus(order.id, 'PICKED_UP'),
          ),
          child: const Text('Konfirmasi pickup'),
        );
      case 'PICKED_UP':
        return FilledButton(
          onPressed: () => _run(
            () => context.read<ApiClient>().updateStatus(order.id, 'DELIVERING'),
          ),
          child: const Text('Antar ke customer'),
        );
      case 'DELIVERING':
        return FilledButton(
          onPressed: () => _run(
            () => context.read<ApiClient>().updateStatus(order.id, 'DELIVERED'),
          ),
          child: const Text('Sampai di lokasi'),
        );
      case 'DELIVERED':
        return FilledButton(
          onPressed: () async {
            final grandTotal = order.grandTotal;
            final earning = order.courierEarning;
            setState(() {
              _busy = true;
              _error = null;
            });
            try {
              final completed =
                  await context.read<ApiClient>().completeOrder(order.id);
              await context.read<AuthState>().refreshProfile();
              if (!mounted) return;
              setState(() => _order = completed);
              await Navigator.of(context).push<bool>(
                PageRouteBuilder(
                  pageBuilder: (_, __, ___) => SuccessScreen(
                    title: 'BERHASIL!',
                    message:
                        'Pembayaran tunai sudah diterima. Ongkir kamu ${rupiah(earning)}.',
                    amountLabel: rupiah(grandTotal),
                    buttonLabel: 'SELESAI',
                  ),
                  transitionsBuilder: (_, anim, __, child) =>
                      FadeTransition(opacity: anim, child: child),
                  transitionDuration: const Duration(milliseconds: 280),
                ),
              );
              if (!mounted) return;
              Navigator.of(context).pop();
            } on ApiException catch (e) {
              if (mounted) setState(() => _error = e.message);
            } finally {
              if (mounted) setState(() => _busy = false);
            }
          },
          child: Text('Pesanan sampai · tunai ${rupiah(order.grandTotal)}'),
        );
      case 'COMPLETED':
        return const FilledButton(onPressed: null, child: Text('Order selesai'));
      default:
        return FilledButton(
          onPressed: () => _run(
            () => context.read<ApiClient>().updateStatus(
                  order.id,
                  'COURIER_GOING_TO_OUTLET',
                ),
          ),
          child: const Text('Mulai ke outlet'),
        );
    }
  }
}
