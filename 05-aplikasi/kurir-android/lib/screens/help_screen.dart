import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../theme/app_theme.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  final _subjectCtrl = TextEditingController();
  final _orderCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  String _category = 'ORDER';
  bool _busy = false;
  String? _error;
  String? _message;
  List<Map<String, dynamic>> _reports = [];

  static const _categories = {
    'ORDER': 'Masalah order',
    'PAYMENT': 'Pembayaran',
    'ACCOUNT': 'Akun',
    'APP': 'Aplikasi',
    'OTHER': 'Lainnya',
  };

  static const _statusLabel = {
    'OPEN': 'Menunggu',
    'IN_PROGRESS': 'Diproses',
    'RESOLVED': 'Selesai',
    'CLOSED': 'Ditutup',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _orderCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      final rows = await api.mySupportReports();
      if (!mounted) return;
      setState(() => _reports = rows);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      final api = context.read<ApiClient>();
      final res = await api.submitSupportReport(
        category: _category,
        subject: _subjectCtrl.text.trim(),
        body: _bodyCtrl.text.trim(),
        orderId: _orderCtrl.text.trim().isEmpty ? null : _orderCtrl.text.trim(),
      );
      if (!mounted) return;
      _subjectCtrl.clear();
      _orderCtrl.clear();
      _bodyCtrl.clear();
      setState(() => _message = res['message']?.toString() ?? 'Laporan terkirim.');
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bantuan', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Laporkan kendala — langsung masuk ke Super Admin ANTARQ.',
            style: TextStyle(color: AppColors.body),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    value: _category,
                    decoration: const InputDecoration(labelText: 'Kategori'),
                    items: _categories.entries
                        .map(
                          (e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ),
                        )
                        .toList(),
                    onChanged: _busy ? null : (v) => setState(() => _category = v ?? 'OTHER'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _subjectCtrl,
                    enabled: !_busy,
                    decoration: const InputDecoration(labelText: 'Subjek'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _orderCtrl,
                    enabled: !_busy,
                    decoration: const InputDecoration(
                      labelText: 'Nomor order (opsional)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _bodyCtrl,
                    enabled: !_busy,
                    minLines: 3,
                    maxLines: 6,
                    decoration: const InputDecoration(
                      labelText: 'Deskripsi kendala',
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  ],
                  if (_message != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _message!,
                      style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w600),
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: Text(_busy ? 'Mengirim…' : 'Kirim laporan'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Riwayat laporan saya', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 8),
          if (_reports.isEmpty)
            const Text('Belum ada laporan.', style: TextStyle(color: AppColors.body))
          else
            ..._reports.map((r) {
              final status = _statusLabel[r['status']?.toString()] ?? r['status']?.toString() ?? '';
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              r['subject']?.toString() ?? '',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primarySoft,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              status,
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        r['body']?.toString() ?? '',
                        style: const TextStyle(color: AppColors.body, height: 1.35),
                      ),
                      if ((r['adminNote']?.toString() ?? '').isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'Balasan admin: ${r['adminNote']}',
                            style: const TextStyle(color: Color(0xFF166534)),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
