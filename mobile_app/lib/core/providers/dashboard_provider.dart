import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
import '../network/models.dart';

class DashboardProvider extends ChangeNotifier {
  final ApiService apiService;

  PredictionModel? _latestPrediction;
  AppointmentModel? _nextAppointment;
  DoctorModel? _recommendedDoctor;
  String? _latestNotification;
  final List<PredictionModel> _recentPredictions = [];
  final List<AppointmentModel> _appointments = [];
  final List<DoctorModel> _recommendedDoctors = [];
  final List<NotificationModel> _notifications = [];
  final List<RecommendationModel> _recommendations = [];
  int _unreadNotifications = 0;
  int _totalPredictions = 0;
  int _anxietyDetections = 0;
  int _depressionDetections = 0;
  int _doctorsAvailable = 0;
  int _myAppointments = 0;
  int _paymentsMade = 0;
  bool _isLoading = false;
  String? _error;

  DashboardProvider({required this.apiService});

  // Getters
  PredictionModel? get latestPrediction => _latestPrediction;
  AppointmentModel? get nextAppointment => _nextAppointment;
  DoctorModel? get recommendedDoctor => _recommendedDoctor;
  String? get latestNotification => _latestNotification;
  List<PredictionModel> get recentPredictions => List.unmodifiable(_recentPredictions);
  List<AppointmentModel> get appointments => List.unmodifiable(_appointments);
  List<DoctorModel> get recommendedDoctors => List.unmodifiable(_recommendedDoctors);
  List<NotificationModel> get notifications => List.unmodifiable(_notifications);
  List<RecommendationModel> get recommendations => List.unmodifiable(_recommendations);
  int get unreadNotifications => _unreadNotifications;
  int get totalPredictions => _totalPredictions;
  int get assessmentCount => _totalPredictions;
  int get anxietyDetections => _anxietyDetections;
  int get depressionDetections => _depressionDetections;
  int get doctorsAvailable => _doctorsAvailable;
  int get myAppointments => _myAppointments;
  int get paymentsMade => _paymentsMade;
  int get therapySessions => _appointments.where((appointment) {
        final status = appointment.status.toLowerCase();
        return status.contains('confirmed') || status.contains('completed');
      }).length;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get anxietyScore {
    if (_latestPrediction == null) return 0;
    final confidence = _latestPrediction!.details['confidence'];
    if (confidence is num) {
      return confidence.toDouble().clamp(0, 100).toInt();
    }
    return 0;
  }

  int get latestConfidence => anxietyScore;

  Future<void> loadDashboard() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final loaders = [
      _loadStats,
      _loadHistory,
      _loadAppointments,
      _loadDoctors,
      _loadNotifications,
    ];
    var successCount = 0;
    ApiException? apiError;

    for (final loader in loaders) {
      try {
        await loader();
        successCount++;
      } catch (error) {
        if (error is ApiException) {
          apiError ??= error;
        }
      }
    }

    try {
      await _loadRecommendations();
    } catch (_) {
      _recommendations.clear();
    }

    if (successCount == 0) {
      _error = apiError?.message ?? 'Unable to load dashboard data.';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> _loadStats() async {
    final response = await apiService.get(AppConstants.userStatsEndpoint);
    if (response.statusCode != 200) return;

    final data = response.data as Map<String, dynamic>? ?? {};
    final stats = data['stats'] as Map<String, dynamic>? ?? {};
    _totalPredictions = _toInt(stats['totalPredictions'] ?? stats['total_predictions']);
    _doctorsAvailable = _toInt(stats['doctorsAvailable'] ?? stats['doctors_available']);
    _myAppointments = _toInt(stats['myAppointments'] ?? stats['my_appointments']);
    _paymentsMade = _toInt(stats['paymentsMade'] ?? stats['payments_made']);
  }

  Future<void> _loadHistory() async {
    final response = await apiService.get(AppConstants.historyEndpoint);
    if (response.statusCode != 200) return;

    final data = response.data as Map<String, dynamic>? ?? {};
    final history = data['history'] as List<dynamic>? ?? [];
    _recentPredictions.clear();
    _anxietyDetections = 0;
    _depressionDetections = 0;
    if (history.isEmpty) {
      _latestPrediction = null;
      return;
    }

    for (final item in history.whereType<Map<String, dynamic>>()) {
      final prediction = _predictionFromHistory(item);
      final normalizedStatus = prediction.status.toLowerCase();
      if (normalizedStatus.contains('anxiety')) _anxietyDetections++;
      if (normalizedStatus.contains('depression')) _depressionDetections++;
      if (_recentPredictions.length < 5) {
        _recentPredictions.add(prediction);
      }
    }

    _latestPrediction = _recentPredictions.isNotEmpty ? _recentPredictions.first : null;
    _totalPredictions = _totalPredictions == 0 ? history.length : _totalPredictions;
  }

  Future<void> _loadAppointments() async {
    final response = await apiService.get(AppConstants.bookingEndpoint);
    if (response.statusCode != 200) return;

    final data = response.data as Map<String, dynamic>? ?? {};
    _appointments.clear();
    final appointments = (data['appointments'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(AppointmentModel.fromJson)
        .where((appointment) => appointment.status.toLowerCase() != 'cancelled')
        .toList();

    appointments.sort((a, b) => a.date.compareTo(b.date));
    _appointments.addAll(appointments);
    _nextAppointment = appointments.isNotEmpty ? appointments.first : null;
    _myAppointments = _myAppointments == 0 ? appointments.length : _myAppointments;
  }

  Future<void> _loadDoctors() async {
    final response = await apiService.get(AppConstants.doctorsEndpoint);
    if (response.statusCode != 200) return;

    final data = response.data as Map<String, dynamic>? ?? {};
    _recommendedDoctors.clear();
    final doctors = (data['doctors'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(DoctorModel.fromJson)
        .where((doctor) {
          final status = doctor.status.toLowerCase();
          return status.isEmpty || status == 'active';
        })
        .toList();

    doctors.sort((a, b) => b.rating.compareTo(a.rating));
    _recommendedDoctors.addAll(doctors.take(8));
    _recommendedDoctor = doctors.isNotEmpty ? doctors.first : null;
    _doctorsAvailable = _doctorsAvailable == 0 ? doctors.length : _doctorsAvailable;
  }

  Future<void> _loadNotifications() async {
    final response = await apiService.get(AppConstants.notificationsEndpoint);
    if (response.statusCode != 200) return;

    final data = response.data as Map<String, dynamic>? ?? {};
    final notifications = data['notifications'] as List<dynamic>? ?? [];
    final parsedNotifications = notifications
        .whereType<Map<String, dynamic>>()
        .map(NotificationModel.fromJson)
        .toList();
    _notifications
      ..clear()
      ..addAll(parsedNotifications.take(3));
    _unreadNotifications = parsedNotifications.where((item) => !item.isRead).length;

    if (_notifications.isNotEmpty) {
      _latestNotification = _notifications.first.message.isNotEmpty
          ? _notifications.first.message
          : _notifications.first.title;
    } else {
      _latestNotification = null;
    }
  }

  Future<void> _loadRecommendations() async {
    _recommendations.clear();
    final prediction = _latestPrediction;
    if (prediction == null) return;

    final response = await apiService.get(
      AppConstants.recommendationsEndpoint,
      queryParameters: {
        'text': prediction.recommendation.isNotEmpty
            ? prediction.recommendation
            : 'Mental health assessment result',
        'prediction': prediction.status,
        'confidence': latestConfidence,
      },
    );
    if (response.statusCode != 200) return;

    final data = response.data as Map<String, dynamic>? ?? {};
    final items = data['recommendations'] as List<dynamic>? ?? [];
    for (var index = 0; index < items.length; index++) {
      final item = items[index];
      if (item is Map<String, dynamic>) {
        _recommendations.add(RecommendationModel.fromJson(item));
      } else {
        _recommendations.add(
          RecommendationModel(
            id: 'recommendation-$index',
            category: 'Wellness',
            title: 'Wellness Tip ${index + 1}',
            description: item.toString(),
          ),
        );
      }
    }
  }

  int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  double _normalizeConfidence(dynamic value) {
    final raw = value is num ? value.toDouble() : double.tryParse(value?.toString() ?? '') ?? 0;
    return raw <= 1 ? raw * 100 : raw;
  }

  PredictionModel _predictionFromHistory(Map<String, dynamic> item) {
    return PredictionModel.fromJson({
      'id': item['id']?.toString() ?? '',
      'status': item['anxietyLevel'] ?? item['result'] ?? item['prediction'] ?? '',
      'recommendation': item['summary'] ?? item['recommendation'] ?? '',
      'date': item['date'] ?? item['created_at'] ?? DateTime.now().toIso8601String(),
      'details': {
        'confidence': _normalizeConfidence(item['confidence']),
      },
    });
  }
}
