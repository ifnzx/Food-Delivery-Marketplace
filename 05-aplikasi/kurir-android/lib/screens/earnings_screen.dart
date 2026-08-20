import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../theme/app_theme.dart';

class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  late Future<List<CourierOrder>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getMyOrders();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthState>().refreshProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<AuthState>().profile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pendapatan', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ongkir hari ini', style: TextStyle(color: AppColors.body)),
                  const SizedBox(height: 6),
                  Text(
                    rupiah(profile?.earningsToday ?? 0),
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Total ongkir ${rupiah(profile?.earningsTotal ?? 0)} · ${profile?.completedCount ?? 0} order selesai',
                    style: const TextStyle(color: AppColors.body),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          const Card(
            color: AppColors.primarySoft,
            child: ListTile(
              title: Text(
                'Pendapatan kurir = ongkir',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text('Komisi makanan bukan milik kurir.'),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Riwayat order', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          FutureBuilder<List<CourierOrder>>(
            future: _future,
            builder: (context, snap) {
              if (!snap.hasData) {
                return const Padding(
                  padding: EdgeInsets.only(top: 24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              final done = snap.data!.where((o) => o.status == 'COMPLETED').toList();
              if (done.isEmpty) {
                return const Text('Belum ada pendapatan.', style: TextStyle(color: AppColors.body));
              }
              return Column(
                children: done
                    .map(
                      (o) => Card(
                        child: ListTile(
                          title: Text(o.id, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text(o.customerName),
                          trailing: Text(
                            rupiah(o.courierEarning),
                            style: const TextStyle(
                              color: AppColors.success,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
