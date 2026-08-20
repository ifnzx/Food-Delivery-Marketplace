import 'package:flutter/material.dart';

import 'screens/web_customer_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AntarqCustomerApp());
}

class AntarqCustomerApp extends StatelessWidget {
  const AntarqCustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ANTARQ',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const WebCustomerScreen(),
    );
  }
}
