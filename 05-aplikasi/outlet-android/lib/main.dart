import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/login_screen.dart';
import 'screens/shell_screen.dart';
import 'screens/splash_screen.dart';
import 'services/api_client.dart';
import 'state/auth_state.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AntarqOutletApp());
}

class AntarqOutletApp extends StatelessWidget {
  const AntarqOutletApp({super.key});

  @override
  Widget build(BuildContext context) {
    final api = ApiClient();
    return MultiProvider(
      providers: [
        Provider.value(value: api),
        ChangeNotifierProvider(create: (_) => AuthState(api)..bootstrap()),
      ],
      child: MaterialApp(
        title: 'ANTARQ Outlet',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        home: const _BootGate(),
      ),
    );
  }
}

/// Tampilkan splash bermerek minimal ~2s (seperti customer), lalu login/shell.
class _BootGate extends StatefulWidget {
  const _BootGate();

  @override
  State<_BootGate> createState() => _BootGateState();
}

class _BootGateState extends State<_BootGate> {
  var _minDone = false;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 2000), () {
      if (mounted) setState(() => _minDone = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (auth.loading || !_minDone) {
      return const SplashScreen();
    }
    if (auth.session == null) return const LoginScreen();
    return const ShellScreen();
  }
}
