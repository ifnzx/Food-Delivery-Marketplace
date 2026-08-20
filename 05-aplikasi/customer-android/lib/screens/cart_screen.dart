import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/cart_state.dart';
import '../theme/app_theme.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();
    final groups = cart.byMerchant;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: cart.lines.isEmpty
            ? ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                children: [
                  const _Header(),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: const BoxDecoration(color: AppColors.primarySoft, shape: BoxShape.circle),
                          child: const Icon(Icons.shopping_basket_rounded, size: 40, color: AppColors.primary),
                        ),
                        const SizedBox(height: 16),
                        const Text('Keranjang masih lapar 🍽️', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                        const SizedBox(height: 6),
                        const Text(
                          'Yuk pilih menu favorit dari warung terdekat.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.body, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ],
              )
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: [
                  const _Header(),
                  const SizedBox(height: 8),
                  for (final entry in groups.entries) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.line),
                        boxShadow: const [
                          BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: AppColors.primarySoft,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.storefront_rounded, color: AppColors.primary, size: 20),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        entry.value.first.merchantName,
                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                      ),
                                      Text(
                                        '${entry.value.fold<int>(0, (s, e) => s + e.qty)} item',
                                        style: const TextStyle(color: AppColors.secondary, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Divider(height: 1, color: AppColors.line),
                          for (final line in entry.value)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.network(
                                      StitchAssets.menuPhoto(line.menu.name),
                                      width: 64,
                                      height: 64,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(
                                        width: 64,
                                        height: 64,
                                        color: AppColors.primarySoft,
                                        child: const Icon(Icons.restaurant, color: AppColors.primary),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(line.menu.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                        const SizedBox(height: 4),
                                        Text(
                                          rupiah(line.menu.price),
                                          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800),
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            Text(
                                              'Subtotal ${rupiah(line.subtotal)}',
                                              style: const TextStyle(color: AppColors.secondary, fontSize: 12),
                                            ),
                                            const Spacer(),
                                            _QtyBtn(
                                              icon: Icons.remove,
                                              onTap: () => cart.setQty(line.menu.id, line.qty - 1),
                                              filled: false,
                                            ),
                                            Padding(
                                              padding: const EdgeInsets.symmetric(horizontal: 8),
                                              child: Text('${line.qty}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                            ),
                                            _QtyBtn(
                                              icon: Icons.add,
                                              onTap: () => cart.setQty(line.menu.id, line.qty + 1),
                                              filled: true,
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.payments_rounded, color: AppColors.primary),
                        SizedBox(width: 8),
        Expanded(
          child: Text(
            'Bayar tunai ke kurir saat pesanan tiba',
            style: TextStyle(color: AppColors.body, fontSize: 13),
          ),
        ),
                      ],
                    ),
                  ),
                ],
              ),
      ),
      bottomNavigationBar: cart.lines.isEmpty
          ? null
          : Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 88 + MediaQuery.of(context).padding.bottom),
              child: SizedBox(
                height: 56,
                child: FilledButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                    );
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shopping_bag_outlined, size: 20),
                      const SizedBox(width: 8),
                      Text('Bayar · ${rupiah(cart.foodSubtotal)}'),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'PESANAN KAMU',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1, color: AppColors.body),
        ),
        Text('Keranjang', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
      ],
    );
  }
}

class _QtyBtn extends StatelessWidget {
  const _QtyBtn({required this.icon, required this.onTap, required this.filled});

  final IconData icon;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: filled ? AppColors.primary : const Color(0xFFE8E1DC),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 16, color: filled ? Colors.white : AppColors.ink),
      ),
    );
  }
}
