import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class QtyStepper extends StatelessWidget {
  const QtyStepper({
    super.key,
    required this.qty,
    required this.onAdd,
    required this.onSub,
  });

  final int qty;
  final VoidCallback onAdd;
  final VoidCallback onSub;

  @override
  Widget build(BuildContext context) {
    if (qty <= 0) {
      return _circle(onAdd, AppColors.primary, Colors.white, Icons.add);
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _circle(onSub, const Color(0xFFF3F4F6), AppColors.ink, Icons.remove),
        SizedBox(
          width: 22,
          child: Text(
            '$qty',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
          ),
        ),
        _circle(onAdd, AppColors.primary, Colors.white, Icons.add, glow: true),
      ],
    );
  }

  Widget _circle(VoidCallback onTap, Color bg, Color fg, IconData icon, {bool glow = false}) {
    return Material(
      color: bg,
      shape: const CircleBorder(),
      elevation: glow ? 4 : 0,
      shadowColor: const Color(0x5922C55E),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(icon, size: 16, color: fg),
        ),
      ),
    );
  }
}
