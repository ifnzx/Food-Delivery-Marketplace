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

  void setToken(String? token) => _token = token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  Future<Map<String, dynamic>> _decode(http.Response res) async {
    final body = res.body.isEmpty ? <String, dynamic>{} : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      final msg = body is Map && body['error'] != null
          ? body['error'].toString()
          : 'Request gagal (${res.statusCode})';
      throw ApiException(msg);
    }
    if (body is Map<String, dynamic>) return body;
    throw ApiException('Respons tidak valid');
  }

  Future<UserSession> login(String email, String password) async {
    final res = await _client.post(
      _uri('/api/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = await _decode(res);
    final token = data['token'] as String;
    setToken(token);
    return UserSession.fromJson(data['user'] as Map<String, dynamic>, token);
  }

  Future<Map<String, dynamic>> sendCustomerOtp(String phone) async {
    final res = await _client.post(
      _uri('/api/auth/customer-otp/send'),
      headers: _headers,
      body: jsonEncode({'phone': phone}),
    );
    return _decode(res);
  }

  Future<UserSession> registerCustomer({
    required String fullName,
    required String phone,
    required String password,
    required String otp,
  }) async {
    final res = await _client.post(
      _uri('/api/auth/register-customer'),
      headers: _headers,
      body: jsonEncode({
        'fullName': fullName,
        'phone': phone,
        'password': password,
        'otp': otp,
      }),
    );
    final data = await _decode(res);
    final token = data['token'] as String;
    setToken(token);
    return UserSession.fromJson(data['user'] as Map<String, dynamic>, token);
  }

  Future<List<Merchant>> getMerchants() async {
    final res = await _client.get(_uri('/api/merchants'), headers: _headers);
    final body = jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException('Gagal memuat outlet');
    }
    return (body as List<dynamic>)
        .map((e) => Merchant.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Merchant> getMerchant(String id) async {
    final res = await _client.get(_uri('/api/merchants/$id'), headers: _headers);
    final data = await _decode(res);
    return Merchant.fromJson(data);
  }

  Future<Map<String, dynamic>> previewOrder({
    required List<Map<String, dynamic>> merchantItems,
    required Map<String, dynamic> delivery,
    int? forceBilledKm,
  }) async {
    final res = await _client.post(
      _uri('/api/orders/preview'),
      headers: _headers,
      body: jsonEncode({
        'merchantItems': merchantItems,
        'delivery': delivery,
        'forceBilledKm': ?forceBilledKm,
      }),
    );
    return _decode(res);
  }

  Future<OrderSummary> createOrder({
    required List<Map<String, dynamic>> merchantItems,
    required Map<String, dynamic> delivery,
    int? forceBilledKm,
  }) async {
    final res = await _client.post(
      _uri('/api/orders'),
      headers: _headers,
      body: jsonEncode({
        'merchantItems': merchantItems,
        'delivery': delivery,
        'forceBilledKm': ?forceBilledKm,
      }),
    );
    final data = await _decode(res);
    return OrderSummary.fromJson(data);
  }

  Future<List<OrderSummary>> getOrders() async {
    final res = await _client.get(_uri('/api/orders'), headers: _headers);
    if (res.statusCode >= 400) {
      throw ApiException('Gagal memuat pesanan');
    }
    final body = jsonDecode(res.body) as List<dynamic>;
    return body
        .map((e) => OrderSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<OrderSummary> getOrder(String id) async {
    final res = await _client.get(_uri('/api/orders/$id'), headers: _headers);
    final data = await _decode(res);
    return OrderSummary.fromJson(data);
  }

  Future<String> reverseGeocode(double latitude, double longitude) async {
    final res = await _client.post(
      _uri('/api/geo/reverse'),
      headers: _headers,
      body: jsonEncode({'latitude': latitude, 'longitude': longitude}),
    );
    final data = await _decode(res);
    return (data['address'] as String?) ??
        '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}';
  }

  Future<void> saveMyLocation({
    required double latitude,
    required double longitude,
    required String address,
  }) async {
    final res = await _client.patch(
      _uri('/api/customers/me/location'),
      headers: _headers,
      body: jsonEncode({
        'latitude': latitude,
        'longitude': longitude,
        'address': address,
      }),
    );
    if (res.statusCode >= 400) {
      await _decode(res);
    }
  }
}
