class UserSession {
  UserSession({
    required this.token,
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    this.merchantId,
  });

  final String token;
  final String id;
  final String email;
  final String displayName;
  final String role;
  final String? merchantId;

  factory UserSession.fromJson(Map<String, dynamic> json, String token) {
    return UserSession(
      token: token,
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String,
      role: json['role'] as String,
      merchantId: json['merchantId'] as String?,
    );
  }
}

class MerchantStats {
  MerchantStats({
    required this.totalSales,
    required this.totalCommission,
    required this.merchantAmount,
    required this.completedOrders,
    required this.outstandingAmount,
  });

  final int totalSales;
  final int totalCommission;
  final int merchantAmount;
  final int completedOrders;
  final int outstandingAmount;

  factory MerchantStats.fromJson(Map<String, dynamic> json) {
    return MerchantStats(
      totalSales: (json['totalSales'] as num?)?.toInt() ?? 0,
      totalCommission: (json['totalCommission'] as num?)?.toInt() ?? 0,
      merchantAmount: (json['merchantAmount'] as num?)?.toInt() ?? 0,
      completedOrders: (json['completedOrders'] as num?)?.toInt() ?? 0,
      outstandingAmount: (json['outstandingAmount'] as num?)?.toInt() ?? 0,
    );
  }
}

class PayoutAccount {
  PayoutAccount({
    required this.bankName,
    required this.accountNumber,
    required this.accountName,
    required this.note,
  });

  final String bankName;
  final String accountNumber;
  final String accountName;
  final String note;

  factory PayoutAccount.fromJson(Map<String, dynamic> json) {
    return PayoutAccount(
      bankName: (json['bankName'] as String?) ?? '-',
      accountNumber: (json['accountNumber'] as String?) ?? '-',
      accountName: (json['accountName'] as String?) ?? '-',
      note: (json['note'] as String?) ??
          'Transfer fee komisi ke rekening founder platform.',
    );
  }
}

class MerchantProfile {
  MerchantProfile({
    required this.id,
    required this.name,
    required this.description,
    required this.phone,
    required this.address,
    required this.isOpen,
    required this.status,
    required this.outstandingAmount,
    required this.commissionRate,
    this.isFeatured = false,
    this.featuredRequestStatus,
    this.commissionMix = const [],
    this.commissionMixNote = '',
    required this.stats,
    this.payoutAccount,
    this.latitude,
    this.longitude,
    this.photoUrl = '',
  });

  final String id;
  final String name;
  final String description;
  final String phone;
  final String address;
  final bool isOpen;
  final String status;
  final int outstandingAmount;
  final double commissionRate;
  final bool isFeatured;
  final String? featuredRequestStatus;
  final List<CommissionBucket> commissionMix;
  final String commissionMixNote;
  final MerchantStats stats;
  final PayoutAccount? payoutAccount;
  final double? latitude;
  final double? longitude;
  final String photoUrl;

  factory MerchantProfile.fromJson(Map<String, dynamic> json) {
    final payout = json['payoutAccount'];
    return MerchantProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      description: (json['description'] as String?) ?? '',
      phone: (json['phone'] as String?) ?? '',
      address: (json['address'] as String?) ?? '',
      isOpen: json['isOpen'] as bool? ?? true,
      status: (json['status'] as String?) ?? 'ACTIVE',
      outstandingAmount: (json['outstandingAmount'] as num?)?.toInt() ?? 0,
      commissionRate: (json['commissionRate'] as num?)?.toDouble() ?? 0.15,
      isFeatured: json['isFeatured'] as bool? ?? false,
      featuredRequestStatus: json['featuredRequestStatus'] as String?,
      commissionMix: (json['commissionMix'] as List<dynamic>? ?? [])
          .map((e) => CommissionBucket.fromJson(e as Map<String, dynamic>))
          .toList(),
      commissionMixNote: (json['commissionMixNote'] as String?) ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      photoUrl: (json['photoUrl'] as String?) ?? '',
      stats: MerchantStats.fromJson(
        (json['stats'] as Map<String, dynamic>?) ?? {},
      ),
      payoutAccount: payout is Map<String, dynamic>
          ? PayoutAccount.fromJson(payout)
          : null,
    );
  }
}

class MenuItem {
  MenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.stock,
    required this.isAvailable,
  });

  final String id;
  final String name;
  final String description;
  final int price;
  final String category;
  final int stock;
  final bool isAvailable;

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['id'] as String,
      name: json['name'] as String,
      description: (json['description'] as String?) ?? '',
      price: (json['price'] as num).toInt(),
      category: (json['category'] as String?) ?? 'Makanan',
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      isAvailable: json['isAvailable'] as bool? ?? true,
    );
  }
}

class OutletOrder {
  OutletOrder({
    required this.id,
    required this.status,
    required this.customerName,
    required this.deliveryAddress,
    required this.myStatus,
    required this.subtotal,
    required this.commissionAmount,
    required this.merchantAmount,
    required this.itemNames,
  });

  final String id;
  final String status;
  final String customerName;
  final String deliveryAddress;
  final String myStatus;
  final int subtotal;
  final int commissionAmount;
  final int merchantAmount;
  final List<String> itemNames;

  factory OutletOrder.fromJson(Map<String, dynamic> json, String merchantId) {
    final customer = json['customer'] as Map<String, dynamic>?;
    final merchants = (json['merchants'] as List<dynamic>? ?? [])
        .map((e) => e as Map<String, dynamic>)
        .toList();
    final mine = merchants.firstWhere(
      (m) => m['merchantId'] == merchantId,
      orElse: () => <String, dynamic>{},
    );
    final items = (json['items'] as List<dynamic>? ?? [])
        .map((e) => e as Map<String, dynamic>)
        .where((i) => i['merchantId'] == merchantId)
        .toList();
    return OutletOrder(
      id: json['id'] as String,
      status: json['status'] as String,
      customerName: (customer?['fullName'] as String?) ?? 'Customer',
      deliveryAddress: (json['deliveryAddress'] as String?) ?? '',
      myStatus: (mine['status'] as String?) ?? 'WAITING',
      subtotal: (mine['subtotal'] as num?)?.toInt() ?? 0,
      commissionAmount: (mine['commissionAmount'] as num?)?.toInt() ?? 0,
      merchantAmount: (mine['merchantAmount'] as num?)?.toInt() ?? 0,
      itemNames: items.map((i) => '${i['name']} x${i['qty']}').cast<String>().toList(),
    );
  }
}

class CommissionBucket {
  CommissionBucket({
    required this.percent,
    required this.orderCount,
    required this.foodSubtotal,
    required this.commissionAmount,
    required this.label,
  });

  final int percent;
  final int orderCount;
  final int foodSubtotal;
  final int commissionAmount;
  final String label;

  factory CommissionBucket.fromJson(Map<String, dynamic> json) {
    return CommissionBucket(
      percent: (json['percent'] as num?)?.toInt() ??
          (((json['rate'] as num?)?.toDouble() ?? 0) * 100).round(),
      orderCount: (json['orderCount'] as num?)?.toInt() ?? 0,
      foodSubtotal: (json['foodSubtotal'] as num?)?.toInt() ?? 0,
      commissionAmount: (json['commissionAmount'] as num?)?.toInt() ?? 0,
      label: (json['label'] as String?) ?? 'Komisi',
    );
  }
}

class SettlementRow {
  SettlementRow({
    required this.id,
    required this.commissionAmount,
    required this.paidAmount,
    required this.status,
    required this.createdAt,
    this.rates = const [],
    this.rateNote = '',
  });

  final String id;
  final int commissionAmount;
  final int paidAmount;
  final String status;
  final DateTime? createdAt;
  final List<CommissionBucket> rates;
  final String rateNote;

  factory SettlementRow.fromJson(Map<String, dynamic> json) {
    return SettlementRow(
      id: json['id'] as String,
      commissionAmount: (json['commissionAmount'] as num).toInt(),
      paidAmount: (json['paidAmount'] as num).toInt(),
      status: json['status'] as String,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      rates: (json['rates'] as List<dynamic>? ?? [])
          .map((e) => CommissionBucket.fromJson(e as Map<String, dynamic>))
          .toList(),
      rateNote: (json['rateNote'] as String?) ?? '',
    );
  }
}
