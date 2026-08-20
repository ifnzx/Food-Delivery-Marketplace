import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../theme/app_theme.dart';

class DkMapPin {
  const DkMapPin({required this.point, required this.label, required this.color});
  final LatLng point;
  final String label;
  final Color color;
}

/// Peta jalan sungguhan (Leaflet + OpenStreetMap), sama seperti fallback di customer.html.
class DkMap extends StatefulWidget {
  const DkMap({
    super.key,
    required this.center,
    this.pins = const [],
    this.onTap,
    this.zoom = 16,
    this.interactive = true,
  });

  final LatLng center;
  final List<DkMapPin> pins;
  final void Function(LatLng point)? onTap;
  final double zoom;
  final bool interactive;

  @override
  State<DkMap> createState() => _DkMapState();
}

class _DkMapState extends State<DkMap> {
  late final WebViewController _web;
  var _ready = false;

  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFE8EEF2))
      ..addJavaScriptChannel(
        'DkPick',
        onMessageReceived: (msg) {
          final parts = msg.message.split(',');
          if (parts.length != 2 || widget.onTap == null) return;
          final lat = double.tryParse(parts[0]);
          final lng = double.tryParse(parts[1]);
          if (lat == null || lng == null) return;
          widget.onTap!(LatLng(lat, lng));
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _ready = true);
          },
        ),
      )
      ..loadHtmlString(_html());
  }

  @override
  void didUpdateWidget(DkMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    final moved = (oldWidget.center.latitude - widget.center.latitude).abs() > 0.00005 ||
        (oldWidget.center.longitude - widget.center.longitude).abs() > 0.00005 ||
        oldWidget.pins.length != widget.pins.length;
    if (moved) _web.loadHtmlString(_html());
  }

  String _html() {
    final pins = widget.pins.isEmpty
        ? [
            DkMapPin(point: widget.center, label: 'Lokasi', color: AppColors.primary),
          ]
        : widget.pins;
    final pinJs = jsonEncode(
      pins
          .map(
            (p) => {
              'lat': p.point.latitude,
              'lng': p.point.longitude,
              'label': p.label,
              'color': '#${p.color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}',
            },
          )
          .toList(),
    );
    final click = widget.onTap == null
        ? ''
        : "map.on('click', function(e){ DkPick.postMessage(e.latlng.lat + ',' + e.latlng.lng); });";
    final drag = widget.interactive
        ? ''
        : 'dragging: false, scrollWheelZoom: false, tap: false,';
    return '''
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; width: 100%; background: #e8eef2; }
  .dk-pin { color: #fff; font: 700 11px/1.2 sans-serif; padding: 3px 7px; border-radius: 8px; white-space: nowrap; }
</style>
</head>
<body>
<div id="map"></div>
<script>
const pins = $pinJs;
const map = L.map('map', { zoomControl: true, $drag attributionControl: false })
  .setView([${widget.center.latitude}, ${widget.center.longitude}], ${widget.zoom});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: 'OpenStreetMap'
}).addTo(map);
const latlngs = [];
pins.forEach((p) => {
  const icon = L.divIcon({
    className: '',
    html: '<div class="dk-pin" style="background:' + p.color + '">' + p.label + '</div>',
    iconSize: [80, 24],
    iconAnchor: [40, 24]
  });
  L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
  latlngs.push([p.lat, p.lng]);
});
if (latlngs.length >= 2) {
  L.polyline(latlngs, { color: '#22C55E', weight: 4, opacity: 0.9 }).addTo(map);
  map.fitBounds(latlngs, { padding: [28, 28] });
}
$click
setTimeout(function(){ map.invalidateSize(); }, 120);
</script>
</body>
</html>
''';
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        WebViewWidget(controller: _web),
        if (!_ready)
          const ColoredBox(
            color: Color(0xFFE8EEF2),
            child: Center(child: CircularProgressIndicator()),
          ),
      ],
    );
  }
}
