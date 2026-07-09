import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
import '../network/models.dart';

class AssessmentProvider extends ChangeNotifier {
  final ApiService apiService;

  PredictionModel? _predictionResult;
  String? _lastInput;
  List<String> _recommendations = [];
  bool _isLoading = false;
  String? _error;

  AssessmentProvider({required this.apiService});

  // Getters
  PredictionModel? get predictionResult => _predictionResult;
  String? get lastInput => _lastInput;
  List<String> get recommendations => _recommendations;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Submit assessment
  Future<bool> submitAssessment(String text) async {
    _isLoading = true;
    _error = null;
    _recommendations = [];
    _lastInput = text;
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
        final className = data['class_name']?.toString() ?? data['result']?.toString() ?? '';
        _predictionResult = PredictionModel.fromJson({
          'id': data['prediction']?.toString() ?? '',
          'status': className,
          'recommendation':
              'Detected $className with ${confidencePercent.round()}% confidence.',
          'date': DateTime.now().toIso8601String(),
          'details': {
            'confidence': confidencePercent,
            'result': data['result'],
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

  Future<bool> loadRecommendations() async {
    if (_lastInput == null || _predictionResult == null) {
      _error = 'Complete an assessment first to show recommendations.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(
        AppConstants.recommendationsEndpoint,
        queryParameters: {
          'text': _lastInput,
          'prediction': _predictionResult!.status,
          'confidence': _predictionResult!.details['confidence']?.toString() ?? '0',
        },
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final recommendations = data['recommendations'] as List<dynamic>? ?? [];
        _recommendations = recommendations.map((item) => item.toString()).toList();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to load recommendations.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  void resetPrediction() {
    _predictionResult = null;
    _recommendations = [];
    _lastInput = null;
    notifyListeners();
  }
}
