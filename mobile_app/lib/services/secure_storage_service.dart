import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? secureStorage})
      : _storage = secureStorage ?? const FlutterSecureStorage();

  static const String _tokenKey = 'jwt_token';
  static const String _userIdKey = 'user_id';
  static const String _usernameKey = 'username';
  static const String _roleKey = 'user_role';

  Future<void> saveToken(String token) async {
    await _writeValue(_tokenKey, token);
  }

  Future<String?> getToken() async {
    return await _readValue(_tokenKey);
  }

  Future<void> clearToken() async {
    await _deleteValue(_tokenKey);
  }

  Future<void> saveUserId(String userId) async {
    await _writeValue(_userIdKey, userId);
  }

  Future<String?> getUserId() async {
    return await _readValue(_userIdKey);
  }

  Future<void> saveUsername(String username) async {
    await _writeValue(_usernameKey, username);
  }

  Future<String?> getUsername() async {
    return await _readValue(_usernameKey);
  }

  Future<void> saveRole(String role) async {
    await _writeValue(_roleKey, role);
  }

  Future<String?> getRole() async {
    return await _readValue(_roleKey);
  }

  Future<void> clearAll() async {
    for (final key in [_tokenKey, _userIdKey, _usernameKey, _roleKey]) {
      await _deleteValue(key);
    }
  }

  Future<void> _writeValue(String key, String value) async {
    if (!kIsWeb) {
      await _storage.write(key: key, value: value);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  Future<String?> _readValue(String key) async {
    if (!kIsWeb) {
      final secureValue = await _storage.read(key: key);
      if (secureValue != null && secureValue.isNotEmpty) {
        return secureValue;
      }
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  Future<void> _deleteValue(String key) async {
    if (!kIsWeb) {
      await _storage.delete(key: key);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }
}
