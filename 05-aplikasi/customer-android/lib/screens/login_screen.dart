import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../state/auth_state.dart';
import '../theme/app_theme.dart';
import '../widgets/motion.dart';
import '../widgets/otp_verification.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'andi@local.test');
  final _password = TextEditingController(text: 'password123');
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  bool _busy = false;
  bool _register = false;
  bool _otpStep = false;
  bool _showPass = false;
  String? _error;
  String? _demoOtp;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthState>();
      if (_register && _otpStep) {
        if (!RegExp(r'^\d{6}$').hasMatch(_otp.text)) {
          setState(() {
            _error = 'Masukkan 6 digit OTP.';
            _busy = false;
          });
          return;
        }
        await auth.register(
          fullName: _name.text,
          phone: _phone.text,
          password: _password.text,
          otp: _otp.text,
        );
      } else if (_register) {
        _demoOtp = await auth.sendRegisterOtp(_phone.text);
        if (mounted) {
          setState(() {
            _otpStep = true;
            _otp.clear();
          });
        }
      } else {
        await auth.login(_email.text, _password.text);
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Tidak bisa terhubung ke server.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  InputDecoration _field(String hint, IconData icon, {Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, color: AppColors.primary),
      suffixIcon: suffix,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_otpStep) {
      return OtpVerificationPage(
        fullName: _name.text,
        phone: _phone.text,
        otp: _otp.text,
        demoOtp: _demoOtp,
        error: _error,
        busy: _busy,
        onOtpChanged: (v) => setState(() {
          _otp.text = v;
          if (_error != null) _error = null;
        }),
        onSubmit: _submit,
        onResend: () async {
          setState(() {
            _busy = true;
            _error = null;
          });
          try {
            _demoOtp = await context.read<AuthState>().sendRegisterOtp(_phone.text);
            _otp.clear();
          } on ApiException catch (e) {
            _error = e.message;
          } catch (_) {
            _error = 'Tidak bisa terhubung ke server.';
          } finally {
            if (mounted) setState(() => _busy = false);
          }
        },
        onBack: () => setState(() {
          _otpStep = false;
          _error = null;
        }),
      );
    }

    final title = _register ? 'Daftar akun' : 'Selamat datang';
    final subtitle = _register
        ? 'Isi nama dan nomor WhatsApp aktif.'
        : 'Pesan makanan, diantar ke rumah.';

    return Scaffold(
      backgroundColor: Colors.white,
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
        child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
          children: [
            PopIn(
              child: SizedBox(
                height: 300,
                child: FloatLoop(
                  dy: 10,
                  dx: 8,
                  rot: 0,
                  duration: const Duration(milliseconds: 3600),
                  child: Center(
                    child: Image.asset(
                      StitchAssets.loginHeroAsset,
                      height: 280,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const SizedBox.expand(),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            FadeUp(
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.4,
                  height: 1.2,
                ),
              ),
            ),
            const SizedBox(height: 6),
            FadeUp(
              delay: const Duration(milliseconds: 100),
              child: Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.body, fontSize: 13, height: 1.45),
              ),
            ),
            const SizedBox(height: 24),
            FadeUp(
              delay: const Duration(milliseconds: 160),
              child: Column(
                children: [
                  if (_register) ...[
                    TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      decoration: _field('Nama lengkap', Icons.person_outline_rounded),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: _field('Nomor WhatsApp (08…)', Icons.chat_outlined),
                    ),
                    const SizedBox(height: 12),
                  ] else ...[
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: _field('Email atau WhatsApp', Icons.chat_outlined),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: _password,
                    obscureText: !_showPass,
                    decoration: _field(
                      _register ? 'Kata sandi (min. 6)' : 'Kata sandi',
                      Icons.lock_outline_rounded,
                      suffix: IconButton(
                        onPressed: () => setState(() => _showPass = !_showPass),
                        icon: Icon(
                          _showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: AppColors.body,
                        ),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Icon(Icons.error_outline, size: 18, color: AppColors.danger),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 52,
                    child: FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(_register ? 'Daftar' : 'Masuk'),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_forward_rounded, size: 20),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => setState(() {
                              _register = !_register;
                              _otpStep = false;
                              _error = null;
                            }),
                    child: Text(
                      _register
                          ? 'Sudah punya akun? Masuk'
                          : 'Belum punya akun? Daftar dulu pakai WhatsApp',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (!_register && !_otpStep)
                    const Text(
                      'Akun uji: andi@local.test / password123',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.body, fontSize: 12),
                    ),
                ],
              ),
            ),
          ],
        ),
        ),
      ),
    );
  }
}
