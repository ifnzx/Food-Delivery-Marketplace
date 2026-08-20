import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import '../services/api_client.dart';

class AuthState extends ChangeNotifier {
  AuthState(this._api);

  final ApiClient _api;
  UserSession? session;
  bool loading = true;

  Future<void> bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final id = prefs.getString('userId');
    final email = prefs.getString('email');
    final name = prefs.getString('displayName');
    final role = prefs.getString('role');
    final customerId = prefs.getString('customerId');
    if (token != null && id != null && email != null && name != null && role != null) {
      session = UserSession(
        token: token,
        id: id,
        email: email,
        displayName: name,
        role: role,
        customerId: customerId,
      );
      _api.setToken(token);
    }
    loading = false;
    notifyListeners();
  }

  Future<void> _persist(UserSession user) async {
    session = user;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', user.token);
    await prefs.setString('userId', user.id);
    await prefs.setString('email', user.email);
    await prefs.setString('displayName', user.displayName);
    await prefs.setString('role', user.role);
    if (user.customerId != null) {
      await prefs.setString('customerId', user.customerId!);
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final user = await _api.login(email.trim(), password);
    if (user.role != 'CUSTOMER' && user.role != 'ADMIN') {
      throw ApiException('Akun ini bukan customer');
    }
    await _persist(user);
  }

  Future<String?> sendRegisterOtp(String phone) async {
    final data = await _api.sendCustomerOtp(phone.trim());
    return data['demoOtp']?.toString();
  }

  Future<void> register({
    required String fullName,
    required String phone,
    required String password,
    required String otp,
  }) async {
    final user = await _api.registerCustomer(
      fullName: fullName.trim(),
      phone: phone.trim(),
      password: password,
      otp: otp.trim(),
    );
    if (user.role != 'CUSTOMER') {
      throw ApiException('Pendaftaran gagal');
    }
    await _persist(user);
  }

  Future<void> logout() async {
    session = null;
    _api.setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}
