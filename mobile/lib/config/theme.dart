import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Colors matching the web app
  static const Color primary = Color(0xFF1a94a8);
  static const Color primaryDark = Color(0xFF0f3d47);
  static const Color accent = Color(0xFF22b0c6);
  static const Color background = Color(0xFFf8fafc);
  static const Color cardBg = Colors.white;
  
  static const Color textPrimary = Color(0xFF1a2e35);
  static const Color textSecondary = Color(0xFF4a6670);
  static const Color textMuted = Color(0xFF8ba3ab);
  
  static const Color danger = Color(0xFFdc2626);
  static const Color success = Color(0xFF059669);
  static const Color warning = Color(0xFFd97706);
  static const Color info = Color(0xFF0e8fa0);

  static ThemeData get lightTheme {
    return ThemeData(
      primaryColor: primary,
      scaffoldBackgroundColor: background,
      fontFamily: GoogleFonts.inter().fontFamily,
      textTheme: GoogleFonts.interTextTheme().copyWith(
        displayLarge: const TextStyle(color: textPrimary, fontWeight: FontWeight.bold),
        displayMedium: const TextStyle(color: textPrimary, fontWeight: FontWeight.bold),
        bodyLarge: const TextStyle(color: textPrimary),
        bodyMedium: const TextStyle(color: textSecondary),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: primaryDark),
        titleTextStyle: TextStyle(
          color: primaryDark,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFe2e8f0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFe2e8f0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        hintStyle: const TextStyle(color: textMuted, fontSize: 14),
      ),
      cardTheme: CardThemeData(
        color: cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFf1f5f9)),
        ),
      ),
      colorScheme: ColorScheme.fromSeed(seedColor: primary).copyWith(
        primary: primary,
        secondary: accent,
        error: danger,
      ),
    );
  }
}
