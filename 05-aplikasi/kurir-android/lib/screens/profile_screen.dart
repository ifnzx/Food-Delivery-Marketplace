import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../config/api_config.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../theme/app_theme.dart';
import 'help_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _busy = false;
  String? _proofDataUrl;

  Future<void> _pickProof() async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded),
              title: const Text('Kamera'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Galeri'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;
    final file = await picker.pickImage(
      source: source,
      imageQuality: 82,
      maxWidth: 1400,
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    setState(() {
      _proofDataUrl = 'data:image/jpeg;base64,${base64Encode(bytes)}';
    });
  }

  Future<void> _confirmPriority() async {
    final auth = context.read<AuthState>();
    final profile = auth.profile;
    if (profile == null || _busy) return;
    if (_proofDataUrl == null || !_proofDataUrl!.startsWith('data:image/')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ambil foto bukti transfer dulu.')),
      );
      return;
    }
    final payout = profile.payoutAccount;
    final bank = [
      payout?.bankName,
      payout?.accountNumber,
    ].where((s) => s != null && s.isNotEmpty).join(' ');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kirim pengajuan'),
        content: Text(
          'Kirim bukti transfer ${rupiah(profile.priorityFee)} ke $bank untuk ${profile.priorityLabel}?\n\nSuper Admin akan setujui setelah cek bukti.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Kirim')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await context.read<ApiClient>().buyPriority(proofUrl: _proofDataUrl!);
      await auth.refreshProfile();
      if (!mounted) return;
      setState(() => _proofDataUrl = null);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pengajuan + bukti terkirim. Tunggu Super Admin.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copy(String label, String value) async {
    if (value.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label disalin')),
    );
  }

  String _proofSrc(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return '${ApiConfig.baseUrl}$url';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final profile = auth.profile;
    final user = auth.session;
    final payout = profile?.payoutAccount;

    return Scaffold(
      appBar: AppBar(title: const Text('Akun Kurir', style: TextStyle(fontWeight: FontWeight.w800))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AppColors.primarySoft,
                child: Text(
                  (profile?.fullName.isNotEmpty == true)
                      ? profile!.fullName.characters.first.toUpperCase()
                      : 'K',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800),
                ),
              ),
              title: Text(
                profile?.fullName ?? user?.displayName ?? '-',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text('${user?.email ?? ''}\n${profile?.phone ?? ''}'),
              isThreeLine: true,
            ),
          ),
          const SizedBox(height: 8),
          ListTile(
            leading: Icon(
              profile?.isOnline == true ? Icons.circle : Icons.circle_outlined,
              color: profile?.isOnline == true ? AppColors.success : AppColors.body,
              size: 18,
            ),
            title: Text(profile?.isOnline == true ? 'Status Online' : 'Status Offline'),
          ),
          if (profile != null) ...[
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Langganan prioritas',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Order masuk tanpa syarat jarak terdekat. Transfer ${rupiah(profile.priorityFee)} / ${profile.priorityLabel}, lampirkan bukti, lalu kirim.',
                      style: const TextStyle(color: AppColors.body, fontSize: 13),
                    ),
                    if (payout != null) ...[
                      const SizedBox(height: 12),
                      const Text(
                        'Rekening sistem ANTARQ',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                      const SizedBox(height: 8),
                      _payoutRow('Bank', payout.bankName),
                      _payoutRow('No. rekening', payout.accountNumber, copy: true),
                      _payoutRow('Atas nama', payout.accountName, copy: true),
                    ],
                    const SizedBox(height: 12),
                    if (profile.priorityActive)
                      Text(
                        'Aktif sampai ${_untilLabel(profile.priorityUntil)}',
                        style: const TextStyle(
                          color: AppColors.success,
                          fontWeight: FontWeight.w800,
                        ),
                      )
                    else if (profile.priorityRequestStatus == 'PENDING') ...[
                      const Text(
                        'Pengajuan terkirim. Super Admin sedang cek bukti transfer.',
                        style: TextStyle(
                          color: Color(0xFFB45309),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      if ((profile.priorityProofUrl ?? '').isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          constraints: const BoxConstraints(maxHeight: 200),
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.network(
                                _proofSrc(profile.priorityProofUrl),
                                fit: BoxFit.contain,
                                height: 176,
                                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ] else ...[
                      Material(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(16),
                        child: InkWell(
                          onTap: _busy ? null : _pickProof,
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            width: double.infinity,
                            constraints: const BoxConstraints(maxHeight: 200),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _proofDataUrl != null
                                    ? AppColors.primary
                                    : const Color(0xFFD1D5DB),
                                width: 1.5,
                              ),
                            ),
                            child: _proofDataUrl == null
                                ? Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: const [
                                      Icon(Icons.add_a_photo_rounded, color: AppColors.primary, size: 32),
                                      SizedBox(height: 8),
                                      Text(
                                        'Ambil foto bukti transfer',
                                        style: TextStyle(fontWeight: FontWeight.w800),
                                      ),
                                      SizedBox(height: 4),
                                      Text(
                                        'Struk ATM atau screenshot m-banking',
                                        style: TextStyle(color: AppColors.body, fontSize: 12),
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  )
                                : Center(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.memory(
                                        base64Decode(_proofDataUrl!.split(',').last),
                                        fit: BoxFit.contain,
                                        height: 176,
                                        filterQuality: FilterQuality.medium,
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      if (_proofDataUrl != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            'Ketuk foto untuk ganti',
                            style: TextStyle(color: AppColors.body.withValues(alpha: 0.85), fontSize: 12),
                          ),
                        ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _busy ? null : _confirmPriority,
                        child: Text(_busy ? 'Mengirim…' : 'Kirim pengajuan'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
          ListTile(
            leading: const Icon(Icons.support_agent_rounded, color: AppColors.primary),
            title: const Text('Bantuan'),
            subtitle: const Text('Laporkan kendala ke Super Admin'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const HelpScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.danger),
            title: const Text('Keluar', style: TextStyle(color: AppColors.danger)),
            onTap: () => context.read<AuthState>().logout(),
          ),
        ],
      ),
    );
  }

  Widget _payoutRow(String label, String value, {bool copy = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: AppColors.body, fontSize: 12)),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          if (copy)
            IconButton(
              onPressed: () => _copy(label, value),
              icon: const Icon(Icons.copy_rounded, size: 18),
            ),
        ],
      ),
    );
  }

  String _untilLabel(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final t = DateTime.tryParse(iso);
    if (t == null) return iso;
    return '${t.day.toString().padLeft(2, '0')}/${t.month.toString().padLeft(2, '0')}/${t.year}';
  }
}
