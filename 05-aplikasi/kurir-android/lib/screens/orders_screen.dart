import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../theme/app_theme.dart';
import 'order_active_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<List<CourierOrder>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getMyOrders();
  }

  Future<void> _reload() async {
    setState(() => _future = context.read<ApiClient>().getMyOrders());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order saya', style: TextStyle(fontWeight: FontWeight.w800))),
      body: FutureBuilder<List<CourierOrder>>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final orders = snap.data!;
          if (orders.isEmpty) {
            return const Center(
              child: Text('Belum ada order yang diambil', style: TextStyle(color: AppColors.body)),
            );
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
                  child: ListTile(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => OrderActiveScreen(orderId: o.id),
                        ),
                      );
                    },
                    title: Text(o.id, style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text('${statusLabel(o.status)} · ${o.customerName}'),
                    trailing: Text(
                      rupiah(o.courierEarning),
                      style: const TextStyle(
                        color: AppColors.success,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
