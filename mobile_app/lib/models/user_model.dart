class UserModel {
  final String id;
  final String username;
  final String fullName;
  final String? email;
  final String phone;
  final String? avatar;
  final String? gender;
  final int? age;
  final String? dateOfBirth;
  final String? address;
  final String? district;
  final String? city;
  final String role;
  final String? status;
  final String? createdAt;
  final String? specialty;
  final String? clinicName;
  final String? clinicAddress;
  final int? experienceYears;
  final String? licenseNumber;
  final String? bio;
  final double? rating;
  final dynamic availabilitySchedule;

  UserModel({
    required this.id,
    required this.username,
    required this.fullName,
    this.email,
    required this.phone,
    this.avatar,
    this.gender,
    this.age,
    this.dateOfBirth,
    this.address,
    this.district,
    this.city,
    required this.role,
    this.status,
    this.createdAt,
    this.specialty,
    this.clinicName,
    this.clinicAddress,
    this.experienceYears,
    this.licenseNumber,
    this.bio,
    this.rating,
    this.availabilitySchedule,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      username: json['username'] ?? '',
      fullName: json['fullname'] ?? json['full_name'] ?? json['name'] ?? '',
      email: json['email'] as String?,
      phone: json['phone'] ?? '',
      avatar: json['avatar'] as String?,
      gender: json['gender'] as String?,
      age: json['age'] is int ? json['age'] as int : int.tryParse(json['age']?.toString() ?? ''),
      dateOfBirth: json['date_of_birth'] as String?,
      address: json['address'] as String?,
      district: json['district'] as String?,
      city: json['city'] as String?,
      role: json['role'] ?? 'user',
      status: json['status'] as String?,
      createdAt: json['created_at'] as String?,
      specialty: json['specialty'] as String?,
      clinicName: json['clinic_name'] as String?,
      clinicAddress: json['clinic_address'] as String?,
      experienceYears: json['experience_years'] is int ? json['experience_years'] as int : int.tryParse(json['experience_years']?.toString() ?? ''),
      licenseNumber: json['license_number'] as String?,
      bio: json['bio'] as String?,
      rating: json['rating'] is num ? (json['rating'] as num).toDouble() : double.tryParse(json['rating']?.toString() ?? ''),
      availabilitySchedule: json['availability_schedule'],
    );
  }
}
