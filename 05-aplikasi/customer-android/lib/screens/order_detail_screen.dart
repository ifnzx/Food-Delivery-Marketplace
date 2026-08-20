import 'dart:async';

import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../state/location_state.dart';
import '../theme/app_theme.dart';
import '../widgets/delivery_progress.dart';
import '../widgets/dk_map.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  OrderSummary? _order;
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final order = await context.read<ApiClient>().getOrder(widget.orderId);
      if (mounted) setState(() => _order = order);
    } on ApiException catch (e) {
      if (!silent && mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      backgroundColor: const Color(0xFFDCE6EF),
      body: order == null
          ? Center(
              child: _error != null
                  ? Text(_error!, style: const TextStyle(color: AppColors.danger))
                  : const CircularProgressIndicator(),
            )
          : Stack(
              children: [
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: MediaQuery.of(context).size.height * 0.38,
                  child: _orderMap(order),
                ),
                Positioned(
                  top: MediaQuery.of(context).padding.top + 16,
                  left: 16,
                  child: Material(
                    color: Colors.white,
                    shape: const CircleBorder(),
                    elevation: 3,
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () => Navigator.pop(context),
                      child: const SizedBox(width: 44, height: 44, child: Icon(Icons.close_rounded)),
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Container(
                    height: MediaQuery.of(context).size.height * 0.62,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                      boxShadow: [BoxShadow(color: Color(0x1F000000), blurRadius: 28, offset: Offset(0, -8))],
                    ),
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                      children: [
                        Center(
                          child: Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: const Color(0xFFD9D9D9),
                              borderRadius: BorderRadius.circular(99),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        DeliveryProgress(status: order.status),
                        if (order.courierName != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.line),
                            ),
                            child: Row(
                              children: [
                                ClipOval(
                                  child: Image.network(
                                    StitchAssets.courierPhoto,
                                    width: 44,
                                    height: 44,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        const CircleAvatar(child: Icon(Icons.person)),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    order.courierName!,
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.payments_rounded, color: AppColors.primary),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text('Tunai ke kurir', style: TextStyle(fontWeight: FontWeight.w700)),
                              ),
                              Text(rupiah(order.grandTotal), style: const TextStyle(fontWeight: FontWeight.w800)),
                            ],
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

  Widget _orderMap(OrderSummary order) {
    final pins = <DkMapPin>[];
    if (order.merchantLatitude != null && order.merchantLongitude != null) {
      pins.add(
        DkMapPin(
          point: LatLng(order.merchantLatitude!, order.merchantLongitude!),
          label: order.merchantName ?? 'Warung',
          color: AppColors.primary,
        ),
      );
    }
    if (order.deliveryLatitude != null && order.deliveryLongitude != null) {
      pins.add(
        DkMapPin(
          point: LatLng(order.deliveryLatitude!, order.deliveryLongitude!),
          label: 'Kamu',
          color: AppColors.ink,
        ),
      );
    }
    if (order.courierLatitude != null && order.courierLongitude != null) {
      pins.add(
        DkMapPin(
          point: LatLng(order.courierLatitude!, order.courierLongitude!),
          label: 'Kurir',
          color: const Color(0xFF2563EB),
        ),
      );
    }
    final center = pins.isNotEmpty
        ? pins.first.point
        : const LatLng(LocationState.fallbackLat, LocationState.fallbackLng);
    return DkMap(center: center, pins: pins, zoom: 14);
  }
}
