import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../state/cart_state.dart';
import '../state/location_state.dart';
import '../theme/app_theme.dart';
import '../widgets/dk_map.dart';
import 'order_detail_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _preview;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPreview());
  }

  Future<void> _loadPreview() async {
    final cart = context.read<CartState>();
    final loc = context.read<LocationState>();
    final api = context.read<ApiClient>();
    api.setToken(context.read<AuthState>().session?.token);
    try {
      final preview = await api.previewOrder(
            merchantItems: cart.toMerchantItemsPayload(),
            delivery: loc.deliveryPayload,
          );
      if (mounted) setState(() => _preview = preview);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _placeOrder() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final cart = context.read<CartState>();
      final loc = context.read<LocationState>();
      final api = context.read<ApiClient>();
      api.setToken(context.read<AuthState>().session?.token);
      final order = await api.createOrder(
            merchantItems: cart.toMerchantItemsPayload(),
            delivery: loc.deliveryPayload,
          );
      cart.clear();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.id)),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _moveTo(double lat, double lng, {bool gps = false}) async {
    await context.read<LocationState>().setPoint(lat, lng, gps: gps);
    await _loadPreview();
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();
    final loc = context.watch<LocationState>();
    final food = (_preview?['foodSubtotal'] as num?)?.toInt() ?? cart.foodSubtotal;
    final delivery = (_preview?['deliveryFee'] as num?)?.toInt() ?? 0;
    final total = (_preview?['grandTotal'] as num?)?.toInt() ?? food + delivery;
    final here = LatLng(loc.latitude, loc.longitude);

    return Scaffold(
      backgroundColor: const Color(0xFFDCE6EF),
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            bottom: MediaQuery.of(context).size.height * 0.42,
            child: DkMap(
              center: here,
              zoom: 16,
              onTap: (point) => _moveTo(point.latitude, point.longitude),
              pins: [
                DkMapPin(point: here, label: 'Antar ke sini', color: AppColors.ink),
              ],
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            right: 16,
            child: Material(
              color: Colors.white,
              elevation: 3,
              borderRadius: BorderRadius.circular(999),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: loc.locating
                    ? null
                    : () async {
                        await loc.locate();
                        if (!mounted) return;
                        await _loadPreview();
                      },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      Icon(
                        loc.locating ? Icons.gps_not_fixed_rounded : Icons.my_location_rounded,
                        color: AppColors.primary,
                        size: 18,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        loc.locating ? 'GPS...' : 'Pakai GPS',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              height: MediaQuery.of(context).size.height * 0.58,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                boxShadow: [BoxShadow(color: Color(0x14000000), blurRadius: 16, offset: Offset(0, -4))],
              ),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: const Color(0xFFD9D9D9), borderRadius: BorderRadius.circular(99)),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                    child: Row(
                      children: [
                        Material(
                          color: const Color(0xFFF3F4F6),
                          shape: const CircleBorder(),
                          child: InkWell(
                            customBorder: const CircleBorder(),
                            onTap: () => Navigator.pop(context),
                            child: const SizedBox(width: 40, height: 40, child: Icon(Icons.chevron_left_rounded)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Ketuk peta atau GPS', style: TextStyle(fontSize: 11, color: AppColors.body)),
                              Text(
                                'Ke: ${loc.shortAddress}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: Color(0xFFF3F4F6)),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                      children: [
                        Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Waktu antar', style: TextStyle(color: AppColors.body, fontSize: 14)),
                                Text(
                                  '${(_preview?['etaMinutes'] as num?)?.toInt() ?? 20} menit',
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                                ),
                              ],
                            ),
                            const Spacer(),
                            const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 36),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Promo ongkir dipakai', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                                    Text('Biaya layanan Rp0', style: TextStyle(color: Colors.white70, fontSize: 13)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text('Pembayaran', style: TextStyle(color: AppColors.body, fontSize: 14)),
                        const SizedBox(height: 8),
                        const Row(
                          children: [
                            Icon(Icons.payments_rounded, color: AppColors.primary, size: 28),
                            SizedBox(width: 12),
                            Expanded(child: Text('Tunai ke kurir', style: TextStyle(fontWeight: FontWeight.w800))),
                            Icon(Icons.expand_more_rounded),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Text('Pesananmu', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                        const SizedBox(height: 8),
                        for (final line in cart.lines)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              children: [
                                Expanded(child: Text('${line.menu.name} × ${line.qty}', style: const TextStyle(fontSize: 15))),
                                Text(rupiah(line.subtotal), style: const TextStyle(fontWeight: FontWeight.w700)),
                              ],
                            ),
                          ),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            children: [
                              const Text('Ongkir', style: TextStyle(color: AppColors.body)),
                              const Spacer(),
                              Text(rupiah(delivery), style: const TextStyle(color: AppColors.body)),
                            ],
                          ),
                        ),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
                          ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + MediaQuery.of(context).padding.bottom),
                    child: SizedBox(
                      height: 52,
                      child: FilledButton(
                        onPressed: _busy || _preview == null ? null : _placeOrder,
                        child: _busy
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text('Pesan : ${rupiah(total)}'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
