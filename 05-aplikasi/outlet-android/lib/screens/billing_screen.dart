import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../theme/app_theme.dart';

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key});

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen> {
  late Future<List<SettlementRow>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getSettlements();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthState>().refreshProfile();
    });
  }

  Future<void> _reload() async {
    await context.read<AuthState>().refreshProfile();
    setState(() => _future = context.read<ApiClient>().getSettlements());
    await _future;
  }

  Future<void> _pay() async {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Unggah foto bukti transfer di panel Tagihan web. Super Admin memakainya untuk mencocokkan mutasi rekening.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<AuthState>().profile;
    final stats = profile?.stats;
    final payout = profile?.payoutAccount;
    final mix = profile?.commissionMix ?? const <CommissionBucket>[];

    return Scaffold(
      appBar: AppBar(title: const Text('Tagihan', style: TextStyle(fontWeight: FontWeight.w800))),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _kpi('Penjualan', rupiah(stats?.totalSales ?? 0)),
                _kpi('Komisi', rupiah(stats?.totalCommission ?? 0)),
                _kpi('Hak outlet', rupiah(stats?.merchantAmount ?? 0)),
                _kpi('Outstanding', rupiah(stats?.outstandingAmount ?? 0)),
              ],
            ),
            const SizedBox(height: 12),
            if (payout != null)
              Card(
                color: AppColors.primarySoft,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Transfer fee ke rekening founder',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        payout.note,
                        style: const TextStyle(color: AppColors.body, fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      _row('Bank', payout.bankName),
                      _row('No. Rekening', payout.accountNumber, copyable: true),
                      _row('Atas nama', payout.accountName),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                title: const Text(
                  'Tagihan = komisi tiap pesanan',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(
                  mix.isEmpty
                      ? 'Biasa 15%, rekomendasi 20%. Ongkir bukan tagihan warung.'
                      : mix
                          .map((b) =>
                              '${b.label}: ${b.orderCount} pesanan · ${rupiah(b.commissionAmount)}')
                          .join('\n'),
                ),
                isThreeLine: mix.length > 1,
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _pay,
              child: const Text('Bayar tagihan + upload bukti'),
            ),
            const SizedBox(height: 16),
          const Text('Riwayat pembayaran', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          const Text(
            'Setiap pengajuan menampilkan komisi 15% (biasa) dan 20% (rekomendasi).',
            style: TextStyle(color: AppColors.body, fontSize: 13),
          ),
            const SizedBox(height: 8),
            FutureBuilder<List<SettlementRow>>(
              future: _future,
              builder: (context, snap) {
                if (!snap.hasData) {
                  return const Padding(
                    padding: EdgeInsets.only(top: 24),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final rows = snap.data!;
                if (rows.isEmpty) {
                  return const Text('Belum ada tagihan.', style: TextStyle(color: AppColors.body));
                }
                return Column(
                  children: rows
                      .map(
                      (s) => Card(
                        child: ListTile(
                          title: Text(
                            rupiah(s.paidAmount),
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          subtitle: Text(
                            [
                              s.status,
                              if (s.rates.isNotEmpty)
                                s.rates
                                    .map((b) =>
                                        '${b.label}: ${b.orderCount} pesanan · ${rupiah(b.commissionAmount)}')
                                    .join('\n')
                              else if (s.rateNote.isNotEmpty)
                                s.rateNote
                              else
                                'Komisi 15% atau 20% per pesanan',
                            ].join('\n'),
                          ),
                          isThreeLine: true,
                        ),
                      ),
                      )
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool copyable = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: AppColors.body, fontSize: 12)),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              ],
            ),
          ),
          if (copyable)
            IconButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: value));
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Nomor rekening disalin')),
                );
              },
              icon: const Icon(Icons.copy_rounded, size: 20),
            ),
        ],
      ),
    );
  }

  Widget _kpi(String label, String value) {
    return SizedBox(
      width: 160,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: AppColors.body, fontSize: 12)),
              const SizedBox(height: 4),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      ),
    );
  }
}
