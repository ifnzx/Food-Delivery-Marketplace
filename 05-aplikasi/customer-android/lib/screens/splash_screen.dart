import 'package:flutter/material.dart';

import '../widgets/antarq_logo.dart';

/// Clean splash — hijau polos, logo hitam, kredit Brynx di bawah.
class BrandLoader extends StatefulWidget {
  const BrandLoader({super.key, this.busy = true, this.tagline});

  final bool busy;
  final String? tagline;

  @override
  State<BrandLoader> createState() => _BrandLoaderState();
}

class _BrandLoaderState extends State<BrandLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _intro;
  late final Animation<double> _fade;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _intro = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..forward();
    _fade = CurvedAnimation(parent: _intro, curve: Curves.easeOut);
    _scale = Tween(begin: 0.92, end: 1.0).animate(
      CurvedAnimation(parent: _intro, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _intro.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFF22C55E),
      child: SafeArea(
        child: AnimatedBuilder(
          animation: _intro,
          builder: (context, _) {
            return Column(
              children: [
                const Spacer(flex: 4),
                Opacity(
                  opacity: _fade.value,
                  child: Transform.scale(
                    scale: _scale.value,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 36),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const AntarqLogo(height: 72, black: true),
                          if (widget.tagline != null) ...[
                            const SizedBox(height: 14),
                            _ShimmerTagline(text: widget.tagline!),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
                const Spacer(flex: 5),
                Opacity(
                  opacity: _fade.value,
                  child: const Padding(
                    padding: EdgeInsets.only(bottom: 36),
                    child: Text(
                      'from Brynx Solution company',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: BrandLoader());
  }
}

/// Tagline putih + lapisan shimmer — teks dasar tetap terbaca jika efek gagal.
class _ShimmerTagline extends StatefulWidget {
  const _ShimmerTagline({required this.text});

  final String text;

  @override
  State<_ShimmerTagline> createState() => _ShimmerTaglineState();
}

class _ShimmerTaglineState extends State<_ShimmerTagline>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shimmer;

  static const _style = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.2,
    height: 1.35,
  );

  @override
  void initState() {
    super.initState();
    _shimmer = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat();
  }

  @override
  void dispose() {
    _shimmer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (reduce) {
      return Text(
        widget.text,
        textAlign: TextAlign.center,
        style: _style.copyWith(color: Colors.white),
      );
    }

    return AnimatedBuilder(
      animation: _shimmer,
      builder: (context, _) {
        return Stack(
          alignment: Alignment.center,
          children: [
            Text(
              widget.text,
              textAlign: TextAlign.center,
              style: _style.copyWith(color: Colors.white.withValues(alpha: 0.9)),
            ),
            ShaderMask(
              blendMode: BlendMode.srcIn,
              shaderCallback: (bounds) {
                final t = _shimmer.value;
                return LinearGradient(
                  begin: Alignment(-1.2 + 2.4 * t, 0),
                  end: Alignment(0.2 + 2.4 * t, 0),
                  colors: const [
                    Color(0xFFFFFFFF),
                    Color(0xFFD1FAE5),
                    Color(0xFFFFFFFF),
                    Color(0xFFA7F3D0),
                    Color(0xFFFFFFFF),
                    Color(0xFF6EE7B7),
                    Color(0xFFFFFFFF),
                  ],
                  stops: const [0, 0.18, 0.36, 0.52, 0.68, 0.84, 1],
                ).createShader(bounds);
              },
              child: Text(
                widget.text,
                textAlign: TextAlign.center,
                style: _style.copyWith(color: Colors.white),
              ),
            ),
          ],
        );
      },
    );
  }
}
