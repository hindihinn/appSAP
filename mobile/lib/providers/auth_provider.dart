import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService;
  
  User? _user;
  bool _isLoading = false;
  bool _isInitialized = false;

  AuthProvider(this._authService);

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  bool get isInitialized => _isInitialized;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    final token = await StorageService.getToken();
    if (token != null) {
      final authResult = await _authService.checkAuth();
      if (authResult['success']) {
        _user = authResult['user'];
        await StorageService.saveUserData(jsonEncode(_user!.toJson()));
      } else {
        // Fallback to local data if network fails but we have a token
        final localData = await StorageService.getUserData();
        if (localData != null) {
          _user = User.fromJson(jsonDecode(localData));
        } else {
          await logout();
        }
      }
    }

    _isInitialized = true;
    _isLoading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    final result = await _authService.login(email, password);
    if (result['success']) {
      _user = result['user'];
      await StorageService.saveToken(result['token']);
      await StorageService.saveUserData(jsonEncode(_user!.toJson()));
    }

    _isLoading = false;
    notifyListeners();
    return result;
  }

  Future<void> logout() async {
    _user = null;
    await StorageService.removeToken();
    await StorageService.removeUserData();
    notifyListeners();
  }
}
