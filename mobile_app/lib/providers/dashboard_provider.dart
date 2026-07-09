import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/prediction_model.dart';
import '../models/user_model.dart';
import '../core/constants/app_constants.dart';

class DashboardProvider extends ChangeNotifier {
  final ApiService apiService;

  UserModel? _user;
  PredictionModel? _latestPrediction;
  int _totalPredictions = 0;
  int _doctorsAvailable = 0;
  int _myAppointments = 0;
  int _paymentsMade = 0;
  bool _isLoading = false;
  String? _error;

  DashboardProvider({required this.apiService});

  UserModel? get user => _user;
  PredictionModel? get latestPrediction => _latestPrediction;
  int get totalPredictions => _totalPredictions;
  int get doctorsAvailable => _doctorsAvailable;
  int get myAppointments => _myAppointments;
  int get paymentsMade => _paymentsMade;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> loadDashboard() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(AppConstants.userStatsEndpoint);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final stats = data['stats'] as Map<String, dynamic>? ?? {};
        _totalPredictions = stats['totalPredictions'] as int? ?? 0;
        _doctorsAvailable = stats['doctorsAvailable'] as int? ?? 0;
        _myAppointments = stats['myAppointments'] as int? ?? 0;
        _paymentsMade = stats['paymentsMade'] as int? ?? 0;
        if (data['latestPrediction'] is Map<String, dynamic>) {
          _latestPrediction = PredictionModel.fromJson(data['latestPrediction'] as Map<String, dynamic>);
        }
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to load dashboard data.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
