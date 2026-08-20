import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_state.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, this.onOpenOrders});

  final VoidCallback? onOpenOrders;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().session;
    final name = user?.displayName ?? 'Pelanggan';
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : 'P';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            const Text('Profil', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, height: 1.1)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 28, offset: Offset(0, 8))],
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 46,
                    backgroundColor: AppColors.primarySoft,
                    child: Text(initial, style: const TextStyle(color: AppColors.primary, fontSize: 32, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(height: 16),
                  Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(user?.email ?? '', style: const TextStyle(color: AppColors.body, fontSize: 14)),
                  const SizedBox(height: 8),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Pelanggan', style: TextStyle(color: AppColors.body, fontSize: 13)),
                      Text('  •  ', style: TextStyle(color: AppColors.body)),
                      Icon(Icons.location_on_rounded, size: 16, color: AppColors.body),
                      Text(' Banjarmasin', style: TextStyle(color: AppColors.body, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            _group([
              _row(Icons.location_on_rounded, 'Alamat pengiriman', 'Rumah', AppColors.primarySoft, AppColors.primary, () {}),
              _row(Icons.receipt_long_rounded, 'Riwayat pesanan', null, const Color(0xFFEEF2FF), const Color(0xFF4F46E5), onOpenOrders ?? () {}),
              _row(Icons.payments_rounded, 'Pembayaran', 'Tunai', const Color(0xFFFEF3C7), const Color(0xFFB45309), () {}),
            ]),
            const SizedBox(height: 12),
            _group([
              _row(Icons.lock_outline_rounded, 'Ubah kata sandi', null, const Color(0xFFF3F4F6), AppColors.ink, () {}),
              _row(
                Icons.logout_rounded,
                'Keluar',
                null,
                const Color(0xFFFEE2E2),
                const Color(0xFFDC2626),
                () => context.read<AuthState>().logout(),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _group(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 16, offset: Offset(0, 4))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }

  Widget _row(IconData icon, String label, String? hint, Color tone, Color fg, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: tone, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: fg, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
            if (hint != null)
              Text(hint, style: const TextStyle(color: AppColors.body, fontSize: 12)),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFFC5C5C5)),
          ],
        ),
      ),
    );
  }
}
