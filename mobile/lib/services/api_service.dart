import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'storage_service.dart';

class ApiService {
  late Dio _dio;

  ApiService() {
    _dio = _buildDio();
  }

  Dio _buildDio() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(milliseconds: ApiConfig.connectTimeout),
      receiveTimeout: const Duration(milliseconds: ApiConfig.receiveTimeout),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Selalu ambil baseUrl terbaru — handle perubahan IP saat runtime
        options.baseUrl = ApiConfig.baseUrl;

        final token = await StorageService.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        return handler.next(response);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          // Token expired or invalid
          await StorageService.removeToken();
          await StorageService.removeUserData();
        }
        return handler.next(e);
      },
    ));

    return dio;
  }

  /// Rebuild Dio client dengan URL baru — panggil setelah ganti IP
  void refreshBaseUrl() {
    _dio = _buildDio();
  }

  Dio get client => _dio;
}
