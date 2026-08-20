import 'package:flutter/material.dart';

/// Matches customer.html cubic-bezier(.22, 1, .36, 1)
const dkEaseOut = Cubic(0.22, 1, 0.36, 1);

class PageFade extends StatelessWidget {
  const PageFade({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.35, end: 1),
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
      builder: (context, v, child) => Opacity(opacity: v, child: child),
      child: child,
    );
  }
}

class FadeUp extends StatelessWidget {
  const FadeUp({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = const Duration(milliseconds: 550),
  });

  final Widget child;
  final Duration delay;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: duration + delay,
      curve: Interval(
        delay.inMilliseconds / (duration + delay).inMilliseconds,
        1,
        curve: dkEaseOut,
      ),
      builder: (context, t, child) {
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, 14 * (1 - t)),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

class PopIn extends StatelessWidget {
  const PopIn({
    super.key,
    required this.child,
    this.delay = Duration.zero,
  });

  final Widget child;
  final Duration delay;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 450) + delay,
      curve: Interval(
        delay.inMilliseconds / (450 + delay.inMilliseconds),
        1,
        curve: dkEaseOut,
      ),
      builder: (context, t, child) {
        final s = t < 0.7 ? 0.86 + (1.06 - 0.86) * (t / 0.7) : 1.06 - 0.06 * ((t - 0.7) / 0.3);
        return Opacity(
          opacity: t,
          child: Transform.scale(scale: s, child: child),
        );
      },
      child: child,
    );
  }
}

class PressScale extends StatefulWidget {
  const PressScale({super.key, required this.child, this.onTap, this.enabled = true});

  final Widget child;
  final VoidCallback? onTap;
  final bool enabled;

  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTapDown: widget.enabled ? (_) => setState(() => _down = true) : null,
      onTapUp: widget.enabled
          ? (_) {
              setState(() => _down = false);
              widget.onTap?.call();
            }
          : null,
      onTapCancel: widget.enabled ? () => setState(() => _down = false) : null,
      child: AnimatedScale(
        scale: _down ? 0.92 : 1,
        duration: const Duration(milliseconds: 160),
        curve: Curves.ease,
        child: widget.child,
      ),
    );
  }
}

class FloatLoop extends StatefulWidget {
  const FloatLoop({
    super.key,
    required this.child,
    this.dy = 10,
    this.dx = 0,
    this.rot = 0.1,
    this.duration = const Duration(milliseconds: 2600),
    this.reverseRot = false,
  });

  final Widget child;
  final double dy;
  final double dx;
  final double rot;
  final Duration duration;
  final bool reverseRot;

  @override
  State<FloatLoop> createState() => _FloatLoopState();
}

class _FloatLoopState extends State<FloatLoop> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: widget.duration)..repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = Curves.easeInOut.transform(_c.value);
        final rot = widget.reverseRot ? widget.rot * (1 - 2 * t) : -widget.rot + 2 * widget.rot * t;
        return Transform.translate(
          offset: Offset(widget.dx * t, -widget.dy * t),
          child: Transform.rotate(angle: rot, child: child),
        );
      },
      child: widget.child,
    );
  }
}

class ScooterLoop extends StatefulWidget {
  const ScooterLoop({super.key, required this.child});
  final Widget child;

  @override
  State<ScooterLoop> createState() => _ScooterLoopState();
}

class _ScooterLoopState extends State<ScooterLoop> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = Curves.easeInOut.transform(_c.value);
        return Transform.translate(
          offset: Offset(-8 * t, -12 * t),
          child: Transform.rotate(angle: -0.14 + 0.21 * t, child: child),
        );
      },
      child: widget.child,
    );
  }
}

class BlobLoop extends StatefulWidget {
  const BlobLoop({super.key, required this.child});
  final Widget child;

  @override
  State<BlobLoop> createState() => _BlobLoopState();
}

class _BlobLoopState extends State<BlobLoop> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 5000))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = Curves.easeInOut.transform(_c.value);
        return Transform.translate(
          offset: Offset(8 * t, -6 * t),
          child: Transform.scale(scale: 1 + 0.12 * t, child: child),
        );
      },
      child: widget.child,
    );
  }
}

class HeroBanner extends StatefulWidget {
  const HeroBanner({super.key, required this.child});
  final Widget child;

  @override
  State<HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends State<HeroBanner> with TickerProviderStateMixin {
  late final AnimationController _shimmer;
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _shimmer = AnimationController(vsync: this, duration: const Duration(milliseconds: 4500))..repeat();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 2800))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _shimmer.dispose();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_shimmer, _pulse]),
      builder: (context, child) {
        final p = Curves.easeInOut.transform(_pulse.value);
        return Container(
          height: 158,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Color.fromRGBO(34, 197, 94, 0.28 + 0.17 * p),
                blurRadius: 24 + 8 * p,
                offset: const Offset(0, 8),
              ),
            ],
            gradient: LinearGradient(
              begin: Alignment(-1.4 + 2.8 * _shimmer.value, -0.2),
              end: Alignment(0.8 + 2.8 * _shimmer.value, 0.4),
              colors: const [
                Color(0xFF22C55E),
                Color(0xFF4ADE80),
                Color(0xFF16A34A),
                Color(0xFF22C55E),
              ],
              stops: const [0, 0.35, 0.5, 1],
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class BobNode extends StatefulWidget {
  const BobNode({super.key, required this.child, required this.active});
  final Widget child;
  final bool active;

  @override
  State<BobNode> createState() => _BobNodeState();
}

class _BobNodeState extends State<BobNode> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1150))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active) return widget.child;
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = Curves.easeInOut.transform(_c.value);
        return Transform.translate(
          offset: Offset(0, -3 * t),
          child: Transform.scale(scale: 1 + 0.06 * t, child: child),
        );
      },
      child: widget.child,
    );
  }
}

class PulseRing extends StatefulWidget {
  const PulseRing({super.key, required this.child, required this.active});
  final Widget child;
  final bool active;

  @override
  State<PulseRing> createState() => _PulseRingState();
}

class _PulseRingState extends State<PulseRing> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active) return widget.child;
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = _c.value;
        return Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            Transform.scale(
              scale: 0.92 + 0.36 * t,
              child: Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Color.fromRGBO(34, 197, 94, (0.85 * (1 - t)).clamp(0, 1)),
                    width: 2,
                  ),
                ),
              ),
            ),
            child!,
          ],
        );
      },
      child: widget.child,
    );
  }
}

class WalkLine extends StatefulWidget {
  const WalkLine({super.key, required this.live, required this.done});
  final bool live;
  final bool done;

  @override
  State<WalkLine> createState() => _WalkLineState();
}

class _WalkLineState extends State<WalkLine> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(seconds: 5))..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: SizedBox(
        height: 10,
        child: LayoutBuilder(
          builder: (context, box) {
            if (widget.done) {
              return Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  height: 4,
                  width: box.maxWidth,
                  decoration: BoxDecoration(color: const Color(0xFF22C55E), borderRadius: BorderRadius.circular(99)),
                ),
              );
            }
            if (!widget.live) {
              return Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  height: 4,
                  width: box.maxWidth,
                  decoration: BoxDecoration(color: const Color(0xFFECEAE8), borderRadius: BorderRadius.circular(99)),
                ),
              );
            }
            return AnimatedBuilder(
              animation: _c,
              builder: (context, _) {
                final t = Curves.easeInOut.transform((_c.value / 0.82).clamp(0.0, 1.0));
                final w = box.maxWidth * t;
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        height: 4,
                        width: box.maxWidth,
                        margin: const EdgeInsets.only(top: 3),
                        decoration: BoxDecoration(color: const Color(0xFFECEAE8), borderRadius: BorderRadius.circular(99)),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        height: 4,
                        width: w,
                        margin: const EdgeInsets.only(top: 3),
                        decoration: BoxDecoration(color: const Color(0xFF22C55E), borderRadius: BorderRadius.circular(99)),
                      ),
                    ),
                    Positioned(
                      left: (w - 5).clamp(0, box.maxWidth - 10),
                      top: 0,
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: const Color(0xFF111111),
                          shape: BoxShape.circle,
                          boxShadow: const [
                            BoxShadow(color: Color(0x4722C55E), blurRadius: 0, spreadRadius: 3),
                            BoxShadow(color: Color(0x33000000), blurRadius: 4, offset: Offset(0, 1)),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }
}
