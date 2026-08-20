import 'package:flutter/material.dart';

/// Matches customer.html cubic-bezier(.22, 1, .36, 1)
const dkEaseOut = Cubic(0.22, 1, 0.36, 1);

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
