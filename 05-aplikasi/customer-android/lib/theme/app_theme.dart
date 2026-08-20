import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/api_config.dart';

class AppColors {
  static const primary = Color(0xFF22C55E);
  static const primaryContainer = Color(0xFF16A34A);
  static const primaryDark = Color(0xFF15803D);
  static const primarySoft = Color(0xFFDCFCE7);
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFE9C46A);
  static const danger = Color(0xFFBA1A1A);
  static const ink = Color(0xFF111111);
  static const body = Color(0xFF6B7280);
  static const secondary = Color(0xFF6B7280);
  static const line = Color(0xFFE5E7EB);
  static const canvas = Color(0xFFFFFFFF);
  static const surface = Color(0xFFFFFFFF);
}

class StitchAssets {
  static const loginHeroAsset = 'assets/login-hero-customer.png';
  static const loginHero = loginHeroAsset;
  static const warungCover =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCqlDkwcEGnVLNdvNKqJWsB1ZOeKf36Hwib0_wNTU0_7mxFYoqYT3yCqiZanYtkUac0JrE95QEdZ3Gl_z80xi8nkdyjBXHMP7JrM4kgsTQkOYpianCjFKerSxyp4HzVvsmxcUa1erQ194WkAc4oGdNMuWN6diH9CiMOoLtHT1BAD2nM7Fsl3cq3gJejsm1B9A2e3DrZh6T1u5lhAW1uwRXUQ7my8S4O5Sd_HTk8VGQHQTJz2cQQL7OpRA';
  static const nasiGoreng =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBRE0QBBAxRgq99RYbb4RYX7drgJGv6W9cXxEe4sDwhpKVHJUi0_H9JNCdWlmktSidbGx1V4RFpKw5M9dxEgKKt6KL1xJWzwVIFOyKVimZa0hzXlGwFBtmtGC_ztJNXyUIN5YzruZH4KRGVSHIVKASs8rs4f5ZqAFgEg67gt1GeIXhhpJmHPcuhh_QGjjb7yyeHIpziyYshItjcP11YEp0tI0lMBO5ZKS-kDPpHL1X3uRM0lzoHkgN64Q';
  static const ayamGoreng =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpPjUTWFBOqlfUREFUEaEAgloArRVlOos9khHCYObzersU-mVLVHDhmNQpUc-LO_XXUOSrPBkX0egQeTkIUgZXFVWG0BOXQ3BNXzMIWbuAJlEn7wlPvbxTSJtJaFfZzip_oPxE-I5yohlYf5F3QSQS1JtI4uBt5XuMNbHzHvduo7I6tTUDnP5DgtHUutnXxBFWuNfDyAtZTYAZyM9VTEijnkkMcgeXDspVmgKuiN_Uvpq80LWFOHQPsA';
  static const warungBCover =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBQU0QZs5NeraePohpscRxlVEdGsnAzIbBzmgBLQwpjCYAINMnGdJo6hC4fY_ROMD0fEcppDz-nAiInAHsIe7-6LoRimnmbJtt4zqIRb-rTCGVWwe0uW36FMOBi7ZQXftqKKnnKoDT-G_s0l5n-KYiNCkBpUjxqoRsKoNd38gpfCXqs3kR9R14dc7J5japaAFaiYDxe_xryxGD1gj0iGXiDkpns_qttWKzlwxXKNR-NXDEG5nI6mrI4rg';
  static const mapThumb =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDpgaodHnSQlFpgsuUlHht_Ys59ITxJ7eIarJJ-fSRkgIIHQf97ppOmr3FhXKclTUGFOM2Pyx-gUYf4ctuXtYCKLtJ6rKISuzAJej0cGrw4FUVp9vBv1n2QrjblCEAD1umnQTOd9eZLcq1L-6C3pdqefqTHTP_AVvqf2CBa9SmVSWE4loQJ_bE4ObSQ1Tv_c2EjkM5IUYq3gPSUeE8_J_xlFWsk35ul4brqSpDxTFgC23nlEhXW9nV7bQ';
  static const courierPhoto =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAL7YJXj6bbwxEO83u41WJJ399UCOBBrskLSji_yRjLztVhFa_ykcSpFK2cpLnKARNlkyaJrbApff-T3JAHE0kJrz7p2q9iI4xGjcX893mxeuc8B5K4ehrQczlSK4luqZpniTEar-t-a4ZqfV6uhJVBwk1f8SxOeMfsQlfa1jDsZBs6MqmkIZ3ThaNxrh6gUHXQcEsG1GeDLSolVylgUImp0UIkBda29MJkRzaQrXE3wv_sjpNy6YJIDw';

  static String menuPhoto(String name) {
    final n = name.toLowerCase();
    if (n.contains('nasi')) return nasiGoreng;
    if (n.contains('ayam')) return ayamGoreng;
    return nasiGoreng;
  }

  static String merchantPhoto(String name, [String? photoUrl]) {
    final custom = (photoUrl ?? '').trim();
    if (custom.isNotEmpty) {
      if (custom.startsWith('http') || custom.startsWith('data:')) return custom;
      return '${ApiConfig.baseUrl}$custom';
    }
    final n = name.toLowerCase();
    if (n.contains('b') || n.contains('gado')) return warungBCover;
    return warungCover;
  }
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
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.line),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
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
          foregroundColor: AppColors.primary,
          minimumSize: const Size.fromHeight(48),
          side: const BorderSide(color: AppColors.primary),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.primarySoft,
        selectedColor: AppColors.primary,
        labelStyle: GoogleFonts.plusJakartaSans(fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.ink,
        selectedItemColor: Colors.white,
        unselectedItemColor: Color(0x6BFFFFFF),
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}

String rupiah(num value) {
  final n = value.round();
  final s = n.toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    final fromEnd = s.length - i;
    buf.write(s[i]);
    if (fromEnd > 1 && fromEnd % 3 == 1) buf.write('.');
  }
  return 'Rp${buf.toString()}';
}
