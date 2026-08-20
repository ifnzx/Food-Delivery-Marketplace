import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';
import 'motion.dart';

class OtpVerificationPage extends StatelessWidget {
  const OtpVerificationPage({
    super.key,
    required this.fullName,
    required this.phone,
    required this.otp,
    required this.onOtpChanged,
    required this.onSubmit,
    required this.onResend,
    required this.onBack,
    required this.busy,
    this.demoOtp,
    this.error,
  });

  final String fullName;
  final String phone;
  final String otp;
  final ValueChanged<String> onOtpChanged;
  final VoidCallback onSubmit;
  final VoidCallback onResend;
  final VoidCallback onBack;
  final bool busy;
  final String? demoOtp;
  final String? error;

  String get _hello {
    final bits = fullName.trim().split(RegExp(r'\s+'));
    return bits.isEmpty || bits.first.isEmpty ? 'Pelanggan' : bits.first;
  }

  String get _masked {
    final d = phone.replaceAll(RegExp(r'\D'), '');
    if (d.length <= 3) return d.isEmpty ? 'WhatsApp' : d;
    return '${'X' * (d.length - 3)}${d.substring(d.length - 3)}';
  }

  @override
  Widget build(BuildContext context) {
    final ready = otp.length == 6;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                onPressed: busy ? null : onBack,
                icon: const Icon(Icons.arrow_back_rounded, color: AppColors.body),
              ),
            ),
            const PopIn(child: _OtpPhoneArt()),
            const SizedBox(height: 8),
            const FadeUp(
              child: Text(
                'Verifikasi OTP',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, letterSpacing: -0.4),
              ),
            ),
            const SizedBox(height: 12),
            FadeUp(
              delay: const Duration(milliseconds: 80),
              child: Text(
                'Halo $_hello,',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
              ),
            ),
            const SizedBox(height: 8),
            FadeUp(
              delay: const Duration(milliseconds: 120),
              child: Text(
                'Terima kasih sudah mendaftar. Masukkan OTP yang dikirim ke WhatsApp $_masked.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.body, fontSize: 13, height: 1.45),
              ),
            ),
            const SizedBox(height: 22),
            FadeUp(
              delay: const Duration(milliseconds: 160),
              child: OtpDigitRow(
                value: otp,
                error: error != null,
                onChanged: onOtpChanged,
              ),
            ),
            if (demoOtp != null && demoOtp!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Mode uji: $demoOtp',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.body, fontSize: 12),
              ),
            ],
            if (error != null) ...[
              const SizedBox(height: 10),
              Text(
                error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.danger, fontSize: 13),
              ),
            ],
            const SizedBox(height: 18),
            Center(
              child: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  const Text('OTP tidak diterima? ', style: TextStyle(color: AppColors.body, fontSize: 13)),
                  TextButton(
                    onPressed: busy ? null : onResend,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('KIRIM ULANG', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.4)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 54,
              child: FilledButton(
                onPressed: busy ? null : onSubmit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: ready ? 4 : 0,
                  shadowColor: const Color(0x6622C55E),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                ),
                child: busy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Kirim', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class OtpDigitRow extends StatefulWidget {
  const OtpDigitRow({
    super.key,
    required this.value,
    required this.onChanged,
    this.error = false,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final bool error;

  @override
  State<OtpDigitRow> createState() => _OtpDigitRowState();
}

class _OtpDigitRowState extends State<OtpDigitRow> with TickerProviderStateMixin {
  late final List<TextEditingController> _ctrls;
  late final List<FocusNode> _nodes;
  late final AnimationController _shake;
  final List<int> _popGen = List<int>.filled(6, 0);

  @override
  void initState() {
    super.initState();
    _ctrls = List.generate(6, (i) => TextEditingController(text: _digit(i)));
    _nodes = List.generate(6, (_) => FocusNode());
    _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 480));
    for (var i = 0; i < 6; i++) {
      final idx = i;
      _nodes[idx].addListener(() {
        if (mounted) setState(() {});
      });
      _nodes[idx].onKeyEvent = (node, event) {
        if (event is KeyDownEvent &&
            event.logicalKey == LogicalKeyboardKey.backspace &&
            _ctrls[idx].text.isEmpty &&
            idx > 0) {
          _ctrls[idx - 1].clear();
          _nodes[idx - 1].requestFocus();
          _emit();
          setState(() {});
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      };
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _nodes.first.requestFocus();
    });
  }

  @override
  void didUpdateWidget(covariant OtpDigitRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.error && !oldWidget.error) {
      _shake
        ..reset()
        ..forward();
    }
    if (widget.value != oldWidget.value) {
      for (var i = 0; i < 6; i++) {
        final next = _digit(i);
        if (_ctrls[i].text != next) _ctrls[i].value = TextEditingValue(text: next);
      }
    }
  }

  String _digit(int i) {
    if (i >= widget.value.length) return '';
    return widget.value[i];
  }

  @override
  void dispose() {
    for (final c in _ctrls) {
      c.dispose();
    }
    for (final n in _nodes) {
      n.dispose();
    }
    _shake.dispose();
    super.dispose();
  }

  void _emit() {
    widget.onChanged(_ctrls.map((c) => c.text).join());
  }

  void _onChanged(int i, String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 1) {
      for (var n = 0; n < 6; n++) {
        _ctrls[n].text = n < digits.length ? digits[n] : '';
        if (n < digits.length) {
          _popGen[n]++;
        }
      }
      _nodes[math.min(digits.length, 5)].requestFocus();
      setState(() {});
      _emit();
      return;
    }
    final v = digits.isEmpty ? '' : digits[digits.length - 1];
    _ctrls[i].text = v;
    if (v.isNotEmpty) {
      _popGen[i]++;
      if (i < 5) _nodes[i + 1].requestFocus();
    }
    setState(() {});
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final shake = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0, end: -6), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -6, end: 6), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 6, end: -3), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -3, end: 3), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 3, end: 0), weight: 1),
    ]).animate(CurvedAnimation(parent: _shake, curve: Curves.easeInOut));

    return AnimatedBuilder(
      animation: shake,
      builder: (context, child) => Transform.translate(offset: Offset(shake.value, 0), child: child),
      child: LayoutBuilder(
        builder: (context, box) {
          final gap = (box.maxWidth * 0.018).clamp(4.0, 8.0);
          final fontSize = (box.maxWidth / 16).clamp(15.0, 22.0);
          return Row(
            children: List.generate(6, (i) {
              final filled = _ctrls[i].text.isNotEmpty;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: i == 5 ? 0 : gap),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: TweenAnimationBuilder<double>(
                      key: ValueKey('otp-$i-${_popGen[i]}'),
                      tween: Tween(begin: filled ? 0.72 : 1, end: 1),
                      duration: const Duration(milliseconds: 280),
                      curve: dkEaseOut,
                      builder: (context, s, child) => Transform.scale(scale: s, child: child),
                      child: TextField(
                        controller: _ctrls[i],
                        focusNode: _nodes[i],
                        textAlign: TextAlign.center,
                        keyboardType: TextInputType.number,
                        maxLength: 1,
                        style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w700, height: 1),
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        onChanged: (v) => _onChanged(i, v),
                        decoration: InputDecoration(
                          counterText: '',
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                          filled: true,
                          fillColor: Colors.white,
                          border: _otpBorder(widget.error ? AppColors.danger : AppColors.line),
                          enabledBorder: _otpBorder(
                            widget.error
                                ? AppColors.danger
                                : filled
                                    ? AppColors.primary
                                    : AppColors.line,
                          ),
                          focusedBorder: _otpBorder(widget.error ? AppColors.danger : AppColors.primary),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          );
        },
      ),
    );
  }

  OutlineInputBorder _otpBorder(Color color) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: color, width: 1.5),
    );
  }
}

class _OtpPhoneArt extends StatelessWidget {
  const _OtpPhoneArt();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 168,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Positioned(left: 28, top: 28, child: _OtpDot(size: 10, color: Color(0xFFE5E7EB), radius: 3)),
          const Positioned(right: 36, top: 18, child: _OtpDot(size: 8, color: Color(0xFFFACC15), radius: 99, delay: 400)),
          const Positioned(left: 48, bottom: 22, child: _OtpDot(size: 7, color: Color(0xFF86EFAC), radius: 99, delay: 800)),
          const Positioned(right: 22, bottom: 40, child: _OtpDot(size: 9, color: Color(0xFFE5E7EB), radius: 2, delay: 1100)),
          FloatLoop(
            dy: 8,
            rot: 0,
            duration: const Duration(milliseconds: 3400),
            child: CustomPaint(
              size: const Size(200, 168),
              painter: _OtpArtPainter(),
            ),
          ),
        ],
      ),
    );
  }
}

class _OtpDot extends StatelessWidget {
  const _OtpDot({
    required this.size,
    required this.color,
    required this.radius,
    this.delay = 0,
  });

  final double size;
  final Color color;
  final double radius;
  final int delay;

  @override
  Widget build(BuildContext context) {
    return FloatLoop(
      dy: 7,
      rot: 0,
      duration: Duration(milliseconds: 2800 + delay),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}

class _OtpArtPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final stroke = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeJoin = StrokeJoin.round;
    final fill = Paint()..color = Colors.white;
    final bar = Paint()..color = AppColors.primary;
    final barSoft = Paint()..color = const Color(0xFF86EFAC);

    final phone = RRect.fromRectAndRadius(const Rect.fromLTWH(58, 22, 84, 124), const Radius.circular(16));
    canvas.drawRRect(phone, stroke);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(90, 132, 20, 4), const Radius.circular(2)), bar);

    final bubble = Path()
      ..addRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(80, 38, 98, 58), const Radius.circular(16)))
      ..moveTo(147, 96)
      ..lineTo(136, 110)
      ..lineTo(134.5, 96);
    canvas.drawPath(bubble, fill);
    canvas.drawPath(bubble, stroke);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(96, 58, 42, 6), const Radius.circular(3)), bar);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(96, 72, 26, 6), const Radius.circular(3)), barSoft);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
