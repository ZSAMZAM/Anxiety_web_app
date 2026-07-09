import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
import '../network/models.dart';

class DoctorProvider extends ChangeNotifier {
  final ApiService apiService;

  List<DoctorModel> _doctors = [];
  DoctorModel? _selectedDoctor;
  List<Map<String, dynamic>> _bookedSlots = [];
  bool _isLoading = false;
  String? _error;
  String _searchQuery = '';
  String _specialtyFilter = '';

  DoctorProvider({required this.apiService});

  // Getters
  List<DoctorModel> get doctors => _doctors;
  List<DoctorModel> get filteredDoctors {
    return _doctors
        .where((doctor) {
          final query = _searchQuery.toLowerCase();
          final matchesSearch = query.isEmpty ||
              doctor.name.toLowerCase().contains(query) ||
              doctor.specialization.toLowerCase().contains(query) ||
              doctor.city.toLowerCase().contains(query) ||
              doctor.district.toLowerCase().contains(query);
          final matchesSpecialty = _specialtyFilter.isEmpty ||
              doctor.specialization.toLowerCase() == _specialtyFilter.toLowerCase();
          return matchesSearch && matchesSpecialty;
        })
        .toList();
  }

  List<String> get specialtyOptions {
    final values = _doctors
        .map((doctor) => doctor.specialization)
        .where((value) => value.trim().isNotEmpty)
        .toSet()
        .toList();
    values.sort();
    return values;
  }

  DoctorModel? get selectedDoctor => _selectedDoctor;
  List<Map<String, dynamic>> get bookedSlots => _bookedSlots;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get specialtyFilter => _specialtyFilter;

  // Load doctors
  Future<void> loadDoctors() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(AppConstants.doctorsEndpoint);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>?;
        final doctorsList = data?['doctors'] as List<dynamic>? ?? [];
        _doctors = doctorsList
            .whereType<Map>()
            .map((doctor) => DoctorModel.fromJson(Map<String, dynamic>.from(doctor)))
            .toList();
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to load doctors.';
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  // Get doctor by ID and availability
  Future<bool> getDoctorById(String doctorId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(
        '${AppConstants.doctorAvailabilityEndpoint}$doctorId/availability',
      );
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final doctorData = data['doctor'];
        final availabilityDoctor = doctorData is Map
            ? Map<String, dynamic>.from(doctorData)
            : <String, dynamic>{};
        Map<String, dynamic>? existingDoctor;
        for (final doctor in _doctors) {
          if (doctor.id == doctorId) {
            existingDoctor = doctor.toJson();
            break;
          }
        }
        final mergedDoctor = <String, dynamic>{
          if (existingDoctor != null) ...existingDoctor,
          ...availabilityDoctor,
        };
        _selectedDoctor = DoctorModel.fromJson(
          mergedDoctor,
        );
        _bookedSlots = (data['booked_slots'] as List<dynamic>? ?? [])
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to load doctor details.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Select doctor
  void selectDoctor(DoctorModel doctor) {
    _selectedDoctor = doctor;
    notifyListeners();
  }

  // Search doctors
  void searchDoctors(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void clearSearch() {
    _searchQuery = '';
    notifyListeners();
  }

  void setSpecialtyFilter(String value) {
    _specialtyFilter = value;
    notifyListeners();
  }

  void clearFilters() {
    _searchQuery = '';
    _specialtyFilter = '';
    notifyListeners();
  }
}
