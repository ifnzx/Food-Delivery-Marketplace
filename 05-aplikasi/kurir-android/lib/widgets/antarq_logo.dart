import 'package:flutter/material.dart';

class AntarqLogo extends StatelessWidget {
  const AntarqLogo({
    super.key,
    this.height = 72,
    this.light = false,
    this.black = false,
  });

  final double height;
  final bool light;
  final bool black;

  @override
  Widget build(BuildContext context) {
    final asset = black
        ? 'assets/logo-antarq-black.png'
        : light
            ? 'assets/logo-antarq-light.png'
            : 'assets/logo-antarq.png';
    return Image.asset(
      asset,
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
    );
  }
}
