import 'dart:io' show Platform;

/// Base URL for local API.
/// Override: flutter run --dart-define=API_BASE=http://192.168.x.x:3001
class ApiConfig {
  static String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (Platform.isAndroid) return 'http://10.0.2.2:3001';
    return 'http://127.0.0.1:3001';
  }
}
