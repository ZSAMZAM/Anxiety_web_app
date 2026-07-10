import 'package:flutter/material.dart';
import '../core/constants/app_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/refund_model.dart';

class RefundProvider extends ChangeNotifier {
  final ApiService apiService;

  RefundProvider({required this.apiService});

  List<RefundModel> _refunds = [];
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _error;

  List<RefundModel> get refunds => _refunds;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get error => _error;

  Future<bool> loadRefunds({bool silent = false}) async {
    if (!silent) _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(AppConstants.refundsEndpoint);
      final data = response.data as Map<String, dynamic>;
      final items = data['refunds'] as List<dynamic>? ?? [];
      _refunds = items.map((item) => RefundModel.fromJson(item as Map<String, dynamic>)).toList();
      if (!silent) _isLoading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to load refunds.';
    }

    if (!silent) _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<RefundModel?> requestRefund({
    required String appointmentId,
    required String reason,
    String notes = '',
  }) async {
    if (_isSubmitting) return null;
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        AppConstants.refundsEndpoint,
        data: {
          'appointment_id': appointmentId,
          'reason': _backendReason(reason),
          'notes': notes.trim(),
        },
      );
      final data = response.data as Map<String, dynamic>;
      final refundJson = data['refund'] as Map<String, dynamic>? ?? {};
      await loadRefunds(silent: true);
      _isSubmitting = false;
      notifyListeners();
      return RefundModel.fromJson(refundJson);
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to submit refund request.';
    }

    _isSubmitting = false;
    notifyListeners();
    return null;
  }

  RefundModel? byId(String id) {
    for (final refund in _refunds) {
      if (refund.id == id || refund.displayId == id) return refund;
    }
    return null;
  }

  String _backendReason(String reason) {
    switch (reason) {
      case 'Doctor did not attend':
        return 'Doctor did not join';
      case 'Technical issue':
        return 'Other';
      default:
        return reason;
    }
  }
}
