import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'motion.dart';

int deliveryStage(String status) {
  if (status == 'COMPLETED' || status == 'DELIVERED') return 3;
  if (status == 'PICKED_UP' || status == 'DELIVERING') return 2;
  if (status == 'OUTLET_ACCEPTED' ||
      status == 'PREPARING' ||
      status == 'READY_FOR_PICKUP' ||
      status == 'COURIER_ASSIGNED' ||
      status == 'COURIER_GOING_TO_OUTLET') {
    return 1;
  }
  return 0;
}

String deliveryTitle(String status) {
  if (status == 'CANCELLED') return 'Pesanan dibatalkan';
  return switch (deliveryStage(status)) {
    0 => 'Pesanan diterima',
    1 => 'Sedang disiapkan',
    2 => 'Sedang diantar',
    _ => 'Pesanan selesai',
  };
}

String deliveryBlurb(String status) {
  if (status == 'CANCELLED') return 'Pesanan ini tidak dilanjutkan.';
  return switch (deliveryStage(status)) {
    0 => 'Customer: pesananmu sudah diterima. Berikutnya warung menyiapkan makanan.',
    1 => 'Warung: makanan sedang dimasak. Berikutnya kurir mengambil dan mengantar ke rumahmu.',
    2 => 'Kurir: pesanan sudah diambil dan sedang di jalan menuju rumahmu.',
    _ => 'Rumah: pesanan sudah tiba di alamatmu.',
  };
}

String etaWindow({int? billedKm}) {
  final mins = ((billedKm ?? 5) * 4).clamp(18, 45);
  final start = DateTime.now().add(Duration(minutes: mins));
  final end = start.add(const Duration(minutes: 5));
  String f(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}.${d.minute.toString().padLeft(2, '0')}';
  return '${f(start)}–${f(end)}';
}

class DeliveryProgress extends StatelessWidget {
  const DeliveryProgress({super.key, required this.status, this.billedKm, this.compact = false});

  final String status;
  final int? billedKm;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final stage = deliveryStage(status);
    const icons = [Icons.person_rounded, Icons.storefront_rounded, Icons.directions_car_rounded, Icons.home_rounded];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          deliveryTitle(status),
          style: TextStyle(fontSize: compact ? 18 : 22, fontWeight: FontWeight.w800, height: 1.15),
        ),
        const SizedBox(height: 4),
        Text.rich(
          TextSpan(
            text: 'Tiba sekitar ',
            style: TextStyle(fontSize: compact ? 13 : 15, color: const Color(0xFF6B6560)),
            children: [
              TextSpan(
                text: etaWindow(billedKm: billedKm),
                style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.ink),
              ),
            ],
          ),
        ),
        SizedBox(height: compact ? 14 : 18),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < 4; i++) ...[
              SizedBox(
                width: 54,
                child: Column(
                  children: [
                    PulseRing(
                      active: stage < 3 && i == stage,
                      child: BobNode(
                        active: stage < 3 && i == stage,
                        child: _Node(on: stage >= 3 || i <= stage, icon: icons[i]),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      const ['Customer', 'Warung', 'Kurir', 'Rumah'][i],
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: stage < 3 && i == stage
                            ? AppColors.primary
                            : (stage >= 3 || i <= stage)
                                ? AppColors.ink
                                : const Color(0xFF8A8580),
                      ),
                    ),
                  ],
                ),
              ),
              if (i < 3)
                Expanded(
                  child: WalkLine(live: stage == i && stage < 3, done: stage > i || stage >= 3),
                ),
            ],
          ],
        ),
        SizedBox(height: compact ? 10 : 14),
        Text(
          deliveryBlurb(status),
          maxLines: compact ? 2 : 4,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: compact ? 12 : 13, height: 1.4, color: const Color(0xFF8A8580)),
        ),
      ],
    );
  }
}

class _Node extends StatelessWidget {
  const _Node({required this.on, required this.icon});

  final bool on;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: on ? AppColors.ink : const Color(0xFFECEAE8),
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Icon(icon, size: 18, color: on ? Colors.white : const Color(0xFF8A8580)),
    );
  }
}
