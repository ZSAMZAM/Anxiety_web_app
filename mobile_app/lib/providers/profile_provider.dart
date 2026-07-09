import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/user_model.dart';
import '../core/constants/app_constants.dart';

class ProfileProvider extends ChangeNotifier {
  final ApiService apiService;

  UserModel? _user;
  bool _isLoading = false;
  String? _error;

  ProfileProvider({required this.apiService});

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> loadProfile() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(AppConstants.userProfileEndpoint);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        _user = UserModel.fromJson(data['user'] as Map<String, dynamic>? ?? {});
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to load profile.';
      }
    }

    _isLoading = false;
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
        await loadProfile();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to update profile.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
