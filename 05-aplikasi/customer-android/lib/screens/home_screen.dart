import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../state/location_state.dart';
import '../theme/app_theme.dart';
import '../widgets/delivery_progress.dart';
import '../widgets/motion.dart';
import 'merchant_detail_screen.dart';
import 'order_detail_screen.dart';

class _Cat {
  const _Cat(this.label, this.icon, this.key, this.keys);
  final String label;
  final IconData icon;
  final String key;
  final List<String> keys;
}

const _cats = [
  _Cat('Promo', Icons.sell_rounded, 'hemat', []),
  _Cat('Ayam', Icons.outdoor_grill_rounded, 'ayam', ['ayam', 'chicken']),
  _Cat('Nasi', Icons.rice_bowl_rounded, 'nasi', ['nasi', 'rice']),
  _Cat('Burger', Icons.lunch_dining_rounded, 'burger', ['burger']),
  _Cat('Pizza', Icons.local_pizza_rounded, 'pizza', ['pizza']),
  _Cat('Kopi', Icons.coffee_rounded, 'kopi', ['kopi', 'coffee', 'cafe']),
  _Cat('Minuman', Icons.local_cafe_rounded, 'minuman', ['teh', 'es ', 'minum', 'kopi', 'jus', 'jeruk']),
  _Cat('Salad', Icons.eco_rounded, 'salad', ['salad', 'sayur']),
];

const _tints = [
  Color(0xFFEEF2FF),
  Color(0xFFFEF3C7),
  Color(0xFFDCFCE7),
  Color(0xFFFFE4E6),
  Color(0xFFFFEDD5),
  Color(0xFFE0F2FE),
  Color(0xFFF3E8FF),
  Color(0xFFECFCCB),
];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.onOpenOrders});

  final VoidCallback? onOpenOrders;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Merchant>> _future;
  List<OrderSummary> _orders = [];
  String _cat = '';
  String _query = '';
  bool _showSearch = false;

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getMerchants();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      final orders = await context.read<ApiClient>().getOrders();
      if (mounted) setState(() => _orders = orders);
    } catch (_) {}
  }

  Future<void> _reload() async {
    setState(() => _future = context.read<ApiClient>().getMerchants());
    await Future.wait([_future, _loadOrders()]);
  }

  double _km(Merchant m) {
    final loc = context.read<LocationState>();
    return LocationState.kmBetween(loc.latitude, loc.longitude, m.latitude, m.longitude);
  }

  String _blob(Merchant m, MenuItem item) =>
      '${item.name} ${item.description} ${item.category} ${m.name} ${m.description}'.toLowerCase();

  @override
  Widget build(BuildContext context) {
    final loc = context.watch<LocationState>();
    return Scaffold(
      backgroundColor: Colors.white,
      body: RefreshIndicator(
        onRefresh: _reload,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              backgroundColor: Colors.white.withValues(alpha: 0.95),
              surfaceTintColor: Colors.white,
              toolbarHeight: _showSearch ? 116 : 72,
              flexibleSpace: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          PressScale(
                            onTap: () {
                              setState(() {
                                _showSearch = !_showSearch;
                                if (!_showSearch) _query = '';
                              });
                            },
                            child: _squareIcon(Icons.search_rounded),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: GestureDetector(
                              onTap: loc.locating ? null : () => loc.locate(),
                              child: Column(
                                children: [
                                  Text(
                                    loc.sourceLabel,
                                    style: const TextStyle(fontSize: 11, color: AppColors.body),
                                  ),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        loc.locating ? Icons.gps_not_fixed_rounded : Icons.location_on_rounded,
                                        size: 18,
                                        color: AppColors.primary,
                                      ),
                                      const SizedBox(width: 2),
                                      Flexible(
                                        child: Text(
                                          loc.shortAddress,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                        ),
                                      ),
                                      const Icon(Icons.my_location_rounded, size: 16, color: AppColors.body),
                                    ],
                                  ),
                                  if (loc.error != null)
                                    Text(
                                      loc.error!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 10, color: AppColors.danger),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          PressScale(
                            onTap: widget.onOpenOrders,
                            child: Stack(
                              children: [
                                _squareIcon(Icons.notifications_rounded),
                                Positioned(
                                  top: 10,
                                  right: 10,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (_showSearch) ...[
                        const SizedBox(height: 10),
                        TextField(
                          autofocus: true,
                          onChanged: (v) => setState(() => _query = v),
                          decoration: InputDecoration(
                            hintText: 'Cari ayam, nasi, warung...',
                            prefixIcon: const Icon(Icons.search_rounded, color: AppColors.body),
                            filled: true,
                            fillColor: const Color(0xFFF3F4F6),
                            contentPadding: EdgeInsets.zero,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide.none,
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: FadeUp(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                  child: HeroBanner(
                    child: Stack(
                      children: [
                        Positioned(
                          right: -24,
                          top: -32,
                          child: BlobLoop(
                            child: Container(
                              width: 112,
                              height: 112,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          right: 64,
                          bottom: 0,
                          child: BlobLoop(
                            child: Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                        const Positioned(
                          right: 8,
                          bottom: 0,
                          child: ScooterLoop(
                            child: Icon(Icons.delivery_dining_rounded, size: 86, color: Color(0xE6FFFFFF)),
                          ),
                        ),
                        const Positioned(
                          right: 88,
                          top: 16,
                          child: FloatLoop(
                            dy: 10,
                            rot: 0.12,
                            duration: Duration(milliseconds: 2800),
                            child: Icon(Icons.fastfood_rounded, size: 28, color: Colors.white),
                          ),
                        ),
                        const Positioned(
                          right: 32,
                          top: 12,
                          child: FloatLoop(
                            dy: 8,
                            rot: 0.14,
                            reverseRot: true,
                            duration: Duration(milliseconds: 2200),
                            child: Icon(Icons.favorite_rounded, size: 22, color: Colors.white),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(
                                width: 220,
                                child: Text(
                                  'Lapar? Tenang.\nPesan makan jadi gampang.',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 22,
                                    height: 1.15,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              PressScale(
                                child: Container(
                                  height: 36,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  decoration: BoxDecoration(
                                    color: AppColors.ink,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.bolt_rounded, size: 16, color: Colors.white),
                                      SizedBox(width: 4),
                                      Text(
                                        'Pesan sekarang',
                                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 4,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 8,
                  mainAxisExtent: 84,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final c = _cats[i];
                    final on = _cat == c.key;
                    return PressScale(
                      onTap: () => setState(() {
                        _cat = on ? '' : c.key;
                        _query = '';
                        _showSearch = false;
                      }),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: _tints[i],
                              borderRadius: BorderRadius.circular(16),
                              border: on ? Border.all(color: AppColors.primary, width: 2) : null,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: on ? 0.1 : 0.04),
                                  blurRadius: on ? 8 : 4,
                                ),
                              ],
                            ),
                            child: Icon(c.icon, size: 28, color: AppColors.ink),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            c.label,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.ink,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                  childCount: _cats.length,
                ),
              ),
            ),
            SliverToBoxAdapter(child: _trackBlock()),
            FutureBuilder<List<Merchant>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  );
                }
                final merchants = snap.data ?? [];
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                  sliver: SliverToBoxAdapter(child: _results(merchants)),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _squareIcon(IconData icon) {
    return Material(
      color: Colors.white,
      elevation: 3,
      shadowColor: const Color(0x0F000000),
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(width: 48, height: 48, child: Icon(icon)),
    );
  }

  Widget _trackBlock() {
    final active = _orders.where((o) => o.status != 'COMPLETED' && o.status != 'CANCELLED').toList();
    if (active.isEmpty) return const SizedBox(height: 8);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.route_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 6),
              const Expanded(
                child: Text('Lacak pesanan', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              ),
              GestureDetector(
                onTap: widget.onOpenOrders,
                child: const Text('Lihat semua', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (final o in active)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.id)),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        DeliveryProgress(status: o.status, compact: true),
                        const SizedBox(height: 12),
                        const Divider(height: 1, color: AppColors.line),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${o.id} · Tunai ${rupiah(o.grandTotal)}',
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12, color: AppColors.body),
                              ),
                            ),
                            const Text('Lacak', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 13)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _results(List<Merchant> merchants) {
    var list = [...merchants];
    if (_cat == 'hemat') {
      int minp(Merchant m) => m.menus.isEmpty ? 1 << 30 : m.menus.map((i) => i.price).reduce(min);
      list.sort((a, b) => minp(a).compareTo(minp(b)));
    }
    final q = _query.trim().toLowerCase();
    _Cat? activeCat;
    for (final c in _cats) {
      if (c.key == _cat) activeCat = c;
    }
    var dishHits = <(Merchant, MenuItem)>[];
    var showDishes = activeCat != null && activeCat.key != 'hemat';
    if (showDishes) {
      for (final m in merchants) {
        for (final item in m.menus) {
          final blob = _blob(m, item);
          if (activeCat.keys.any(blob.contains)) dishHits.add((m, item));
        }
      }
    }
    if (q.isNotEmpty) {
      dishHits = [];
      for (final m in merchants) {
        for (final item in m.menus) {
          final blob = '${item.name} ${item.description} ${item.category}'.toLowerCase();
          if (blob.contains(q)) dishHits.add((m, item));
        }
      }
      showDishes = dishHits.isNotEmpty;
      if (!showDishes) {
        list = list
            .where((m) => m.name.toLowerCase().contains(q) || m.description.toLowerCase().contains(q))
            .toList();
      }
    }
    final title = q.isNotEmpty
        ? 'Hasil pencarian'
        : showDishes
            ? 'Menu ${activeCat!.label}'
            : _cat == 'hemat'
                ? 'Harga hemat'
                : 'Rekomendasi';
    final countLabel = showDishes ? '${dishHits.length} menu' : '${list.length} warung';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.local_fire_department_rounded, color: AppColors.primary),
            const SizedBox(width: 6),
            Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22))),
            if (_cat.isNotEmpty && q.isEmpty)
              GestureDetector(
                onTap: () => setState(() => _cat = ''),
                child: const Text('Lihat semua', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 12)),
              )
            else
              Text(countLabel, style: const TextStyle(color: AppColors.body, fontWeight: FontWeight.w700, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 12),
        if (showDishes)
          ...dishHits.map((hit) => _dishCard(hit.$1, hit.$2))
        else
          ...list.map(_warungCard),
        if ((showDishes && dishHits.isEmpty) || (!showDishes && list.isEmpty))
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: Text('Tidak ada warung.', style: TextStyle(color: AppColors.body)),
          ),
      ],
    );
  }

  Widget _dishCard(Merchant m, MenuItem item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: _tapCard(
        onTap: () => _openMerchant(m.id),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: Image.network(
                    StitchAssets.menuPhoto(item.name),
                    height: 144,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(height: 144, color: AppColors.primarySoft),
                  ),
                ),
                Positioned(
                  left: 12,
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(999)),
                    child: Text(rupiah(item.price), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  Text(m.name, style: const TextStyle(color: AppColors.body, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _warungCard(Merchant m) {
    final d = _km(m);
    final min = (12 + d * 6).round().clamp(12, 40);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: _tapCard(
        onTap: () => _openMerchant(m.id),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: Image.network(
                    StitchAssets.merchantPhoto(m.name, m.photoUrl),
                    height: 176,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(height: 176, color: AppColors.primarySoft),
                  ),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    height: 32,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 6)],
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                        SizedBox(width: 4),
                        Text('4.8', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
                if (!m.isOpen)
                  Positioned.fill(
                    child: Container(
                      color: Colors.black45,
                      alignment: Alignment.center,
                      child: const Text('Tutup', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                    ),
                  )
                else
                  Positioned(
                    left: 12,
                    bottom: 12,
                    child: Container(
                      height: 28,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: AppColors.ink.withValues(alpha: 0.8),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.schedule_rounded, size: 14, color: Colors.white),
                          const SizedBox(width: 4),
                          Text('$min–${min + 5} mnt', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(m.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.near_me_rounded, size: 16, color: AppColors.primary),
                      const SizedBox(width: 4),
                      Text(
                        '${d.toStringAsFixed(1)} km  •  ',
                        style: const TextStyle(color: AppColors.body, fontSize: 13),
                      ),
                      const Icon(Icons.two_wheeler_rounded, size: 16, color: AppColors.body),
                      const Text(' kurir siap', style: TextStyle(color: AppColors.body, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tapCard({required Widget child, required VoidCallback onTap}) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
            boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2))],
          ),
          clipBehavior: Clip.antiAlias,
          child: child,
        ),
      ),
    );
  }

  void _openMerchant(String id) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => MerchantDetailScreen(merchantId: id)),
    );
  }
}
