import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
import '../network/models.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService apiService;

  UserModel? _user;
  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _error;
  String? _pendingVerificationPhone;
  String? _pendingUsername;
  String? _pendingPassword;

  AuthProvider({
    required this.apiService,
  });

  // Getters
  UserModel? get user => _user;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get pendingVerificationPhone => _pendingVerificationPhone;

  Future<void> initAuth() async {
    final token = await apiService.getToken();
    if (token != null) {
      _isLoading = true;
      _error = null;
      notifyListeners();
      final success = await fetchProfile();
      _isAuthenticated = success;
      _isLoading = false;
      notifyListeners();
      if (!success) {
        await apiService.clearToken();
      }
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        AppConstants.loginEndpoint,
        data: {
          'username': username,
          'password': password,
          'platform': 'mobile',
        },
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final userDataRaw = data['user'];
        final userData = userDataRaw is Map<String, dynamic>
            ? userDataRaw
            : (userDataRaw is Map ? Map<String, dynamic>.from(userDataRaw) : null);
        final token = data['token']?.toString() ?? userData?['token']?.toString();

        if (token == null || token.isEmpty) {
          throw ApiException(message: 'Authentication token missing from server response.');
        }

        final role = (userData?['role'] ?? 'user').toString().trim().toLowerCase();
        if (role != 'user') {
          throw ApiException(
            message: 'This mobile application is for patient accounts only.',
            statusCode: 403,
          );
        }

        await apiService.saveToken(token);
        _isAuthenticated = true;
        _user = UserModel.fromJson(userData ?? {});
        await apiService.saveUserSession(
          userId: _user!.id,
          username: _user!.username,
          role: role,
        );
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = error.toString();
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register({
    required String fullName,
    required String username,
    required String phone,
    required String gender,
    required int age,
    required String password,
    required String dateOfBirth,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        AppConstants.registerEndpoint,
        data: {
          'fullname': fullName,
          'username': username,
          'phone': phone,
          'gender': gender,
          'age': age,
          'password': password,
          'confirm_password': password,
          'date_of_birth': dateOfBirth,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data as Map<String, dynamic>? ?? {};
        _pendingVerificationPhone = data['phone']?.toString() ?? phone;
        _pendingUsername = username;
        _pendingPassword = password;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Registration failed. Please try again.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> sendOtp(String phone) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        AppConstants.sendOtpEndpoint,
        data: {'phone': phone},
      );

      if (response.statusCode == 200) {
        _pendingVerificationPhone = phone;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to send verification code.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> verifyOtp({
    required String phone,
    required String otpCode,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        AppConstants.verifyOtpEndpoint,
        data: {
          'phone': phone,
          'otp_code': otpCode,
        },
      );

      if (response.statusCode == 200) {
        _pendingVerificationPhone = null;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to verify phone number.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> verifyOtpAndLogin({
    required String phone,
    required String otpCode,
  }) async {
    final verified = await verifyOtp(phone: phone, otpCode: otpCode);
    if (!verified) return false;

    final username = _pendingUsername;
    final password = _pendingPassword;
    if (username == null || password == null) {
      _error = 'Phone verified. Please log in to continue.';
      notifyListeners();
      return false;
    }

    final loggedIn = await login(username, password);
    if (loggedIn) {
      _pendingUsername = null;
      _pendingPassword = null;
    }
    return loggedIn;
  }

  Future<void> logout() async {
    _user = null;
    _isAuthenticated = false;
    _pendingVerificationPhone = null;
    _pendingUsername = null;
    _pendingPassword = null;
    await apiService.clearSession();
    notifyListeners();
  }

  Future<bool> fetchProfile() async {
    _error = null;
    try {
      final response = await apiService.get(AppConstants.userProfileEndpoint);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        _user = UserModel.fromJson(data['user'] as Map<String, dynamic>? ?? {});
        if (_user!.role.trim().toLowerCase() != 'user') {
          await logout();
          _error = 'This mobile application is for patient accounts only.';
          return false;
        }
        _isAuthenticated = true;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
        if (error.statusCode == 401) {
          await logout();
        }
      } else {
        _error = 'Unable to fetch profile.';
      }
    }
    notifyListeners();
    return false;
  }

  Future<bool> updateProfile(Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.put(
        AppConstants.userProfileEndpoint,
        data: updates,
      );
      if (response.statusCode == 200) {
        await fetchProfile();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to update profile.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
