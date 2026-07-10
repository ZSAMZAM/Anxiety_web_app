import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/appointment_model.dart';
import '../core/constants/app_constants.dart';

class AppointmentProvider extends ChangeNotifier {
  final ApiService apiService;

  List<AppointmentModel> _appointments = [];
  AppointmentModel? _selectedAppointment;
  bool _isLoading = false;
  String? _error;

  AppointmentProvider({required this.apiService});

  List<AppointmentModel> get appointments => _appointments;
  AppointmentModel? get selectedAppointment => _selectedAppointment;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> loadAppointments({String? userId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final endpoint = userId == null
          ? AppConstants.appointmentHistoryEndpoint
          : '${AppConstants.appointmentHistoryEndpoint}/user/$userId';
      final response = await apiService.get(endpoint);
      if (response.statusCode == 200) {
        final rawData = response.data;
        final items = rawData is List<dynamic> ? rawData : (rawData['appointments'] as List<dynamic>? ?? []);
        _appointments = items
            .map((item) => AppointmentModel.fromJson(item as Map<String, dynamic>))
            .toList();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to load appointments.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> rateAppointment({
    required String appointmentId,
    required int rating,
    String comment = '',
  }) async {
    if (appointmentId.isEmpty) {
      _error = 'Appointment is missing.';
      notifyListeners();
      return false;
    }
    if (rating < 1 || rating > 5) {
      _error = 'Rating must be between 1 and 5.';
      notifyListeners();
      return false;
    }
    final trimmedComment = comment.trim();
    if (trimmedComment.isNotEmpty && trimmedComment.length < 5) {
      _error = 'Feedback must be at least 5 characters.';
      notifyListeners();
      return false;
    }
    if (trimmedComment.length > 500) {
      _error = 'Feedback must be 500 characters or less.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        '/api/reviews',
        data: {
          'appointment_id': appointmentId,
          'rating': rating,
          'feedback': trimmedComment,
        },
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        await loadAppointments();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to submit rating.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> cancelAppointment(String appointmentId) async {
    if (appointmentId.isEmpty) {
      _error = 'Appointment is missing.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.put(
        '${AppConstants.appointmentHistoryEndpoint}/$appointmentId',
        data: {'status': 'Cancelled'},
      );
      if (response.statusCode == 200) {
        await loadAppointments();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to cancel appointment.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
