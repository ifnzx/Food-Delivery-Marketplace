import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'motion.dart';

class DkNavItem {
  const DkNavItem({required this.icon, required this.activeIcon, required this.label});
  final IconData icon;
  final IconData activeIcon;
  final String label;
}

class DkBottomNav extends StatelessWidget {
  const DkBottomNav({
    super.key,
    required this.index,
    required this.onTap,
    required this.items,
    this.badgeAt,
  });

  final int index;
  final ValueChanged<int> onTap;
  final List<DkNavItem> items;
  final int? badgeAt;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(28, 0, 28, 18),
      child: SizedBox(
        height: 72,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.82),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.white.withValues(alpha: 0.72)),
                boxShadow: const [
                  BoxShadow(color: Color(0x1A000000), blurRadius: 32, offset: Offset(0, 10)),
                ],
              ),
              child: LayoutBuilder(
                builder: (context, box) {
                  final slot = (box.maxWidth - 16) / items.length;
                  return Stack(
                    children: [
                      AnimatedPositioned(
                        duration: const Duration(milliseconds: 420),
                        curve: Curves.easeOutCubic,
                        top: 10,
                        left: 8 + index * slot,
                        width: slot,
                        height: 52,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: const Color(0xFF22C55E).withValues(alpha: 0.16),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          for (var i = 0; i < items.length; i++)
                            Expanded(
                              child: InkWell(
                                onTap: () => onTap(i),
                                borderRadius: BorderRadius.circular(999),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Stack(
                                      clipBehavior: Clip.none,
                                      children: [
                                        AnimatedScale(
                                          duration: const Duration(milliseconds: 280),
                                          curve: dkEaseOut,
                                          scale: i == index ? 1.12 : 1,
                                          child: Icon(
                                            i == index ? items[i].activeIcon : items[i].icon,
                                            color: i == index
                                                ? const Color(0xFF16A34A)
                                                : const Color(0x6B111111),
                                          ),
                                        ),
                                        if (badgeAt == i)
                                          const Positioned(
                                            top: -2,
                                            right: -6,
                                            child: CircleAvatar(
                                              radius: 4,
                                              backgroundColor: AppColors.primary,
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    AnimatedOpacity(
                                      duration: const Duration(milliseconds: 200),
                                      opacity: i == index ? 1 : 0,
                                      child: const SizedBox(
                                        width: 5,
                                        height: 5,
                                        child: DecoratedBox(
                                          decoration: BoxDecoration(
                                            color: Color(0xFF22C55E),
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}
