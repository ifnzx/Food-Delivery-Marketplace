import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const primary = Color(0xFF22C55E);
  static const primarySoft = Color(0xFFDCFCE7);
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFE9C46A);
  static const danger = Color(0xFFBA1A1A);
  static const ink = Color(0xFF111111);
  static const body = Color(0xFF6B7280);
  static const line = Color(0xFFE5E7EB);
  static const canvas = Color(0xFFFFFFFF);
  static const surface = Color(0xFFFFFFFF);
}

class AppTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        surface: AppColors.surface,
      ),
      scaffoldBackgroundColor: AppColors.canvas,
    );
    return base.copyWith(
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
        bodyColor: AppColors.ink,
        displayColor: AppColors.ink,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.canvas,
        foregroundColor: AppColors.ink,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.line),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF9FAFB),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.ink,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.ink,
          minimumSize: const Size.fromHeight(52),
          side: const BorderSide(color: AppColors.line),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF16A34A),
        selectedItemColor: Colors.white,
        unselectedItemColor: Color(0x94FFFFFF),
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}

String rupiah(num value) {
  final s = value.round().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    final fromEnd = s.length - i;
    buf.write(s[i]);
    if (fromEnd > 1 && fromEnd % 3 == 1) buf.write('.');
  }
  return 'Rp${buf.toString()}';
}

String statusLabel(String status) {
  switch (status) {
    case 'WAITING_OUTLET':
      return 'Menunggu outlet';
    case 'OUTLET_ACCEPTED':
    case 'PREPARING':
      return 'Outlet menyiapkan';
    case 'READY_FOR_PICKUP':
      return 'Siap diambil';
    case 'COURIER_ASSIGNED':
      return 'Order diterima';
    case 'COURIER_GOING_TO_OUTLET':
      return 'Menuju outlet';
    case 'PICKED_UP':
      return 'Sudah pickup';
    case 'DELIVERING':
      return 'Mengantar';
    case 'DELIVERED':
      return 'Sampai di customer';
    case 'COMPLETED':
      return 'Selesai';
    case 'CANCELLED':
      return 'Dibatalkan';
    default:
      return status;
  }
}
