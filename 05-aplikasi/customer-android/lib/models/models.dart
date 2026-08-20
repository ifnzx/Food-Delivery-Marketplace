class UserSession {
  UserSession({
    required this.token,
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    this.customerId,
  });

  final String token;
  final String id;
  final String email;
  final String displayName;
  final String role;
  final String? customerId;

  factory UserSession.fromJson(Map<String, dynamic> json, String token) {
    return UserSession(
      token: token,
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String,
      role: json['role'] as String,
      customerId: json['customerId'] as String?,
    );
  }
}

class MenuItem {
  MenuItem({
    required this.id,
    required this.merchantId,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.isAvailable,
  });

  final String id;
  final String merchantId;
  final String name;
  final String description;
  final int price;
  final String category;
  final bool isAvailable;

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['id'] as String,
      merchantId: json['merchantId'] as String,
      name: json['name'] as String,
      description: (json['description'] as String?) ?? '',
      price: (json['price'] as num).toInt(),
      category: (json['category'] as String?) ?? 'Makanan',
      isAvailable: json['isAvailable'] as bool? ?? true,
    );
  }
}

class Merchant {
  Merchant({
    required this.id,
    required this.name,
    required this.description,
    required this.address,
    required this.isOpen,
    required this.latitude,
    required this.longitude,
    required this.menus,
    this.photoUrl = '',
  });

  final String id;
  final String name;
  final String description;
  final String address;
  final bool isOpen;
  final double latitude;
  final double longitude;
  final String photoUrl;
  final List<MenuItem> menus;

  factory Merchant.fromJson(Map<String, dynamic> json) {
    final menus = (json['menus'] as List<dynamic>? ?? [])
        .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return Merchant(
      id: json['id'] as String,
      name: json['name'] as String,
      description: (json['description'] as String?) ?? '',
      address: (json['address'] as String?) ?? '',
      isOpen: json['isOpen'] as bool? ?? true,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      photoUrl: (json['photoUrl'] as String?) ?? '',
      menus: menus,
    );
  }
}

class OrderSummary {
  OrderSummary({
    required this.id,
    required this.status,
    required this.foodSubtotal,
    required this.deliveryFee,
    required this.grandTotal,
    required this.deliveryAddress,
    required this.paymentMethod,
    this.courierName,
    this.createdAt,
    this.deliveryLatitude,
    this.deliveryLongitude,
    this.merchantLatitude,
    this.merchantLongitude,
    this.merchantName,
    this.courierLatitude,
    this.courierLongitude,
  });

  final String id;
  final String status;
  final int foodSubtotal;
  final int deliveryFee;
  final int grandTotal;
  final String deliveryAddress;
  final String paymentMethod;
  final String? courierName;
  final DateTime? createdAt;
  final double? deliveryLatitude;
  final double? deliveryLongitude;
  final double? merchantLatitude;
  final double? merchantLongitude;
  final String? merchantName;
  final double? courierLatitude;
  final double? courierLongitude;

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    final courier = json['courier'] as Map<String, dynamic>?;
    final merchants = json['merchants'] as List<dynamic>? ?? [];
    Map<String, dynamic>? merchant;
    if (merchants.isNotEmpty) {
      merchant = merchants.first['merchant'] as Map<String, dynamic>?;
    }
    return OrderSummary(
      id: json['id'] as String,
      status: json['status'] as String,
      foodSubtotal: (json['foodSubtotal'] as num).toInt(),
      deliveryFee: (json['deliveryFee'] as num).toInt(),
      grandTotal: (json['grandTotal'] as num).toInt(),
      deliveryAddress: (json['deliveryAddress'] as String?) ?? '',
      paymentMethod: (json['paymentMethod'] as String?) ?? 'CASH',
      courierName: courier?['fullName'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      deliveryLatitude: (json['deliveryLatitude'] as num?)?.toDouble(),
      deliveryLongitude: (json['deliveryLongitude'] as num?)?.toDouble(),
      merchantLatitude: (merchant?['latitude'] as num?)?.toDouble(),
      merchantLongitude: (merchant?['longitude'] as num?)?.toDouble(),
      merchantName: merchant?['name'] as String?,
      courierLatitude: (courier?['lastLatitude'] as num?)?.toDouble(),
      courierLongitude: (courier?['lastLongitude'] as num?)?.toDouble(),
    );
  }
}
