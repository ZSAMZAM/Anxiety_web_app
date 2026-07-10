import 'package:flutter/material.dart';
import '../core/constants/app_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/treatment_plan_model.dart';

class TreatmentPlanProvider extends ChangeNotifier {
  final ApiService apiService;

  TreatmentPlanProvider({required this.apiService});

  TreatmentPlanModel? _latestPlan;
  List<TreatmentPlanModel> _plans = [];
  bool _isLoading = false;
  String? _error;
  String? _emptyMessage;

  TreatmentPlanModel? get latestPlan => _latestPlan;
  List<TreatmentPlanModel> get plans => List.unmodifiable(_plans);
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get emptyMessage => _emptyMessage ??
      'No treatment plan is available yet.\nPlease wait until your doctor completes your consultation.';
  bool get hasTreatmentPlan => _latestPlan != null || _plans.isNotEmpty;

  Future<bool> loadLatest({bool silent = false}) async {
    if (!silent) _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(AppConstants.latestTreatmentPlanEndpoint);
      final data = response.data as Map<String, dynamic>? ?? {};
      final item = data['treatment_plan'];
      _latestPlan = item is Map<String, dynamic> ? TreatmentPlanModel.fromJson(item) : null;
      _emptyMessage = data['message']?.toString();
      if (!silent) _isLoading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to load treatment plan.';
    }

    if (!silent) _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> loadPlans({bool silent = false}) async {
    if (!silent) _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(AppConstants.treatmentPlansEndpoint);
      final data = response.data as Map<String, dynamic>? ?? {};
      final items = data['treatment_plans'] as List<dynamic>? ?? [];
      _plans = items
          .whereType<Map<String, dynamic>>()
          .map(TreatmentPlanModel.fromJson)
          .toList();
      _latestPlan = _plans.isNotEmpty ? _plans.first : _latestPlan;
      if (!silent) _isLoading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to load treatment plans.';
    }

    if (!silent) _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<TreatmentPlanModel?> loadPlanById(String reportId) async {
    try {
      final response = await apiService.get(AppConstants.treatmentPlanEndpoint(reportId));
      final data = response.data as Map<String, dynamic>? ?? {};
      final item = data['treatment_plan'];
      if (item is Map<String, dynamic>) {
        return TreatmentPlanModel.fromJson(item);
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to load treatment plan.';
      notifyListeners();
    }
    return null;
  }
}
