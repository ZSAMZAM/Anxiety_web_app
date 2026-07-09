import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/prediction_model.dart';
import '../core/constants/app_constants.dart';

class PredictionProvider extends ChangeNotifier {
  final ApiService apiService;

  PredictionModel? _prediction;
  List<PredictionHistoryItem> _history = [];
  bool _isLoading = false;
  String? _error;

  PredictionProvider({required this.apiService});

  PredictionModel? get prediction => _prediction;
  List<PredictionHistoryItem> get history => _history;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> submitPrediction(String text) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        AppConstants.predictEndpoint,
        data: {'text': text},
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final rawConfidence = data['confidence'] is num
            ? (data['confidence'] as num).toDouble()
            : double.tryParse(data['confidence']?.toString() ?? '') ?? 0;
        final confidencePercent = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
        _prediction = PredictionModel.fromJson({
          'id': data['prediction']?.toString() ?? '',
          'status': data['class_name'] ?? '',
          'recommendation':
              'Detected ${data['class_name'] ?? data['result'] ?? ''} with ${confidencePercent.round()}% confidence.',
          'date': DateTime.now().toIso8601String(),
          'details': {
            'confidence': confidencePercent,
          },
        });
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to submit assessment.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> loadHistory() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(AppConstants.historyEndpoint);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final items = data['history'] as List<dynamic>? ?? [];
        _history = items
            .map((item) => PredictionHistoryItem.fromJson(item as Map<String, dynamic>))
            .toList();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to load prediction history.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
