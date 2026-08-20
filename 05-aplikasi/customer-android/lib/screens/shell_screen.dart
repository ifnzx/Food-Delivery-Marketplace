import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../state/cart_state.dart';
import '../state/location_state.dart';
import '../widgets/dk_bottom_nav.dart';
import '../widgets/motion.dart';
import 'cart_screen.dart';
import 'home_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';

class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final api = context.read<ApiClient>();
      api.setToken(context.read<AuthState>().session?.token);
      context.read<LocationState>().locate();
    });
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<CartState>().itemCount;
    final pages = [
      HomeScreen(onOpenOrders: () => setState(() => _index = 2)),
      const CartScreen(),
      const OrdersScreen(),
      ProfileScreen(onOpenOrders: () => setState(() => _index = 2)),
    ];

    return Scaffold(
      extendBody: true,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        switchInCurve: Curves.easeOut,
        child: PageFade(
          key: ValueKey(_index),
          child: pages[_index],
        ),
      ),
      bottomNavigationBar: DkBottomNav(
        index: _index,
        onTap: (i) => setState(() => _index = i),
        badgeAt: cartCount > 0 ? 1 : null,
        items: const [
          DkNavItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Beranda'),
          DkNavItem(icon: Icons.shopping_bag_outlined, activeIcon: Icons.shopping_bag_rounded, label: 'Keranjang'),
          DkNavItem(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long_rounded, label: 'Pesanan'),
          DkNavItem(icon: Icons.person_outline, activeIcon: Icons.person_rounded, label: 'Akun'),
        ],
      ),
    );
  }
}
