import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../theme/app_theme.dart';
import 'order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<List<OrderSummary>> _future;
  String _tab = 'Aktif';

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getOrders();
  }

  Future<void> _reload() async {
    setState(() => _future = context.read<ApiClient>().getOrders());
    await _future;
  }

  bool _done(String status) => status == 'COMPLETED' || status == 'CANCELLED';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'AKTIVITAS',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1, color: AppColors.body),
                  ),
                  Text('Pesanan', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Row(
                children: ['Aktif', 'Selesai'].map((label) {
                  final selected = _tab == label;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      showCheckmark: false,
                      label: Text(label),
                      selected: selected,
                      onSelected: (_) => setState(() => _tab = label),
                      selectedColor: AppColors.ink,
                      backgroundColor: Colors.white,
                      labelStyle: TextStyle(
                        color: selected ? Colors.white : AppColors.body,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                      side: BorderSide(color: selected ? AppColors.primary : AppColors.line),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    ),
                  );
                }).toList(),
              ),
            ),
            Expanded(
              child: FutureBuilder<List<OrderSummary>>(
                future: _future,
                builder: (context, snap) {
                  if (snap.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final all = snap.data ?? [];
                  final list = all
                      .where((o) => _tab == 'Selesai' ? _done(o.status) : !_done(o.status))
                      .toList();
                  if (list.isEmpty) {
                    return RefreshIndicator(
                      onRefresh: _reload,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(28),
                            ),
                            child: Column(
                              children: [
                                Container(
                                  width: 80,
                                  height: 80,
                                  decoration: const BoxDecoration(color: AppColors.primarySoft, shape: BoxShape.circle),
                                  child: const Icon(Icons.receipt_long_rounded, size: 40, color: AppColors.primary),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  _tab == 'Aktif' ? 'Belum ada pesanan aktif' : 'Belum ada riwayat',
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Pesanan tunai kamu akan muncul di sini.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: AppColors.body, fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _reload,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, i) {
                        final o = list[i];
                        return Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => OrderDetailScreen(orderId: o.id),
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.line),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'ORDER',
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                                letterSpacing: 0.8,
                                                color: AppColors.secondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _toneBg(o.status),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          _statusLabel(o.status),
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            color: _toneFg(o.status),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text(o.id, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                  if (o.deliveryAddress.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      o.deliveryAddress,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: AppColors.body, fontSize: 13),
                                    ),
                                  ],
                                  const SizedBox(height: 12),
                                  const Divider(height: 1, color: AppColors.line),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      const Icon(Icons.payments_rounded, size: 16, color: AppColors.primary),
                                      const SizedBox(width: 6),
                                      const Text('Tunai ke kurir', style: TextStyle(color: AppColors.secondary, fontSize: 12)),
                                      const Spacer(),
                                      Text(
                                        rupiah(o.grandTotal),
                                        style: const TextStyle(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w800,
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
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Color _toneBg(String status) {
  if (status == 'CANCELLED') return const Color(0xFFFFDAD6);
  if (status == 'COMPLETED' || status == 'DELIVERING' || status == 'PICKED_UP') {
    return const Color(0xFFE6F4F1);
  }
  return AppColors.primarySoft;
}

Color _toneFg(String status) {
  if (status == 'CANCELLED') return AppColors.danger;
  if (status == 'COMPLETED' || status == 'DELIVERING' || status == 'PICKED_UP') {
    return AppColors.success;
  }
  return AppColors.primary;
}

String _statusLabel(String status) {
  switch (status) {
    case 'WAITING_OUTLET':
      return 'Menunggu dapur';
    case 'OUTLET_ACCEPTED':
      return 'Diterima dapur';
    case 'PREPARING':
      return 'Sedang dimasak';
    case 'READY_FOR_PICKUP':
      return 'Siap diambil';
    case 'COURIER_ASSIGNED':
    case 'COURIER_GOING_TO_OUTLET':
      return 'Kurir ke warung';
    case 'PICKED_UP':
    case 'DELIVERING':
      return 'Diantar';
    case 'DELIVERED':
      return 'Sudah diantar';
    case 'COMPLETED':
      return 'Selesai';
    case 'CANCELLED':
      return 'Dibatalkan';
    default:
      return status;
  }
}
