class DoctorModel {
  final String id;
  final String name;
  final String? email;
  final String? userId;
  final String specialization;
  final int? experience;
  final String? phone;
  final double rating;
  final String status;
  final String? photo;
  final String? avatar;
  final String? createdAt;
  final double fee;
  final String? specialty;
  final dynamic availabilitySchedule;

  DoctorModel({
    required this.id,
    required this.name,
    this.email,
    this.userId,
    required this.specialization,
    this.experience,
    this.phone,
    required this.rating,
    required this.status,
    this.photo,
    this.avatar,
    this.createdAt,
    required this.fee,
    this.availabilitySchedule,
  });

  factory DoctorModel.fromJson(Map<String, dynamic> json) {
    return DoctorModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      email: json['email'] as String?,
      userId: json['user_id']?.toString(),
      specialization: json['specialization'] ?? json['specialty'] ?? '',
      experience: json['experience'] is int
          ? json['experience'] as int
          : int.tryParse(RegExp(r'\d+').firstMatch(json['experience']?.toString() ?? '')?.group(0) ?? ''),
      phone: json['phone'] as String?,
      rating: json['rating'] is num ? (json['rating'] as num).toDouble() : double.tryParse(json['rating']?.toString() ?? '') ?? 0.0,
      status: json['status']?.toString() ?? 'active',
      photo: json['photo'] as String? ?? json['image'] as String?,
      avatar: json['avatar'] as String?,
      createdAt: json['created_at'] as String?,
      fee: json['fee'] is num
          ? (json['fee'] as num).toDouble()
          : double.tryParse((json['fee'] ?? json['consultation_fee'])?.toString() ?? '') ?? 0.0,
      availabilitySchedule: json['availability_schedule'],
    );
  }
}
