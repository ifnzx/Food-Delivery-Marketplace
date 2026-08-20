import 'dart:math';
import 'dart:ui';

import 'package:flutter/material.dart';

Rect? globalRectOf(BuildContext? context) {
  final box = context?.findRenderObject() as RenderBox?;
  if (box == null || !box.hasSize || !box.attached) return null;
  return box.localToGlobal(Offset.zero) & box.size;
}

Rect? globalRectOfKey(GlobalKey key) => globalRectOf(key.currentContext);

/// Foto menu terbang ke ikon keranjang (parabola + mengecil).
class FlyToCart {
  static void show({
    required BuildContext context,
    required Rect from,
    required Rect to,
    required String imageUrl,
  }) {
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _FlyToCartParticle(
        from: from,
        to: to,
        imageUrl: imageUrl,
        onDone: () => entry.remove(),
      ),
    );
    overlay.insert(entry);
  }
}

class _FlyToCartParticle extends StatefulWidget {
  const _FlyToCartParticle({
    required this.from,
    required this.to,
    required this.imageUrl,
    required this.onDone,
  });

  final Rect from;
  final Rect to;
  final String imageUrl;
  final VoidCallback onDone;

  @override
  State<_FlyToCartParticle> createState() => _FlyToCartParticleState();
}

class _FlyToCartParticleState extends State<_FlyToCartParticle>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 620))
      ..addStatusListener((s) {
        if (s == AnimationStatus.completed) widget.onDone();
      })
      ..forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final start = widget.from.center;
    final end = widget.to.center;
    final control = Offset(
      start.dx + (end.dx - start.dx) * 0.35,
      min(start.dy, end.dy) - 56,
    );

    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = Curves.easeInOutCubic.transform(_c.value);
          final pos = Offset(
            pow(1 - t, 2) * start.dx + 2 * (1 - t) * t * control.dx + t * t * end.dx,
            pow(1 - t, 2) * start.dy + 2 * (1 - t) * t * control.dy + t * t * end.dy,
          );
          final size = lerpDouble(widget.from.shortestSide, 22, t)!;
          final radius = lerpDouble(16, 20, t)!;
          final opacity = t < 0.85 ? 1.0 : (1 - (t - 0.85) / 0.15);

          return Stack(
            children: [
              Positioned(
                left: pos.dx - size / 2,
                top: pos.dy - size / 2,
                child: Opacity(
                  opacity: opacity.clamp(0, 1),
                  child: Transform.rotate(
                    angle: 0.35 * t,
                    child: Container(
                      width: size,
                      height: size,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(radius),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.22 * opacity),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Image.network(
                        widget.imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: const Color(0xFFDCFCE7),
                          child: const Icon(Icons.fastfood_rounded, size: 18),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
