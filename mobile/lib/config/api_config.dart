import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  // Key untuk menyimpan IP di SharedPreferences
  static const String _baseUrlKey = 'api_base_url';
  static const String _imageUrlKey = 'api_image_url';

  // ============================================================
  // DEFAULT IP — Ganti sesuai IP komputer/server kamu saat ini
  // ============================================================
  // - Android Emulator : 'http://10.0.2.2:5000'
  // - iOS Simulator    : 'http://localhost:5000'
  // - Real Device      : gunakan IP lokal komputer (pastikan 1 Wi-Fi)
  // ============================================================
  static const String defaultBaseUrl = 'http://45.149.93.214:1200/api';
  static const String defaultImageUrl = 'http://45.149.93.214:1200';

  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;

  // Cache URL agar tidak perlu baca SharedPreferences tiap request
  static String? _cachedBaseUrl;
  static String? _cachedImageUrl;

  /// Inisialisasi — panggil sekali saat app start
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    // Forcefully apply new IP to ignore old cached IP
    _cachedBaseUrl = defaultBaseUrl;
    _cachedImageUrl = defaultImageUrl;
    await prefs.setString(_baseUrlKey, defaultBaseUrl);
    await prefs.setString(_imageUrlKey, defaultImageUrl);
  }

  /// Base URL aktif (sudah di-cache di memory)
  static String get baseUrl => _cachedBaseUrl ?? defaultBaseUrl;

  /// Image URL aktif (sudah di-cache di memory)
  static String get imageUrl => _cachedImageUrl ?? defaultImageUrl;

  /// Simpan URL baru & update cache
  static Future<void> setBaseUrl(String newUrl) async {
    // Pastikan tidak ada trailing slash
    final cleaned = newUrl.trimRight().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, cleaned);
    _cachedBaseUrl = cleaned;

    // Derive image URL dari base URL (hapus '/api' jika ada)
    final imageBase = cleaned.replaceAll(RegExp(r'/api$'), '');
    await prefs.setString(_imageUrlKey, imageBase);
    _cachedImageUrl = imageBase;
  }

  /// Reset ke default
  static Future<void> resetToDefault() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_baseUrlKey);
    await prefs.remove(_imageUrlKey);
    _cachedBaseUrl = defaultBaseUrl;
    _cachedImageUrl = defaultImageUrl;
  }

  /// Cek apakah sedang menggunakan custom URL
  static bool get isCustomUrl => _cachedBaseUrl != defaultBaseUrl;

  /// Ambil host:port saja dari URL (untuk display)
  static String get hostDisplay {
    try {
      final uri = Uri.parse(baseUrl);
      return '${uri.host}:${uri.port}';
    } catch (_) {
      return baseUrl;
    }
  }
}
