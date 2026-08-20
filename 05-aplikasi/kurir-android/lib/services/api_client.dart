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
    return UserSession.fromJson(data['user'] as Map<String, dynamic>, token);
  }

  Future<Map<String, dynamic>> scanKtpOcr({
    required String ktpPhotoUrl,
    String fullName = '',
    String nik = '',
  }) async {
    final res = await _client.post(
      _uri('/api/auth/ktp-ocr'),
      headers: _headers,
      body: jsonEncode({
        'ktpPhotoUrl': ktpPhotoUrl,
        'fullName': fullName,
        'nik': nik,
      }),
    );
    return _decodeMap(res);
  }

  Future<String> registerCourier({
    required String fullName,
    required String phone,
    required String email,
    required String password,
    required String ktpPhotoUrl,
    required String nik,
    String placeOfBirth = '',
    String dateOfBirth = '',
    String addressOnKtp = '',
    String fullNameFromOcr = '',
    double ocrConfidence = 0,
  }) async {
    final res = await _client.post(
      _uri('/api/auth/register-courier'),
      headers: _headers,
      body: jsonEncode({
        'fullName': fullName,
        'phone': phone,
        'email': email,
        'password': password,
        'ktpPhotoUrl': ktpPhotoUrl,
        'nik': nik,
        'placeOfBirth': placeOfBirth,
        'dateOfBirth': dateOfBirth,
        'addressOnKtp': addressOnKtp,
        'fullNameFromOcr': fullNameFromOcr,
        'ocrConfidence': ocrConfidence,
      }),
    );
    final data = await _decodeMap(res);
    return data['message']?.toString() ??
        'Pendaftaran berhasil. Menunggu persetujuan Super Admin.';
  }

  Future<CourierProfile> buyPriority({required String proofUrl}) async {
    final res = await _client.post(
      _uri('/api/couriers/me/priority'),
      headers: _headers,
      body: jsonEncode({'confirmPay': true, 'proofUrl': proofUrl}),
    );
    await _decodeMap(res);
    return getMe();
  }

  Future<CourierProfile> getMe() async {
    final res = await _client.get(_uri('/api/couriers/me'), headers: _headers);
    return CourierProfile.fromJson(await _decodeMap(res));
  }

  Future<CourierProfile> setOnline(bool isOnline) async {
    final res = await _client.post(
      _uri('/api/couriers/me/online'),
      headers: _headers,
      body: jsonEncode({
        'isOnline': isOnline,
        'latitude': -3.3200,
        'longitude': 114.5940,
      }),
    );
    final data = await _decodeMap(res);
    return CourierProfile.fromJson({
      ...data,
      'earningsToday': 0,
      'earningsTotal': 0,
      'completedCount': 0,
    });
  }

  Future<List<CourierOrder>> getAvailableOrders() async {
    final res = await _client.get(
      _uri('/api/couriers/me/available-orders'),
      headers: _headers,
    );
    if (res.statusCode >= 400) throw ApiException('Gagal memuat order');
    final body = jsonDecode(res.body) as List<dynamic>;
    return body
        .map((e) => CourierOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<CourierOrder>> getMyOrders() async {
    final res = await _client.get(_uri('/api/orders'), headers: _headers);
    if (res.statusCode >= 400) throw ApiException('Gagal memuat order');
    final body = jsonDecode(res.body) as List<dynamic>;
    return body
        .map((e) => CourierOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CourierOrder> getOrder(String id) async {
    final res = await _client.get(_uri('/api/orders/$id'), headers: _headers);
    return CourierOrder.fromJson(await _decodeMap(res));
  }

  Future<CourierOrder> acceptOrder(String id) async {
    final assigned = await _client.post(
      _uri('/api/orders/$id/assign-courier'),
      headers: _headers,
      body: '{}',
    );
    await _decodeMap(assigned);
    final res = await _client.post(
      _uri('/api/orders/$id/courier-status'),
      headers: _headers,
      body: jsonEncode({'status': 'COURIER_GOING_TO_OUTLET'}),
    );
    return CourierOrder.fromJson(await _decodeMap(res));
  }

  Future<void> declineOrder(String id) async {
    final res = await _client.post(
      _uri('/api/orders/$id/courier-decline'),
      headers: _headers,
      body: '{}',
    );
    await _decodeMap(res);
  }

  Future<CourierOrder> updateStatus(String id, String status) async {
    final res = await _client.post(
      _uri('/api/orders/$id/courier-status'),
      headers: _headers,
      body: jsonEncode({'status': status}),
    );
    return CourierOrder.fromJson(await _decodeMap(res));
  }

  Future<CourierOrder> completeOrder(String id) async {
    final res = await _client.post(
      _uri('/api/orders/$id/complete'),
      headers: _headers,
      body: '{}',
    );
    return CourierOrder.fromJson(await _decodeMap(res));
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
