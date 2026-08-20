import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../state/cart_state.dart';
import '../state/location_state.dart';
import '../theme/app_theme.dart';
import '../widgets/fly_to_cart.dart';
import '../widgets/motion.dart';
import '../widgets/qty_stepper.dart';
import 'cart_screen.dart';

class MerchantDetailScreen extends StatefulWidget {
  const MerchantDetailScreen({super.key, required this.merchantId});

  final String merchantId;

  @override
  State<MerchantDetailScreen> createState() => _MerchantDetailScreenState();
}

class _MerchantDetailScreenState extends State<MerchantDetailScreen> {
  late Future<Merchant> _future;
  String _category = 'Terlaris';
  final _bagKey = GlobalKey();
  int _cartBump = 0;

  void _addMenu(BuildContext thumbContext, MenuItem menu, Merchant merchant) {
    final start = globalRectOf(thumbContext);
    HapticFeedback.lightImpact();
    context.read<CartState>().add(menu, merchantId: merchant.id, merchantName: merchant.name);
    setState(() => _cartBump++);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final end = globalRectOfKey(_bagKey);
      if (start == null || end == null) return;
      FlyToCart.show(
        context: context,
        from: start,
        to: end,
        imageUrl: StitchAssets.menuPhoto(menu.name),
      );
    });
  }

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getMerchant(widget.merchantId);
  }

  double _km(Merchant m) {
    final loc = context.read<LocationState>();
    return LocationState.kmBetween(loc.latitude, loc.longitude, m.latitude, m.longitude);
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();

    return Scaffold(
      backgroundColor: Colors.white,
      body: FutureBuilder<Merchant>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final merchant = snap.data!;
          final cats = ['Terlaris', ...merchant.menus.map((m) => m.category.isEmpty ? 'Lainnya' : m.category).toSet()];
          final menus = _category == 'Terlaris'
              ? merchant.menus
              : merchant.menus.where((m) => (m.category.isEmpty ? 'Lainnya' : m.category) == _category).toList();
          final d = _km(merchant);
          final min = (12 + d * 6).round().clamp(12, 40);

          return Stack(
            children: [
              CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 208,
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: Image.network(
                              StitchAssets.merchantPhoto(merchant.name, merchant.photoUrl),
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(color: const Color(0xFFDCE6EF)),
                            ),
                          ),
                          Positioned(
                            top: MediaQuery.of(context).padding.top + 16,
                            left: 16,
                            right: 16,
                            child: Row(
                              children: [
                                _round(Icons.arrow_back_rounded, () => Navigator.pop(context)),
                                const Spacer(),
                                TweenAnimationBuilder<double>(
                                  key: ValueKey(_cartBump),
                                  tween: Tween(begin: _cartBump == 0 ? 1.0 : 0.78, end: 1),
                                  duration: const Duration(milliseconds: 320),
                                  curve: Curves.elasticOut,
                                  builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
                                  child: Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    _round(Icons.shopping_bag_outlined, () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(builder: (_) => const CartScreen()),
                                      );
                                    }, key: _bagKey),
                                    if (cart.itemCount > 0)
                                      Positioned(
                                        top: -2,
                                        right: -2,
                                        child: CircleAvatar(
                                          radius: 9,
                                          backgroundColor: AppColors.primary,
                                          child: Text(
                                            '${cart.itemCount}',
                                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                                          ),
                                        ),
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
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(merchant.name, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, height: 1.15)),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.near_me_rounded, size: 16, color: AppColors.primary),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${d.toStringAsFixed(1)} km  •  ',
                                      style: const TextStyle(color: AppColors.body, fontSize: 14),
                                    ),
                                    const Icon(Icons.schedule_rounded, size: 16, color: AppColors.body),
                                    Text(' $min menit', style: const TextStyle(color: AppColors.body, fontSize: 14)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Container(
                            height: 32,
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                                SizedBox(width: 4),
                                Text('4.8', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 56,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                        scrollDirection: Axis.horizontal,
                        itemCount: cats.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, i) {
                          final c = cats[i];
                          final on = c == _category;
                          return GestureDetector(
                            onTap: () => setState(() => _category = c),
                            child: Container(
                              height: 40,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: on ? AppColors.ink : Colors.white,
                                borderRadius: BorderRadius.circular(999),
                                border: on ? null : Border.all(color: const Color(0xFFE5E7EB)),
                              ),
                              child: Text(
                                c,
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  color: on ? Colors.white : AppColors.body,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, cart.itemCount > 0 ? 120 : 32),
                    sliver: SliverList.separated(
                      itemCount: menus.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final menu = menus[i];
                        final qty = cart.qtyFor(menu.id);
                        return _MenuRow(
                          menu: menu,
                          qty: qty,
                          onAdd: (thumbContext) => _addMenu(thumbContext, menu, merchant),
                          onSub: () => cart.setQty(menu.id, qty - 1),
                        );
                      },
                    ),
                  ),
                ],
              ),
              if (cart.itemCount > 0)
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 16 + MediaQuery.of(context).padding.bottom,
                  child: PressScale(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const CartScreen()),
                      );
                    },
                    child: Container(
                      height: 56,
                      padding: const EdgeInsets.fromLTRB(18, 0, 6, 0),
                      decoration: BoxDecoration(
                        color: AppColors.ink,
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: const [BoxShadow(color: Color(0x38000000), blurRadius: 28, offset: Offset(0, 12))],
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Text(rupiah(cart.foodSubtotal), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                          const Spacer(),
                          Container(
                            height: 40,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text(
                              'Lihat keranjang',
                              style: TextStyle(color: AppColors.ink, fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _round(IconData icon, VoidCallback onTap, {Key? key}) {
    return Material(
      key: key,
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 40, height: 40, child: Icon(icon)),
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.menu,
    required this.qty,
    required this.onAdd,
    required this.onSub,
  });

  final MenuItem menu;
  final int qty;
  final void Function(BuildContext thumbContext) onAdd;
  final VoidCallback onSub;

  @override
  Widget build(BuildContext context) {
    BuildContext? thumbContext;
    return Row(
      children: [
        Builder(
          builder: (ctx) {
            thumbContext = ctx;
            return ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(
                StitchAssets.menuPhoto(menu.name),
                width: 64,
                height: 64,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 64,
                  height: 64,
                  color: AppColors.primarySoft,
                ),
              ),
            );
          },
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(menu.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 6),
              Container(
                height: 28,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.payments_rounded, size: 14, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      rupiah(menu.price),
                      style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        QtyStepper(
          qty: qty,
          onAdd: () {
            final ctx = thumbContext;
            if (ctx != null) onAdd(ctx);
          },
          onSub: onSub,
        ),
      ],
    );
  }
}
