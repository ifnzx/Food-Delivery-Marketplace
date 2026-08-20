import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../services/order_alerts.dart';
import '../widgets/dk_bottom_nav.dart';
import 'billing_screen.dart';
import 'menu_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';

class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _index = 0;
  int _incoming = 0;
  OutletOrderAlertService? _alerts;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startAlerts());
  }

  void _startAlerts() {
    if (!mounted || _alerts != null) return;
    _alerts = OutletOrderAlertService(
      context.read<ApiClient>(),
      onIncomingCount: (n) {
        if (!mounted || _incoming == n) return;
        setState(() => _incoming = n);
      },
      onOpenOrders: () {
        if (!mounted) return;
        setState(() => _index = 0);
      },
    );
    _alerts!.start();
  }

  @override
  void dispose() {
    _alerts?.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = const [
      OrdersScreen(),
      MenuScreen(),
      BillingScreen(),
      ProfileScreen(),
    ];
    return Scaffold(
      extendBody: true,
      body: pages[_index],
      bottomNavigationBar: DkBottomNav(
        index: _index,
        onTap: (i) => setState(() => _index = i),
        badgeAt: _incoming > 0 ? 0 : null,
        badgeCount: _incoming,
        items: const [
          DkNavItem(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long_rounded, label: 'Pesanan'),
          DkNavItem(icon: Icons.restaurant_menu_outlined, activeIcon: Icons.restaurant_menu_rounded, label: 'Menu'),
          DkNavItem(icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet_rounded, label: 'Tagihan'),
          DkNavItem(icon: Icons.person_outline, activeIcon: Icons.person_rounded, label: 'Akun'),
        ],
      ),
    );
  }
}
