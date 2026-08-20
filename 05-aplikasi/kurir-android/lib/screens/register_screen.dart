import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _nik = TextEditingController();
  final _ktpName = TextEditingController();
  final _place = TextEditingController();
  final _dob = TextEditingController();
  final _address = TextEditingController();

  int _step = 0;
  bool _busy = false;
  String? _error;
  String? _success;
  String? _ktpDataUrl;
  String? _ocrNote;
  List<String> _mismatches = [];
  double _ocrConfidence = 0;
  String _fullNameFromOcr = '';

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    _nik.dispose();
    _ktpName.dispose();
    _place.dispose();
    _dob.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<String?> _pickKtpImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 82,
      maxWidth: 1400,
    );
    if (file == null) return null;
    final bytes = await file.readAsBytes();
    return 'data:image/jpeg;base64,${base64Encode(bytes)}';
  }

  Future<void> _scanKtp() async {
    setState(() {
      _busy = true;
      _error = null;
      _ocrNote = null;
      _mismatches = [];
    });
    try {
      final dataUrl = await _pickKtpImage();
      if (dataUrl == null) {
        setState(() => _busy = false);
        return;
      }
      _ktpDataUrl = dataUrl;
      final result = await context.read<ApiClient>().scanKtpOcr(
            ktpPhotoUrl: dataUrl,
            fullName: _name.text.trim(),
            nik: _nik.text.trim(),
          );
      final ocr = result['ocr'] as Map<String, dynamic>? ?? {};
      _fullNameFromOcr = ocr['fullName']?.toString() ?? '';
      _ocrConfidence = (ocr['confidence'] as num?)?.toDouble() ?? 0;
      _ocrNote = ocr['note']?.toString() ?? result['message']?.toString();
      _mismatches = (result['mismatches'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList();
      _nik.text = ocr['nik']?.toString() ?? _nik.text;
      _ktpName.text = ocr['fullName']?.toString().isNotEmpty == true
          ? ocr['fullName'].toString()
          : _name.text.trim();
      _place.text = ocr['placeOfBirth']?.toString() ?? '';
      _dob.text = ocr['dateOfBirth']?.toString() ?? '';
      _address.text = ocr['address']?.toString() ?? '';
      setState(() => _step = 2);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Gagal membaca foto KTP.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    final nik = _nik.text.replaceAll(RegExp(r'\D'), '');
    if (nik.length != 16) {
      setState(() => _error = 'NIK wajib 16 digit.');
      return;
    }
    final verifiedName = _ktpName.text.trim();
    if (verifiedName.split(RegExp(r'\s+')).length < 2) {
      setState(() => _error = 'Nama sesuai KTP minimal dua kata.');
      return;
    }
    if (_ktpDataUrl == null) {
      setState(() => _error = 'Foto KTP wajib diunggah.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _success = null;
    });
    try {
      final msg = await context.read<ApiClient>().registerCourier(
            fullName: verifiedName,
            phone: _phone.text.trim(),
            email: _email.text.trim(),
            password: _password.text,
            ktpPhotoUrl: _ktpDataUrl!,
            nik: nik,
            placeOfBirth: _place.text.trim(),
            dateOfBirth: _dob.text.trim(),
            addressOnKtp: _address.text.trim(),
            fullNameFromOcr: _fullNameFromOcr,
            ocrConfidence: _ocrConfidence,
          );
      setState(() => _success = msg);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Tidak bisa terhubung ke server lokal.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Daftar sebagai kurir'),
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.ink,
        elevation: 0,
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: [
              Color(0xFFDBEAFE),
              Color(0xFFFFFFFF),
              Color(0xFFDCFCE7),
            ],
            stops: [0, 0.46, 1],
          ),
        ),
        child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text(
            'Unggah foto KTP — sistem membaca NIK dan biodata. Periksa lalu koreksi jika ada yang tidak cocok sebelum kirim.',
            style: TextStyle(color: AppColors.body, height: 1.4),
          ),
          const SizedBox(height: 16),
          if (_step == 0) ...[
            TextField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Nama lengkap (awal)'),
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phone,
              decoration: const InputDecoration(labelText: 'Nomor WhatsApp'),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password'),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () {
                      if (_name.text.trim().split(RegExp(r'\s+')).length < 2) {
                        setState(() => _error = 'Nama minimal dua kata.');
                        return;
                      }
                      setState(() {
                        _error = null;
                        _step = 1;
                      });
                    },
              child: const Text('Lanjut — unggah KTP'),
            ),
          ],
          if (_step == 1) ...[
            const Text(
              'Ambil foto KTP yang jelas. Pastikan NIK dan nama terbaca.',
              style: TextStyle(color: AppColors.body),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _busy ? null : _scanKtp,
              icon: _busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.badge_outlined),
              label: Text(_busy ? 'Membaca KTP…' : 'Ambil / pilih foto KTP'),
            ),
            TextButton(
              onPressed: () => setState(() => _step = 0),
              child: const Text('Kembali'),
            ),
          ],
          if (_step == 2) ...[
            if (_ktpDataUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.memory(
                  base64Decode(_ktpDataUrl!.split(',').last),
                  height: 160,
                  width: double.infinity,
                  fit: BoxFit.contain,
                ),
              ),
            const SizedBox(height: 12),
            Text(
              'Verifikasi data KTP',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
            ),
            if (_ocrNote != null) ...[
              const SizedBox(height: 8),
              Text(_ocrNote!, style: const TextStyle(color: AppColors.body)),
            ],
            if (_mismatches.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Ada data tidak cocok — sesuaikan sebelum kirim: ${_mismatches.join(", ")}',
                style: const TextStyle(color: AppColors.danger),
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _nik,
              decoration: InputDecoration(
                labelText: 'NIK (16 digit)',
                errorText: _mismatches.contains('nik') ? 'Periksa NIK' : null,
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _ktpName,
              decoration: InputDecoration(
                labelText: 'Nama sesuai KTP',
                errorText:
                    _mismatches.contains('fullName') ? 'Periksa nama' : null,
              ),
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _place,
              decoration: const InputDecoration(labelText: 'Tempat lahir'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _dob,
              decoration: const InputDecoration(labelText: 'Tanggal lahir'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _address,
              decoration: const InputDecoration(labelText: 'Alamat KTP'),
              maxLines: 2,
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy || _success != null ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Kirim pendaftaran'),
            ),
            TextButton(
              onPressed: () => setState(() => _step = 1),
              child: const Text('Ganti foto KTP'),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          if (_success != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F6F4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _success!,
                style: const TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Kembali ke login'),
            ),
          ],
        ],
      ),
      ),
    );
  }
}
