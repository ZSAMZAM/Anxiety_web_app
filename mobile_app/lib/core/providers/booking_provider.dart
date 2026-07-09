import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
import '../network/models.dart';

class BookingProvider extends ChangeNotifier {
  final ApiService apiService;

  AppointmentModel? _booking;
  DateTime? _selectedDate;
  String? _selectedTime;
  String? _notes;
  bool _isLoading = false;
  String? _error;

  BookingProvider({required this.apiService});

  // Getters
  AppointmentModel? get booking => _booking;
  DateTime? get selectedDate => _selectedDate;
  String? get selectedTime => _selectedTime;
  String? get notes => _notes;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Set date
  void setDate(DateTime date) {
    _selectedDate = date;
    _selectedTime = null;
    notifyListeners();
  }

  // Set time
  void setTime(String time) {
    _selectedTime = time.trim().isEmpty ? null : time;
    notifyListeners();
  }

  void clearTime() {
    _selectedTime = null;
    notifyListeners();
  }

  // Set notes
  void setNotes(String value) {
    _notes = value;
    notifyListeners();
  }

  // Confirm booking
  Future<bool> confirmBooking(String doctorId, {required String doctorName, required String phone}) async {
    if (_selectedDate == null || _selectedTime == null) {
      _error = 'Please select date and time';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        AppConstants.bookingEndpoint,
        data: {
          'doctor_id': doctorId,
          'doctor_name': doctorName,
          'phone': phone,
          'appointment_date': _selectedDate!.toIso8601String().split('T').first,
          'appointment_time': _normalizeTimeForApi(_selectedTime!),
          'notes': _notes ?? '',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data as Map<String, dynamic>;
        _booking = AppointmentModel.fromJson(data['appointment'] as Map<String, dynamic>? ?? {});
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to confirm booking.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  String _normalizeTimeForApi(String value) {
    final trimmed = value.trim();
    if (trimmed.contains('-')) {
      return trimmed.split('-').first.trim();
    }
    return trimmed;
  }

  void resetBooking() {
    _booking = null;
    _selectedDate = null;
    _selectedTime = null;
    _notes = null;
    notifyListeners();
  }
}
