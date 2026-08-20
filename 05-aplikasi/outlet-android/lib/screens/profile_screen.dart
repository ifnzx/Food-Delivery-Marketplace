import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';

import '../config/api_config.dart';
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
  bool _gpsBusy = false;

  Future<void> _updateFromGps() async {
    setState(() => _gpsBusy = true);
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        throw ApiException(
          'GPS belum aktif. Nyalakan lokasi di pengaturan HP dulu.',
        );
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        throw ApiException('Izin lokasi ditolak. Aktifkan agar kurir bisa temukan warung.');
      }
      if (permission == LocationPermission.deniedForever) {
        throw ApiException(
          'Izin lokasi diblokir permanen. Buka Pengaturan aplikasi untuk mengizinkan.',
        );
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      await context.read<AuthState>().updateLocation(
            latitude: pos.latitude,
            longitude: pos.longitude,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Lokasi outlet disimpan: ${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}',
          ),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil GPS: $e')),
      );
    } finally {
      if (mounted) setState(() => _gpsBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final profile = auth.profile;
    final lat = profile?.latitude;
    final lng = profile?.longitude;

    final photo = (profile?.photoUrl ?? '').trim();
    final photoUrl = photo.isEmpty
        ? null
        : (photo.startsWith('http') || photo.startsWith('data:')
            ? photo
            : '${ApiConfig.baseUrl}$photo');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Akun Outlet', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AppColors.primarySoft,
                backgroundImage: photoUrl == null ? null : NetworkImage(photoUrl),
                child: photoUrl == null
                    ? const Icon(Icons.storefront_rounded, color: AppColors.primary)
                    : null,
              ),
              title: Text(
                profile?.name ?? '-',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text('${profile?.phone ?? ''}\n${profile?.address ?? ''}'),
              isThreeLine: true,
            ),
          ),
          const SizedBox(height: 8),
          ListTile(
            leading: Icon(
              profile?.isOpen == true ? Icons.check_circle : Icons.cancel,
              color: profile?.isOpen == true ? AppColors.success : AppColors.danger,
            ),
            title: Text(profile?.isOpen == true ? 'Outlet buka' : 'Outlet tutup'),
            trailing: Switch.adaptive(
              value: profile?.isOpen ?? false,
              activeThumbColor: AppColors.success,
              onChanged: (v) => context.read<AuthState>().setOpen(v),
            ),
          ),
          Card(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.my_location_rounded, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text(
                        'Lokasi outlet (GPS)',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Titik ini dipakai untuk hitung jarak & ongkir ke customer. Ambil dari GPS HP saat Anda di warung.',
                    style: TextStyle(color: AppColors.body, height: 1.35),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    lat != null && lng != null
                        ? 'Tersimpan: ${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}'
                        : 'Belum ada koordinat GPS.',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _gpsBusy ? null : _updateFromGps,
                    icon: _gpsBusy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.gps_fixed_rounded),
                    label: Text(
                      _gpsBusy ? 'Mengambil GPS…' : 'Gunakan lokasi GPS saat ini',
                    ),
                  ),
                ],
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: Text('Status akun: ${profile?.status ?? '-'}'),
          ),
          ListTile(
            leading: Icon(
              profile?.isFeatured == true
                  ? Icons.star_rounded
                  : Icons.star_outline_rounded,
              color: profile?.isFeatured == true
                  ? const Color(0xFFB45309)
                  : AppColors.primary,
            ),
            title: const Text('Rekomendasi outlet'),
            subtitle: Text(
              profile?.isFeatured == true
                  ? 'Aktif · komisi ${((profile?.commissionRate ?? 0.2) * 100).round()}%'
                  : profile?.featuredRequestStatus == 'PENDING'
                      ? 'Menunggu Super Admin'
                      : 'Ajukan tampil di atas (komisi 20% jika disetujui)',
            ),
            trailing: profile?.isFeatured == true ||
                    profile?.featuredRequestStatus == 'PENDING'
                ? null
                : const Icon(Icons.chevron_right_rounded),
            onTap: profile?.isFeatured == true ||
                    profile?.featuredRequestStatus == 'PENDING'
                ? null
                : () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Ajukan rekomendasi?'),
                        content: const Text(
                          'Jika Super Admin setujui, warung tampil di atas daftar pelanggan dan komisi otomatis jadi 20%.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Batal'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Ajukan'),
                          ),
                        ],
                      ),
                    );
                    if (ok != true || !context.mounted) return;
                    try {
                      final res = await context.read<ApiClient>().requestFeatured();
                      await context.read<AuthState>().refreshProfile();
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            (res['message'] as String?) ??
                                'Pengajuan terkirim.',
                          ),
                        ),
                      );
                    } on ApiException catch (e) {
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(e.message)),
                      );
                    }
                  },
          ),
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
}
