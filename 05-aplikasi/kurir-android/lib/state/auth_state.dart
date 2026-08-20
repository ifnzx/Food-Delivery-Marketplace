import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import '../services/api_client.dart';

class AuthState extends ChangeNotifier {
  AuthState(this._api);

  final ApiClient _api;
  UserSession? session;
  CourierProfile? profile;
  bool loading = true;

  Future<void> bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final id = prefs.getString('userId');
    final email = prefs.getString('email');
    final name = prefs.getString('displayName');
    final role = prefs.getString('role');
    final courierId = prefs.getString('courierId');
    if (token != null && id != null && email != null && name != null && role != null) {
      session = UserSession(
        token: token,
        id: id,
        email: email,
        displayName: name,
        role: role,
        courierId: courierId,
      );
      _api.setToken(token);
      try {
        profile = await _api.getMe();
      } catch (_) {}
    }
    loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final user = await _api.login(email.trim(), password);
    if (user.role != 'COURIER') {
      throw ApiException('Akun ini bukan kurir');
    }
    session = user;
    profile = await _api.getMe();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', user.token);
    await prefs.setString('userId', user.id);
    await prefs.setString('email', user.email);
    await prefs.setString('displayName', user.displayName);
    await prefs.setString('role', user.role);
    if (user.courierId != null) {
      await prefs.setString('courierId', user.courierId!);
    }
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    profile = await _api.getMe();
    notifyListeners();
  }

  Future<void> setOnline(bool value) async {
    await _api.setOnline(value);
    profile = await _api.getMe();
    notifyListeners();
  }

  Future<void> logout() async {
    session = null;
    profile = null;
    _api.setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}
