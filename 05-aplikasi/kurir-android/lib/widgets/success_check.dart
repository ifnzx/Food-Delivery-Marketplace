import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Transitions.dev — Success check (Flutter port).
/// Fade + rotate + blur + Y-bob + stroke-draw, ~500ms.
class SuccessCheck extends StatefulWidget {
  const SuccessCheck({
    super.key,
    this.size = 120,
    this.color = AppColors.success,
    this.play = true,
  });

  final double size;
  final Color color;
  final bool play;

  @override
  State<SuccessCheck> createState() => _SuccessCheckState();
}

class _SuccessCheckState extends State<SuccessCheck>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _fade;
  late final Animation<double> _rotate;
  late final Animation<double> _blur;
  late final Animation<double> _bob;
  late final Animation<double> _draw;

  static const _easeOut = Cubic(0.22, 1, 0.36, 1);
  static const _easeBob = Cubic(0.34, 1.35, 0.64, 1);

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 580),
    );
    _fade = CurvedAnimation(parent: _c, curve: _easeOut);
    _rotate = Tween<double>(begin: 80 * math.pi / 180, end: 0).animate(
      CurvedAnimation(parent: _c, curve: _easeOut),
    );
    _blur = Tween<double>(begin: 10, end: 0).animate(
      CurvedAnimation(parent: _c, curve: _easeOut),
    );
    _bob = Tween<double>(begin: 40, end: 0).animate(
      CurvedAnimation(parent: _c, curve: _easeBob),
    );
    _draw = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _c,
        curve: const Interval(80 / 580, 1, curve: _easeOut),
      ),
    );
    if (widget.play) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _c.forward(from: 0);
      });
    } else {
      _c.value = 1;
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (reduce) {
      return SizedBox(
        width: widget.size,
        height: widget.size,
        child: CustomPaint(
          painter: _CheckPainter(progress: 1, color: widget.color),
        ),
      );
    }

    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        return Opacity(
          opacity: _fade.value.clamp(0.0, 1.0),
          child: Transform.translate(
            offset: Offset(0, _bob.value),
            child: Transform.rotate(
              angle: _rotate.value,
              child: ImageFiltered(
                imageFilter: ImageFilter.blur(
                  sigmaX: _blur.value,
                  sigmaY: _blur.value,
                ),
                child: SizedBox(
                  width: widget.size,
                  height: widget.size,
                  child: CustomPaint(
                    painter: _CheckPainter(
                      progress: _draw.value,
                      color: widget.color,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _CheckPainter extends CustomPainter {
  _CheckPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.085;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final circle = Path()
      ..addOval(
        Rect.fromCircle(
          center: Offset(size.width / 2, size.height / 2),
          radius: size.width / 2 - stroke,
        ),
      );
    _drawPathPartial(canvas, circle, paint, progress.clamp(0.0, 1.0));

    final check = Path()
      ..moveTo(size.width * 0.28, size.height * 0.52)
      ..lineTo(size.width * 0.44, size.height * 0.68)
      ..lineTo(size.width * 0.74, size.height * 0.34);
    // Check draws slightly after the ring starts (same delay feel).
    final checkProgress = ((progress - 0.15) / 0.85).clamp(0.0, 1.0);
    _drawPathPartial(canvas, check, paint, checkProgress);
  }

  void _drawPathPartial(Canvas canvas, Path path, Paint paint, double t) {
    for (final metric in path.computeMetrics()) {
      final extract = metric.extractPath(0, metric.length * t);
      canvas.drawPath(extract, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _CheckPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}
