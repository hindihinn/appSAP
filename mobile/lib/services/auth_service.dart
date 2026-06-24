import 'package:dio/dio.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;

  AuthService(this._apiService);

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _apiService.client.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.data['success']) {
        final userData = response.data['data']['user'];
        final token = response.data['data']['token'];
        return {
          'success': true,
          'user': User.fromJson(userData),
          'token': token,
        };
      }
      return {
        'success': false,
        'message': response.data['message'] ?? 'Login failed',
      };
    } on DioException catch (e) {
      if (e.response != null && e.response?.data != null) {
        return {
          'success': false,
          'message': e.response?.data['message'] ?? 'Login failed',
        };
      }
      String errorMsg = 'Connection error.';
      if (e.type == DioExceptionType.connectionTimeout) {
        errorMsg = 'Connection timeout. Server tidak merespon.';
      } else if (e.type == DioExceptionType.connectionError) {
        errorMsg = 'Tidak bisa terhubung ke server. Pastikan server berjalan dan HP terhubung ke jaringan yang sama.';
      } else if (e.type == DioExceptionType.receiveTimeout) {
        errorMsg = 'Server terlalu lama merespon.';
      }
      return {
        'success': false,
        'message': errorMsg,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Unexpected error: $e',
      };
    }
  }

  Future<Map<String, dynamic>> checkAuth() async {
    try {
      final response = await _apiService.client.get('/auth/me');
      if (response.data['success']) {
        return {
          'success': true,
          'user': User.fromJson(response.data['data']),
        };
      }
      return {'success': false};
    } catch (e) {
      return {'success': false};
    }
  }
}
