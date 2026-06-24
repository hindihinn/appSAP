class ApiConfig {
  // Pilihan URL sesuai dengan perangkat running:
  // - Android Emulator: 'http://10.0.2.2:5000'
  // - iOS Simulator / Localhost: 'http://localhost:5000'
  // - Perangkat Fisik (Real Device): gunakan IP komputer saat ini (pastikan satu Wi-Fi)
  static const String baseUrl = 'http://192.168.100.68:5000/api';
  static const String imageUrl = 'http://192.168.100.68:5000';
  
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
}
