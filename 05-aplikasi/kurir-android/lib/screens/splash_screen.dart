import 'package:flutter/material.dart';

import '../widgets/antarq_logo.dart';

/// Clean splash — hijau polos, logo hitam, kredit Brynx di bawah.
class BrandLoader extends StatefulWidget {
  const BrandLoader({super.key, this.busy = true});

  final bool busy;

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
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 36),
                      child: Column(
                        children: [
                          AntarqLogo(height: 72, black: true),
                          SizedBox(height: 16),
                          Text(
                            'Siap antar, siap dapat ongkir',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
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
