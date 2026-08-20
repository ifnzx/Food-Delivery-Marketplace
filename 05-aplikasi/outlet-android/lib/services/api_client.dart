import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/models.dart';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  String? _token;
  String? merchantId;

  void setToken(String? token) => _token = token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  Future<Map<String, dynamic>> _decodeMap(http.Response res) async {
    final body = res.body.isEmpty ? <String, dynamic>{} : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      final msg = body is Map && body['error'] != null
          ? body['error'].toString()
          : 'Request gagal (${res.statusCode})';
      throw ApiException(msg);
    }
    return body as Map<String, dynamic>;
  }

  Future<UserSession> login(String email, String password) async {
    final res = await _client.post(
      _uri('/api/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = await _decodeMap(res);
    final token = data['token'] as String;
    setToken(token);
    final user = UserSession.fromJson(data['user'] as Map<String, dynamic>, token);
    merchantId = user.merchantId;
    return user;
  }

  Future<String> registerOutlet({
    required String name,
    required String ownerName,
    required String phone,
    required String email,
    required String password,
    required String address,
  }) async {
    final res = await _client.post(
      _uri('/api/auth/register-outlet'),
      headers: _headers,
      body: jsonEncode({
        'name': name,
        'ownerName': ownerName,
        'phone': phone,
        'email': email,
        'password': password,
        'address': address,
      }),
    );
    final data = await _decodeMap(res);
    return data['message']?.toString() ??
        'Pendaftaran berhasil. Menunggu persetujuan Super Admin.';
  }

  Future<MerchantProfile> getProfile() async {
    final res = await _client.get(_uri('/api/merchants/me/profile'), headers: _headers);
    final data = await _decodeMap(res);
    merchantId = data['id'] as String?;
    return MerchantProfile.fromJson(data);
  }

  Future<void> setOpen(bool isOpen) async {
    final res = await _client.post(
      _uri('/api/merchants/me/open'),
      headers: _headers,
      body: jsonEncode({'isOpen': isOpen}),
    );
    await _decodeMap(res);
  }

  Future<Map<String, dynamic>> requestFeatured() async {
    final res = await _client.post(
      _uri('/api/merchants/me/featured'),
      headers: _headers,
      body: jsonEncode({'confirm': true}),
    );
    return _decodeMap(res);
  }

  Future<void> updateLocation({
    required double latitude,
    required double longitude,
  }) async {
    final res = await _client.patch(
      _uri('/api/merchants/me/profile'),
      headers: _headers,
      body: jsonEncode({
        'latitude': latitude,
        'longitude': longitude,
      }),
    );
    await _decodeMap(res);
  }

  Future<List<OutletOrder>> getOrders() async {
    final res = await _client.get(_uri('/api/orders'), headers: _headers);
    if (res.statusCode >= 400) throw ApiException('Gagal memuat pesanan');
    final mid = merchantId;
    if (mid == null) throw ApiException('Merchant belum teridentifikasi');
    final body = jsonDecode(res.body) as List<dynamic>;
    return body
        .map((e) => OutletOrder.fromJson(e as Map<String, dynamic>, mid))
        .toList();
  }

  Future<OutletOrder> respondOrder(String orderId, {required bool accept}) async {
    final res = await _client.post(
      _uri('/api/orders/$orderId/merchant-respond'),
      headers: _headers,
      body: jsonEncode({'accept': accept}),
    );
    final data = await _decodeMap(res);
    return OutletOrder.fromJson(data, merchantId!);
  }

  Future<OutletOrder> updateOrderStatus(String orderId, String status) async {
    final res = await _client.post(
      _uri('/api/orders/$orderId/merchant-status'),
      headers: _headers,
      body: jsonEncode({'status': status}),
    );
    final data = await _decodeMap(res);
    return OutletOrder.fromJson(data, merchantId!);
  }

  Future<List<MenuItem>> getMenus() async {
    final res = await _client.get(_uri('/api/merchants/me/menus'), headers: _headers);
    if (res.statusCode >= 400) throw ApiException('Gagal memuat menu');
    final body = jsonDecode(res.body) as List<dynamic>;
    return body.map((e) => MenuItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<MenuItem> createMenu({
    required String name,
    required int price,
    String description = '',
    String category = 'Makanan',
  }) async {
    final res = await _client.post(
      _uri('/api/merchants/me/menus'),
      headers: _headers,
      body: jsonEncode({
        'name': name,
        'price': price,
        'description': description,
        'category': category,
      }),
    );
    return MenuItem.fromJson(await _decodeMap(res));
  }

  Future<MenuItem> updateMenu(String id, Map<String, dynamic> patch) async {
    final res = await _client.patch(
      _uri('/api/merchants/me/menus/$id'),
      headers: _headers,
      body: jsonEncode(patch),
    );
    return MenuItem.fromJson(await _decodeMap(res));
  }

  Future<List<SettlementRow>> getSettlements() async {
    final res = await _client.get(_uri('/api/settlements'), headers: _headers);
    if (res.statusCode >= 400) throw ApiException('Gagal memuat tagihan');
    final body = jsonDecode(res.body) as List<dynamic>;
    return body
        .map((e) => SettlementRow.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<SettlementRow> createSettlement(String proofUrl) async {
    if (!proofUrl.startsWith('data:image/') &&
        !proofUrl.startsWith('http')) {
      throw ApiException(
        'Wajib unggah foto bukti transfer agar Super Admin bisa mencocokkan mutasi rekening.',
      );
    }
    final res = await _client.post(
      _uri('/api/settlements'),
      headers: _headers,
      body: jsonEncode({'proofUrl': proofUrl}),
    );
    return SettlementRow.fromJson(await _decodeMap(res));
  }

  Future<List<Map<String, dynamic>>> mySupportReports() async {
    final res = await _client.get(_uri('/api/support-reports/me'), headers: _headers);
    if (res.statusCode >= 400) throw ApiException('Gagal memuat laporan bantuan');
    final body = jsonDecode(res.body) as List<dynamic>;
    return body.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> submitSupportReport({
    required String category,
    required String subject,
    required String body,
    String? orderId,
  }) async {
    final res = await _client.post(
      _uri('/api/support-reports'),
      headers: _headers,
      body: jsonEncode({
        'category': category,
        'subject': subject,
        'body': body,
        if (orderId != null && orderId.isNotEmpty) 'orderId': orderId,
      }),
    );
    return _decodeMap(res);
  }
}
