import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import '../services/api_client.dart';

class AuthState extends ChangeNotifier {
  AuthState(this._api);

  final ApiClient _api;
  UserSession? session;
  MerchantProfile? profile;
  bool loading = true;

  Future<void> bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final id = prefs.getString('userId');
    final email = prefs.getString('email');
    final name = prefs.getString('displayName');
    final role = prefs.getString('role');
    final merchantId = prefs.getString('merchantId');
    if (token != null && id != null && email != null && name != null && role != null) {
      session = UserSession(
        token: token,
        id: id,
        email: email,
        displayName: name,
        role: role,
        merchantId: merchantId,
      );
      _api.setToken(token);
      _api.merchantId = merchantId;
      try {
        profile = await _api.getProfile();
      } catch (_) {}
    }
    loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final user = await _api.login(email.trim(), password);
    if (user.role != 'MERCHANT') {
      throw ApiException('Akun ini bukan outlet');
    }
    session = user;
    profile = await _api.getProfile();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', user.token);
    await prefs.setString('userId', user.id);
    await prefs.setString('email', user.email);
    await prefs.setString('displayName', user.displayName);
    await prefs.setString('role', user.role);
    if (user.merchantId != null || profile?.id != null) {
      await prefs.setString('merchantId', user.merchantId ?? profile!.id);
    }
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    profile = await _api.getProfile();
    notifyListeners();
  }

  Future<void> setOpen(bool value) async {
    if (value) {
      await HapticFeedback.mediumImpact();
    } else {
      await HapticFeedback.heavyImpact();
    }
    await _api.setOpen(value);
    profile = await _api.getProfile();
    notifyListeners();
  }

  Future<void> updateLocation({
    required double latitude,
    required double longitude,
  }) async {
    await _api.updateLocation(latitude: latitude, longitude: longitude);
    profile = await _api.getProfile();
    notifyListeners();
  }

  Future<void> logout() async {
    session = null;
    profile = null;
    _api.setToken(null);
    _api.merchantId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}
