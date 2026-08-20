import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../config/api_config.dart';
import '../screens/splash_screen.dart';
import '../services/order_alerts.dart';
import '../theme/app_theme.dart';

/// Membungkus customer.html — desain, animasi, chat, peta, dan fitur sama dengan web.
class WebCustomerScreen extends StatefulWidget {
  const WebCustomerScreen({super.key});

  @override
  State<WebCustomerScreen> createState() => _WebCustomerScreenState();
}

class _WebCustomerScreenState extends State<WebCustomerScreen> {
  late final WebViewController _web;
  OrderAlertService? _alerts;
  var _loading = true;
  var _bootMin = true;
  String? _error;

  String get _url => '${ApiConfig.baseUrl}/customer.html?app=1';

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) setState(() => _bootMin = false);
    });
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..addJavaScriptChannel('DkGeo', onMessageReceived: _onGeo)
      ..addJavaScriptChannel('DkHaptic', onMessageReceived: (_) {
        HapticFeedback.mediumImpact();
      })
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() { _loading = true; _error = null; });
          },
          onPageFinished: (_) async {
            await _injectGeoBridge();
            _alerts ??= OrderAlertService(_web, onOpenPayload: _openFromNotification);
            await _alerts!.start();
            _alerts!.markWebReady();
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (err) {
            if (err.isForMainFrame == true && mounted) {
              setState(() {
                _loading = false;
                _error = 'Tidak terhubung ke $_url';
              });
            }
          },
        ),
      );

    final platform = _web.platform;
    if (platform is AndroidWebViewController) {
      AndroidWebViewController.enableDebugging(false);
      platform.setGeolocationEnabled(true);
      platform.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (request) async {
          await _ensureGpsPermission();
          return const GeolocationPermissionsResponse(allow: true, retain: true);
        },
      );
      platform.setOnShowFileSelector((params) async {
        final source = params.isCaptureEnabled ? ImageSource.camera : ImageSource.gallery;
        final file = await ImagePicker().pickImage(source: source, imageQuality: 72, maxWidth: 1600);
        if (file == null) return [];
        return [File(file.path).uri.toString()];
      });
    }

    _web.loadRequest(Uri.parse(_url));
  }

  @override
  void dispose() {
    _alerts?.dispose();
    super.dispose();
  }

  Future<void> _ensureGpsPermission() async {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
  }

  Future<void> _injectGeoBridge() async {
    await _web.runJavaScript('''
(function(){
  if (window._dkGeoPatched) return;
  window._dkGeoPatched = true;
  navigator.geolocation.getCurrentPosition = function(ok, err) {
    window._dkGeoOk = ok;
    window._dkGeoErr = err;
    DkGeo.postMessage('get');
  };
  navigator.geolocation.watchPosition = function(ok, err) {
    window._dkGeoOk = ok;
    window._dkGeoErr = err;
    DkGeo.postMessage('watch');
    return 1;
  };
  navigator.geolocation.clearWatch = function(){};
})();
''');
  }

  Future<void> _onGeo(JavaScriptMessage _) async {
    try {
      await _ensureGpsPermission();
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw Exception('off');
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: Platform.isAndroid
            ? AndroidSettings(
                accuracy: LocationAccuracy.best,
                timeLimit: const Duration(seconds: 25),
                forceLocationManager: true,
              )
            : const LocationSettings(
                accuracy: LocationAccuracy.best,
                timeLimit: Duration(seconds: 25),
              ),
      );
      var best = pos;
      if (pos.accuracy > 35) {
        try {
          final again = await Geolocator.getCurrentPosition(
            locationSettings: Platform.isAndroid
                ? AndroidSettings(
                    accuracy: LocationAccuracy.best,
                    timeLimit: const Duration(seconds: 20),
                    forceLocationManager: true,
                  )
                : const LocationSettings(
                    accuracy: LocationAccuracy.best,
                    timeLimit: Duration(seconds: 20),
                  ),
          );
          if (again.accuracy < best.accuracy) best = again;
        } catch (_) {}
      }
      await _web.runJavaScript('''
        if (window._dkGeoOk) {
          window._dkGeoOk({
            coords: {
              latitude: ${best.latitude},
              longitude: ${best.longitude},
              accuracy: ${best.accuracy},
              altitude: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
        }
      ''');
    } catch (_) {
      await _web.runJavaScript('''
        if (window._dkGeoErr) window._dkGeoErr({ code: 1, message: 'Lokasi gagal' });
      ''');
    }
  }

  Future<void> _openFromNotification(String payload) async {
    if (payload == 'home' || payload.startsWith('home:')) {
      await _web.runJavaScript('location.hash = "#/home";');
      return;
    }
    final chat = payload.startsWith('chat:');
    final colon = payload.indexOf(':');
    final id = colon >= 0 ? payload.substring(colon + 1) : payload;
    if (id.isEmpty) return;
    final safeId = jsonEncode(id);
    await _web.runJavaScript('''
      window.__dkOpenChat = ${chat ? 'true' : 'false'};
      (function () {
        var target = "#/order/" + $safeId;
        if (location.hash === target) {
          location.hash = "#/orders";
          setTimeout(function () { location.hash = target; }, 40);
        } else {
          location.hash = target;
        }
      })();
    ''');
  }

  Future<void> _reload() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    await _web.loadRequest(Uri.parse(_url));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _web.canGoBack()) {
          await _web.goBack();
          return;
        }
      },
      child: Scaffold(
        backgroundColor: (_loading || _bootMin) ? const Color(0xFF22C55E) : Colors.white,
        body: Stack(
          children: [
            SafeArea(child: WebViewWidget(controller: _web)),
            if (_loading || _bootMin)
              const BrandLoader(tagline: 'Pesan makan, mudah & cepat'),
            if (_error != null)
              Positioned.fill(
                child: ColoredBox(
                  color: Colors.white,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!, textAlign: TextAlign.center),
                          const SizedBox(height: 8),
                          const Text(
                            'Pastikan npm run dev di 03-backend-lokal, dan HP USB pakai adb reverse tcp:3001 tcp:3001',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: AppColors.body),
                          ),
                          const SizedBox(height: 16),
                          FilledButton(onPressed: _reload, child: const Text('Coba lagi')),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
  }
}
