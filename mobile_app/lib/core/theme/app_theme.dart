import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData lightTheme() {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.lightPrimary,
      brightness: Brightness.light,
      primary: AppColors.lightPrimary,
      secondary: AppColors.lightSecondary,
      surface: AppColors.lightCard,
      error: AppColors.lightDanger,
    );
    return _baseTheme(
      scheme: scheme,
      brightness: Brightness.light,
      scaffold: AppColors.lightBackground,
      card: AppColors.lightCard,
      text: AppColors.lightText,
      muted: AppColors.lightMutedText,
      border: AppColors.lightBorder,
    );
  }

  static ThemeData darkTheme() {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.darkPrimary,
      brightness: Brightness.dark,
      primary: AppColors.darkPrimary,
      secondary: AppColors.darkSecondary,
      surface: AppColors.darkCard,
      error: AppColors.darkDanger,
    );
    return _baseTheme(
      scheme: scheme,
      brightness: Brightness.dark,
      scaffold: AppColors.darkBackground,
      card: AppColors.darkCard,
      text: AppColors.darkText,
      muted: AppColors.darkMutedText,
      border: AppColors.darkBorder,
    );
  }

  static ThemeData _baseTheme({
    required ColorScheme scheme,
    required Brightness brightness,
    required Color scaffold,
    required Color card,
    required Color text,
    required Color muted,
    required Color border,
  }) {
    final isDark = brightness == Brightness.dark;
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: scaffold,
      colorScheme: scheme.copyWith(
        surface: card,
        outline: border,
        onSurface: text,
        onSurfaceVariant: muted,
      ),
      fontFamily: 'Inter',
      visualDensity: VisualDensity.adaptivePlatformDensity,
      appBarTheme: AppBarTheme(
        backgroundColor: scaffold.withOpacity(0.94),
        foregroundColor: text,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: text,
          fontSize: 17,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
        ),
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        margin: EdgeInsets.zero,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? AppColors.darkSecondaryCard.withOpacity(0.78) : Colors.white,
        prefixIconColor: muted,
        suffixIconColor: muted,
        constraints: const BoxConstraints(minHeight: 56),
        border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.7),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: scheme.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: scheme.error, width: 1.7),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
        hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 16, fontWeight: FontWeight.w400),
        labelStyle: TextStyle(color: muted, fontSize: 13, fontWeight: FontWeight.w600, letterSpacing: 0.1),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: isDark ? AppColors.darkBackground : Colors.white,
          minimumSize: const Size.fromHeight(56),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: scheme.primary,
          minimumSize: const Size.fromHeight(56),
          side: BorderSide(color: border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.primary,
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: isDark ? AppColors.darkSecondaryCard : AppColors.lightSoftBlue,
        selectedColor: scheme.primary.withOpacity(isDark ? 0.24 : 0.14),
        side: BorderSide(color: border),
        labelStyle: TextStyle(color: text, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: isDark ? AppColors.darkCard.withOpacity(0.94) : Colors.white.withOpacity(0.94),
        selectedItemColor: scheme.primary,
        unselectedItemColor: muted,
        type: BottomNavigationBarType.fixed,
        elevation: 16,
        selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
        unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isDark ? AppColors.darkSecondaryCard : AppColors.lightText,
        contentTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        elevation: 12,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        titleTextStyle: TextStyle(color: text, fontSize: 20, fontWeight: FontWeight.w800),
        contentTextStyle: TextStyle(color: muted, fontSize: 14, height: 1.5),
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 1),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: scheme.primary),
      textTheme: TextTheme(
        displayLarge: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: text, height: 1.08),
        displayMedium: TextStyle(fontSize: 27, fontWeight: FontWeight.w800, color: text, height: 1.1),
        displaySmall: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: text, height: 1.12),
        headlineLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: text, height: 1.16),
        headlineMedium: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: text, height: 1.22),
        headlineSmall: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: text, height: 1.25),
        titleLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: text, height: 1.28),
        titleMedium: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: text, height: 1.3),
        bodyLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: text, height: 1.42),
        bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: muted, height: 1.42),
        bodySmall: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: muted, height: 1.4),
        labelLarge: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: muted, letterSpacing: 0.1),
        labelMedium: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: muted, letterSpacing: 0.1),
        labelSmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: muted, letterSpacing: 0.1),
      ),
    );
  }
}
