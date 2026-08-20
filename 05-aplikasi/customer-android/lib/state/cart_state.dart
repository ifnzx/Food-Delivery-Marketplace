import 'package:flutter/foundation.dart';

import '../models/models.dart';

class CartLine {
  CartLine({
    required this.menu,
    required this.merchantId,
    required this.merchantName,
    required this.qty,
  });

  final MenuItem menu;
  final String merchantId;
  final String merchantName;
  int qty;

  int get subtotal => menu.price * qty;
}

class CartState extends ChangeNotifier {
  final List<CartLine> _lines = [];

  List<CartLine> get lines => List.unmodifiable(_lines);

  int get itemCount => _lines.fold(0, (sum, e) => sum + e.qty);

  int get foodSubtotal => _lines.fold(0, (sum, e) => sum + e.subtotal);

  int qtyFor(String menuId) {
    for (final line in _lines) {
      if (line.menu.id == menuId) return line.qty;
    }
    return 0;
  }

  Map<String, List<CartLine>> get byMerchant {
    final map = <String, List<CartLine>>{};
    for (final line in _lines) {
      map.putIfAbsent(line.merchantId, () => []).add(line);
    }
    return map;
  }

  void add(MenuItem menu, {required String merchantId, required String merchantName}) {
    final existing = _lines.where((e) => e.menu.id == menu.id).toList();
    if (existing.isNotEmpty) {
      existing.first.qty += 1;
    } else {
      _lines.add(
        CartLine(
          menu: menu,
          merchantId: merchantId,
          merchantName: merchantName,
          qty: 1,
        ),
      );
    }
    notifyListeners();
  }

  void setQty(String menuId, int qty) {
    if (qty <= 0) {
      _lines.removeWhere((e) => e.menu.id == menuId);
    } else {
      final line = _lines.firstWhere((e) => e.menu.id == menuId);
      line.qty = qty;
    }
    notifyListeners();
  }

  void clear() {
    _lines.clear();
    notifyListeners();
  }

  List<Map<String, dynamic>> toMerchantItemsPayload() {
    return byMerchant.entries.map((entry) {
      return {
        'merchantId': entry.key,
        'items': entry.value
            .map((line) => {'menuId': line.menu.id, 'qty': line.qty})
            .toList(),
      };
    }).toList();
  }
}
