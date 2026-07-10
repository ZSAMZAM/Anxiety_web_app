import 'dart:convert';

// User Models
class UserModel {
  final String id;
  final String fullName;
  final String username;
  final String phone;
  final String gender;
  final int age;
  final String role;
  final String? dateOfBirth;
  final String? avatar;

  UserModel({
    required this.id,
    required this.fullName,
    required this.username,
    required this.phone,
    required this.gender,
    required this.age,
    required this.role,
    this.dateOfBirth,
    this.avatar,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final dynamic ageValue = json['age'];
    return UserModel(
      id: (json['id']?.toString() ?? '').toString(),
      fullName: json['full_name'] ?? json['fullname'] ?? json['name'] ?? '',
      username: json['username'] ?? '',
      phone: json['phone'] ?? '',
      gender: json['gender'] ?? '',
      age: ageValue is int
          ? ageValue
          : int.tryParse(ageValue?.toString() ?? '') ?? 0,
      role: json['role']?.toString() ?? 'user',
      dateOfBirth: json['date_of_birth']?.toString(),
      avatar: json['avatar'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'username': username,
      'phone': phone,
      'gender': gender,
      'age': age,
      'role': role,
      'date_of_birth': dateOfBirth,
      'avatar': avatar,
    };
  }
}

// Doctor Model
class DoctorModel {
  final String id;
  final String name;
  final String specialization;
  final String hospital;
  final String city;
  final String district;
  final String location;
  final double fee;
  final double rating;
  final int reviewCount;
  final List<Map<String, dynamic>> recentReviews;
  final int experience;
  final String status;
  final String? photo;
  final String? biography;
  final dynamic availabilitySchedule;
  final Map<String, dynamic> calendarSlots;
  final DateTime? createdAt;

  DoctorModel({
    required this.id,
    required this.name,
    required this.specialization,
    required this.hospital,
    required this.city,
    required this.district,
    required this.location,
    required this.fee,
    required this.rating,
    this.reviewCount = 0,
    this.recentReviews = const [],
    required this.experience,
    required this.status,
    this.photo,
    this.biography,
    this.availabilitySchedule,
    this.calendarSlots = const {},
    this.createdAt,
  });

  List<String> get availableDays {
    final schedule = _normalizeAvailabilitySchedule(availabilitySchedule);
    if (schedule.isNotEmpty) {
      return schedule
          .entries
          .where((entry) => entry.value is Map<String, dynamic> && (entry.value['available'] == true))
          .map((entry) => entry.key.toString())
          .toList();
    }
    return [];
  }

  List<String> get availableTimeSlots {
    final schedule = _normalizeAvailabilitySchedule(availabilitySchedule);
    if (schedule.isNotEmpty) {
      final slots = <String>[];
      for (final value in schedule.values) {
        if (value is Map<String, dynamic> && value['slots'] is List) {
          for (final slot in value['slots'] as List<dynamic>) {
            if (slot is Map) {
              final start = slot['start']?.toString();
              final end = slot['end']?.toString();
              if (start != null && end != null) {
                slots.add('$start - $end');
              }
            }
          }
        }
      }
      return slots;
    }
    return [];
  }

  List<Map<String, String>> slotsForDate(DateTime date) {
    final dateKey = date.toIso8601String().split('T').first;
    final calendarDay = calendarSlots[dateKey];
    if (calendarDay is Map) {
      if (calendarDay['blocked'] == true || calendarDay['available'] == false) {
        return [];
      }
      final slots = calendarDay['slots'];
      if (slots is List) {
        final calendarSlotsForDate = slots
            .whereType<Map>()
            .where((slot) => _slotIsBookable(slot, date))
            .map((slot) => {
                  'start': slot['start']?.toString() ?? slot['start_time']?.toString() ?? '',
                  'end': slot['end']?.toString() ?? slot['end_time']?.toString() ?? '',
                })
            .where((slot) => slot['start']!.isNotEmpty && slot['end']!.isNotEmpty)
            .toList();
        if (calendarSlotsForDate.isNotEmpty) {
          return calendarSlotsForDate;
        }
      }
    }
    return _weeklySlotsForDate(date);
  }

  List<Map<String, String>> _weeklySlotsForDate(DateTime date) {
    final schedule = _normalizeAvailabilitySchedule(availabilitySchedule);
    if (schedule.isEmpty) return [];
    final dayKey = _weekdayKey(date);
    final daySchedule = schedule[dayKey];
    if (daySchedule is! Map<String, dynamic> || daySchedule['available'] != true) {
      return [];
    }
    final slots = daySchedule['slots'];
    if (slots is! List) return [];
    return slots
            .whereType<Map>()
            .where((slot) => _slotIsBookable(slot, date))
            .map((slot) => {
                  'start': slot['start']?.toString() ?? slot['start_time']?.toString() ?? '',
                  'end': slot['end']?.toString() ?? slot['end_time']?.toString() ?? '',
            })
        .where((slot) => slot['start']!.isNotEmpty && slot['end']!.isNotEmpty)
        .toList();
  }

  bool _slotIsBookable(Map slot, DateTime date) {
    final status = slot['status']?.toString().trim().toLowerCase() ?? '';
    if (slot['booked'] == true) return false;
    if (['booked', 'pending_payment', 'reserved', 'closed', 'disabled', 'expired', 'unavailable'].contains(status)) {
      return false;
    }
    final start = slot['start']?.toString() ?? slot['start_time']?.toString() ?? '';
    final parts = start.split(':');
    if (parts.length >= 2) {
      final hour = int.tryParse(parts[0]);
      final minute = int.tryParse(parts[1]);
      if (hour != null && minute != null) {
        final slotStart = DateTime(date.year, date.month, date.day, hour, minute);
        if (slotStart.isBefore(DateTime.now())) return false;
      }
    }
    return true;
  }

  bool isAvailableOn(DateTime date) {
    return slotsForDate(date).isNotEmpty;
  }

  bool get hasUpcomingAvailability {
    return nextAvailableDate() != null;
  }

  DateTime? nextAvailableDate({int daysAhead = 365}) {
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day);
    for (var offset = 0; offset <= daysAhead; offset += 1) {
      final date = start.add(Duration(days: offset));
      if (slotsForDate(date).isNotEmpty) {
        return date;
      }
    }
    return null;
  }

  factory DoctorModel.fromJson(Map<String, dynamic> json) {
    return DoctorModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      specialization: json['specialization']?.toString() ??
          json['specialty']?.toString() ??
          '',
      hospital: json['hospital']?.toString() ??
          json['hospital_name']?.toString() ??
          json['clinic_name']?.toString() ??
          '',
      city: json['city']?.toString() ?? '',
      district: json['district']?.toString() ?? '',
      location: json['location']?.toString() ??
          json['clinic_address']?.toString() ??
          json['address']?.toString() ??
          '',
      fee: _toDouble(json['fee'] ?? json['cons_fee'] ?? json['consultation_fee']),
      rating: _toDouble(json['average_rating'] ?? json['rating']),
      reviewCount: _toInt(json['review_count'] ?? json['total_reviews']),
      recentReviews: (json['recent_reviews'] as List<dynamic>? ?? [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList(),
      experience: _toInt(json['experience'] ?? json['experience_years']),
      status: json['status']?.toString() ?? 'ACTIVE',
      photo: json['photo']?.toString() ?? json['image']?.toString() ?? json['avatar']?.toString(),
      biography: json['bio'] ?? json['biography'],
      availabilitySchedule: json['availability_schedule'] ?? json['availabilitySchedule'],
      calendarSlots: json['calendar_slots'] is Map
          ? Map<String, dynamic>.from(json['calendar_slots'] as Map)
          : const {},
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? json['createdAt']?.toString() ?? ''),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'specialization': specialization,
      'hospital': hospital,
      'city': city,
      'district': district,
      'location': location,
      'fee': fee,
      'rating': rating,
      'average_rating': rating,
      'review_count': reviewCount,
      'recent_reviews': recentReviews,
      'experience': experience,
      'status': status,
      'photo': photo,
      'biography': biography,
      'available_days': availableDays,
      'available_time_slots': availableTimeSlots,
      'calendar_slots': calendarSlots,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}

// Prediction Model
class PredictionModel {
  final String id;
  final String status;
  final String recommendation;
  final DateTime date;
  final Map<String, dynamic> details;

  PredictionModel({
    required this.id,
    required this.status,
    required this.recommendation,
    required this.date,
    required this.details,
  });

  factory PredictionModel.fromJson(Map<String, dynamic> json) {
    return PredictionModel(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      recommendation: json['recommendation']?.toString() ?? '',
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      details: json['details'] is Map<String, dynamic>
          ? json['details'] as Map<String, dynamic>
          : {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'status': status,
      'recommendation': recommendation,
      'date': date.toIso8601String(),
      'details': details,
    };
  }
}

// Appointment Model
class AppointmentModel {
  final String id;
  final String doctorId;
  final String userId;
  final String doctorName;
  final DateTime date;
  final String time;
  final String status;
  final String? notes;
  final double fee;
  final String? referenceNumber;

  AppointmentModel({
    required this.id,
    required this.doctorId,
    required this.userId,
    required this.doctorName,
    required this.date,
    required this.time,
    required this.status,
    this.notes,
    required this.fee,
    this.referenceNumber,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id']?.toString() ?? '',
      doctorId: json['doctor_id']?.toString() ?? json['doctorId']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? json['userId']?.toString() ?? '',
      doctorName: json['doctor_name']?.toString() ?? json['doctorName']?.toString() ?? '',
      date: DateTime.tryParse(
            json['date']?.toString() ?? json['appointment_date']?.toString() ?? '',
          ) ??
          DateTime.now(),
      time: json['time']?.toString() ?? json['appointment_time']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      notes: json['notes']?.toString(),
      fee: _toDouble(json['fee'] ?? json['cons_fee'] ?? json['consultation_fee']),
      referenceNumber: json['reference_number']?.toString() ?? json['referenceNumber']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'doctor_id': doctorId,
      'user_id': userId,
      'doctor_name': doctorName,
      'date': date.toIso8601String(),
      'time': time,
      'status': status,
      'notes': notes,
      'fee': fee,
      'reference_number': referenceNumber,
    };
  }
}

// Notification Model
class NotificationModel {
  final String id;
  final String type;
  final String title;
  final String message;
  final DateTime date;
  final bool isRead;
  final Map<String, dynamic>? data;

  NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.date,
    required this.isRead,
    this.data,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? json['notification_type']?.toString() ?? 'general',
      title: json['title']?.toString() ?? 'Notification',
      message: json['message']?.toString() ?? '',
      date: DateTime.tryParse(
            json['date']?.toString() ?? json['created_at']?.toString() ?? '',
          ) ??
          DateTime.now(),
      isRead: json['is_read'] == true ||
          json['is_read'] == 1 ||
          json['status']?.toString().toLowerCase() == 'read',
      data: json['data'] is Map<String, dynamic> ? json['data'] as Map<String, dynamic> : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'title': title,
      'message': message,
      'date': date.toIso8601String(),
      'is_read': isRead,
      'data': data,
    };
  }
}

double _toDouble(dynamic value, {double fallback = 0.0}) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

int _toInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  final match = RegExp(r'\d+').firstMatch(value?.toString() ?? '');
  return int.tryParse(match?.group(0) ?? '') ?? fallback;
}

Map<String, dynamic> _normalizeAvailabilitySchedule(dynamic value) {
  dynamic decoded = value;
  if (decoded is String && decoded.trim().isNotEmpty) {
    try {
      decoded = jsonDecode(decoded);
    } catch (_) {
      return {};
    }
  }
  if (decoded is! Map) return {};

  final normalized = <String, dynamic>{};
  for (final entry in decoded.entries) {
    final dayKey = entry.key.toString().trim().toLowerCase();
    if (dayKey.isEmpty || entry.value is! Map) continue;

    final dayValue = Map<String, dynamic>.from(entry.value as Map);
    final rawSlots = dayValue['slots'];
    final slots = rawSlots is List
        ? rawSlots
            .whereType<Map>()
            .map((slot) => {
                  'start': slot['start']?.toString() ?? slot['start_time']?.toString() ?? '',
                  'end': slot['end']?.toString() ?? slot['end_time']?.toString() ?? '',
                })
            .where((slot) => slot['start']!.isNotEmpty && slot['end']!.isNotEmpty)
            .toList()
        : <Map<String, String>>[];

    normalized[dayKey] = {
      'available': dayValue['available'] == true ||
          dayValue['is_available'] == true ||
          dayValue['isAvailable'] == true ||
          dayValue['available']?.toString().toLowerCase() == 'true' ||
          dayValue['is_available']?.toString() == '1',
      'slots': slots,
    };
  }
  return normalized;
}

String _weekdayKey(DateTime date) {
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  return days[date.weekday - 1];
}

// Recommendation Model
class RecommendationModel {
  final String id;
  final String category;
  final String title;
  final String description;

  RecommendationModel({
    required this.id,
    required this.category,
    required this.title,
    required this.description,
  });

  factory RecommendationModel.fromJson(Map<String, dynamic> json) {
    return RecommendationModel(
      id: json['id']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'category': category,
      'title': title,
      'description': description,
    };
  }
}
