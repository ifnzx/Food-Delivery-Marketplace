import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_client.dart';

class LocationState extends ChangeNotifier {
  LocationState(this._api);

  final ApiClient _api;

  static const fallbackLat = -3.3249;
  static const fallbackLng = 114.5921;
  static const fallbackAddress = 'Jl. Veteran, Banjarmasin';

  double latitude = fallbackLat;
  double longitude = fallbackLng;
  String address = fallbackAddress;
  bool locating = false;
  bool fromGps = false;
  bool fromNetwork = false;
  double? accuracyMeters;
  String? error;

  Map<String, dynamic> get deliveryPayload => {
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
      };

  String get shortAddress {
    final parts = address.split(',');
    return parts.first.trim().isEmpty ? address : parts.first.trim();
  }

  String get sourceLabel {
    if (locating) return 'Mengambil lokasi...';
    if (fromGps && accuracyMeters != null) {
      return 'GPS ±${accuracyMeters!.round()} m';
    }
    if (fromGps) return 'Lokasi GPS';
    if (fromNetwork) return 'Lokasi jaringan (bukan chip GPS)';
    return 'Lokasi cadangan';
  }

  static double kmBetween(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371.0;
    final dLat = (lat2 - lat1) * pi / 180;
    final dLng = (lng2 - lng1) * pi / 180;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180) * cos(lat2 * pi / 180) * sin(dLng / 2) * sin(dLng / 2);
    return r * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  /// Default AVD (Googleplex) — bukan lokasi pengguna.
  static bool isEmulatorStub(double lat, double lng) {
    if (lat.abs() < 0.01 && lng.abs() < 0.01) return true;
    return kmBetween(lat, lng, 37.421998, -122.084) < 12 ||
        kmBetween(lat, lng, 37.3896, -122.0819) < 8;
  }

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    latitude = prefs.getDouble('locLat') ?? fallbackLat;
    longitude = prefs.getDouble('locLng') ?? fallbackLng;
    address = prefs.getString('locAddress') ?? fallbackAddress;
    fromGps = prefs.getBool('locGps') ?? false;
    fromNetwork = prefs.getBool('locNet') ?? false;
    notifyListeners();
  }

  LocationSettings get _gpsSettings {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return AndroidSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 0,
        intervalDuration: const Duration(seconds: 1),
        timeLimit: const Duration(seconds: 25),
        forceLocationManager: true,
      );
    }
    return const LocationSettings(
      accuracy: LocationAccuracy.best,
      timeLimit: Duration(seconds: 25),
    );
  }

  Future<void> locate() async {
    locating = true;
    error = null;
    notifyListeners();
    try {
      final on = await Geolocator.isLocationServiceEnabled();
      if (!on) {
        throw ApiException('Layanan lokasi mati. Nyalakan GPS di HP.');
      }
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        throw ApiException('Izin lokasi ditolak. Pilih Akurasi tepat / Precise.');
      }

      Position? pos = await Geolocator.getLastKnownPosition();
      try {
        pos = await Geolocator.getCurrentPosition(locationSettings: _gpsSettings);
      } catch (_) {
        pos ??= await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 12),
          ),
        );
      }

      final stub = isEmulatorStub(pos.latitude, pos.longitude);
      final coarse = pos.accuracy > 800;
      if (stub || coarse) {
        final ip = await _ipLocation();
        if (ip != null) {
          accuracyMeters = 3000;
          await setPoint(ip.$1, ip.$2, gps: false, network: true);
          error = stub
              ? 'Emulator memakai GPS palsu. Lokasi disamakan dengan jaringan laptop (seperti Chrome).'
              : 'GPS kasar (±${pos.accuracy.round()} m). Pakai lokasi jaringan.';
          return;
        }
        if (stub) {
          throw ApiException(
            'GPS emulator masih default (AS). Set lokasi: tombol … emulator → Location, atau tes di HP fisik.',
          );
        }
      }

      accuracyMeters = pos.accuracy;
      await setPoint(pos.latitude, pos.longitude, gps: true);
      if (pos.accuracy > 80) {
        error = 'GPS ±${pos.accuracy.round()} m. Di luar / dekat jendela biasanya lebih tepat.';
      }
    } catch (e) {
      try {
        final ip = await _ipLocation();
        if (ip != null) {
          accuracyMeters = 3000;
          await setPoint(ip.$1, ip.$2, gps: false, network: true);
          error = 'GPS gagal. Pakai lokasi jaringan seperti browser.';
          return;
        }
      } catch (_) {}
      error = e is ApiException ? e.message : 'Gagal ambil GPS.';
    } finally {
      locating = false;
      notifyListeners();
    }
  }

  Future<(double, double)?> _ipLocation() async {
    try {
      final res = await http.get(Uri.parse('http://ip-api.com/json/?fields=status,lat,lon')).timeout(
            const Duration(seconds: 8),
          );
      if (res.statusCode != 200) return null;
      final body = jsonDecode(res.body);
      if (body is! Map || body['status'] != 'success') return null;
      final lat = (body['lat'] as num?)?.toDouble();
      final lng = (body['lon'] as num?)?.toDouble();
      if (lat == null || lng == null) return null;
      return (lat, lng);
    } catch (_) {
      return null;
    }
  }

  Future<void> setPoint(double lat, double lng, {bool gps = false, bool network = false}) async {
    latitude = lat;
    longitude = lng;
    fromGps = gps;
    fromNetwork = network;
    try {
      address = await _api.reverseGeocode(lat, lng);
      await _api.saveMyLocation(latitude: lat, longitude: lng, address: address);
    } catch (_) {
      address = '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('locLat', lat);
    await prefs.setDouble('locLng', lng);
    await prefs.setString('locAddress', address);
    await prefs.setBool('locGps', gps);
    await prefs.setBool('locNet', network);
    notifyListeners();
  }
}
