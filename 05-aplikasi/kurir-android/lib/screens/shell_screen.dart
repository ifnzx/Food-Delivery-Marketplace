import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../services/order_alerts.dart';
import '../widgets/dk_bottom_nav.dart';
import 'earnings_screen.dart';
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
  int _available = 0;
  CourierOrderAlertService? _alerts;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startAlerts());
  }

  void _startAlerts() {
    if (!mounted || _alerts != null) return;
    _alerts = CourierOrderAlertService(
      context.read<ApiClient>(),
      onAvailableCount: (n) {
        if (!mounted || _available == n) return;
        setState(() => _available = n);
      },
      onOpenHome: () {
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
      HomeScreen(),
      OrdersScreen(),
      EarningsScreen(),
      ProfileScreen(),
    ];
    return Scaffold(
      extendBody: true,
      body: pages[_index],
      bottomNavigationBar: DkBottomNav(
        index: _index,
        onTap: (i) => setState(() => _index = i),
        badgeAt: _available > 0 ? 0 : null,
        badgeCount: _available,
        items: const [
          DkNavItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Beranda'),
          DkNavItem(icon: Icons.local_shipping_outlined, activeIcon: Icons.local_shipping_rounded, label: 'Order'),
          DkNavItem(icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet_rounded, label: 'Pendapatan'),
          DkNavItem(icon: Icons.person_outline, activeIcon: Icons.person_rounded, label: 'Akun'),
        ],
      ),
    );
  }
}
