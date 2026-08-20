class UserSession {
  UserSession({
    required this.token,
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    this.courierId,
  });

  final String token;
  final String id;
  final String email;
  final String displayName;
  final String role;
  final String? courierId;

  factory UserSession.fromJson(Map<String, dynamic> json, String token) {
    return UserSession(
      token: token,
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String,
      role: json['role'] as String,
      courierId: json['courierId'] as String?,
    );
  }
}

class PayoutAccount {
  PayoutAccount({
    required this.bankName,
    required this.accountNumber,
    required this.accountName,
    this.note = '',
  });

  final String bankName;
  final String accountNumber;
  final String accountName;
  final String note;

  factory PayoutAccount.fromJson(Map<String, dynamic> json) {
    return PayoutAccount(
      bankName: (json['bankName'] as String?) ?? '',
      accountNumber: (json['accountNumber'] as String?) ?? '',
      accountName: (json['accountName'] as String?) ?? '',
      note: (json['note'] as String?) ?? '',
    );
  }
}

class CourierProfile {
  CourierProfile({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.isOnline,
    required this.earningsToday,
    required this.earningsTotal,
    required this.completedCount,
    this.activeOrderId,
    this.priorityActive = false,
    this.priorityUntil,
    this.priorityFee = 25000,
    this.priorityDays = 7,
    this.priorityLabel = '7 hari',
    this.priorityRequestStatus,
    this.priorityProofUrl,
    this.payoutAccount,
  });

  final String id;
  final String fullName;
  final String phone;
  final bool isOnline;
  final int earningsToday;
  final int earningsTotal;
  final int completedCount;
  final String? activeOrderId;
  final bool priorityActive;
  final String? priorityUntil;
  final int priorityFee;
  final int priorityDays;
  final String priorityLabel;
  final String? priorityRequestStatus;
  final String? priorityProofUrl;
  final PayoutAccount? payoutAccount;

  factory CourierProfile.fromJson(Map<String, dynamic> json) {
    final payout = json['payoutAccount'];
    final days = (json['priorityDays'] as num?)?.toInt() ?? 7;
    final label = (json['priorityLabel'] as String?)?.trim();
    return CourierProfile(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      phone: (json['phone'] as String?) ?? '',
      isOnline: json['isOnline'] as bool? ?? false,
      earningsToday: (json['earningsToday'] as num?)?.toInt() ?? 0,
      earningsTotal: (json['earningsTotal'] as num?)?.toInt() ?? 0,
      completedCount: (json['completedCount'] as num?)?.toInt() ?? 0,
      activeOrderId: json['activeOrderId'] as String?,
      priorityActive: json['priorityActive'] as bool? ?? false,
      priorityUntil: json['priorityUntil'] as String?,
      priorityFee: (json['priorityFee'] as num?)?.toInt() ?? 25000,
      priorityDays: days,
      priorityLabel: (label != null && label.isNotEmpty) ? label : '$days hari',
      priorityRequestStatus: json['priorityRequestStatus'] as String?,
      priorityProofUrl: json['priorityProofUrl'] as String?,
      payoutAccount: payout is Map<String, dynamic>
          ? PayoutAccount.fromJson(payout)
          : null,
    );
  }

  CourierProfile copyWith({bool? isOnline, String? activeOrderId}) {
    return CourierProfile(
      id: id,
      fullName: fullName,
      phone: phone,
      isOnline: isOnline ?? this.isOnline,
      earningsToday: earningsToday,
      earningsTotal: earningsTotal,
      completedCount: completedCount,
      activeOrderId: activeOrderId ?? this.activeOrderId,
      priorityActive: priorityActive,
      priorityUntil: priorityUntil,
      priorityFee: priorityFee,
      priorityDays: priorityDays,
      priorityLabel: priorityLabel,
      priorityRequestStatus: priorityRequestStatus,
      priorityProofUrl: priorityProofUrl,
      payoutAccount: payoutAccount,
    );
  }
}

class CourierOfferMeta {
  CourierOfferMeta({
    required this.exclusive,
    this.distanceToOutletKm,
    this.ttlSec,
    this.offerTtlSec,
    this.note,
  });

  final bool exclusive;
  final double? distanceToOutletKm;
  final int? ttlSec;
  final int? offerTtlSec;
  final String? note;

  factory CourierOfferMeta.fromJson(Map<String, dynamic> json) {
    return CourierOfferMeta(
      exclusive: json['exclusive'] as bool? ?? true,
      distanceToOutletKm: (json['distanceToOutletKm'] as num?)?.toDouble(),
      ttlSec: (json['ttlSec'] as num?)?.toInt(),
      offerTtlSec: (json['offerTtlSec'] as num?)?.toInt(),
      note: json['note'] as String?,
    );
  }
}

class CourierOrder {
  CourierOrder({
    required this.id,
    required this.status,
    required this.foodSubtotal,
    required this.deliveryFee,
    required this.courierEarning,
    required this.grandTotal,
    required this.deliveryAddress,
    required this.customerName,
    required this.merchantNames,
    required this.itemNames,
    this.billedDistanceKm,
    this.foodReady = false,
    this.offer,
  });

  final String id;
  final String status;
  final int foodSubtotal;
  final int deliveryFee;
  final int courierEarning;
  final int grandTotal;
  final String deliveryAddress;
  final String customerName;
  final List<String> merchantNames;
  final List<String> itemNames;
  final int? billedDistanceKm;
  final bool foodReady;
  final CourierOfferMeta? offer;

  factory CourierOrder.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>?;
    final merchants = (json['merchants'] as List<dynamic>? ?? [])
        .map((e) => e as Map<String, dynamic>)
        .toList();
    final items = (json['items'] as List<dynamic>? ?? [])
        .map((e) => e as Map<String, dynamic>)
        .toList();
    final liveMerchants = merchants
        .where((m) => (m['status'] as String?) != 'REJECTED')
        .toList();
    final foodReady = liveMerchants.isNotEmpty &&
        liveMerchants.every((m) {
          final st = m['status'] as String?;
          return st == 'READY' || st == 'COMPLETED';
        });
    final offerRaw = json['offer'] as Map<String, dynamic>?;
    return CourierOrder(
      id: json['id'] as String,
      status: json['status'] as String,
      foodSubtotal: (json['foodSubtotal'] as num).toInt(),
      deliveryFee: (json['deliveryFee'] as num).toInt(),
      courierEarning: (json['courierEarning'] as num?)?.toInt() ??
          (json['deliveryFee'] as num).toInt(),
      grandTotal: (json['grandTotal'] as num).toInt(),
      deliveryAddress: (json['deliveryAddress'] as String?) ?? '',
      customerName: (customer?['fullName'] as String?) ?? 'Customer',
      merchantNames: merchants
          .map((m) => (m['merchant'] as Map<String, dynamic>?)?['name'] as String? ??
              m['merchantId'] as String)
          .toList(),
      itemNames: items
          .map((i) => '${i['name']} x${i['qty']}')
          .cast<String>()
          .toList(),
      billedDistanceKm: (json['billedDistanceKm'] as num?)?.toInt(),
      foodReady: foodReady,
      offer: offerRaw == null ? null : CourierOfferMeta.fromJson(offerRaw),
    );
  }
}
