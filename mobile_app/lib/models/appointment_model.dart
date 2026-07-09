class AppointmentModel {
  final String id;
  final String doctorId;
  final String doctorName;
  final String phone;
  final String date;
  final String time;
  final String notes;
  final String status;
  final String? createdAt;
  final int? rating;
  final String? ratingComment;
  final bool canRate;
  final bool hasRating;

  AppointmentModel({
    required this.id,
    required this.doctorId,
    required this.doctorName,
    required this.phone,
    required this.date,
    required this.time,
    required this.notes,
    required this.status,
    this.createdAt,
    this.rating,
    this.ratingComment,
    this.canRate = false,
    this.hasRating = false,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id']?.toString() ?? '',
      doctorId: json['doctorId']?.toString() ?? json['doctor_id']?.toString() ?? '',
      doctorName: json['doctorName'] ?? json['doctor_name'] ?? '',
      phone: json['phone']?.toString() ?? '',
      date: json['date'] ?? json['appointment_date'] ?? '',
      time: json['time'] ?? json['appointment_time'] ?? '',
      notes: json['notes']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      createdAt: json['created_at']?.toString(),
      rating: json['rating'] is int ? json['rating'] as int : int.tryParse(json['rating']?.toString() ?? ''),
      ratingComment: json['ratingComment']?.toString() ?? json['rating_comment']?.toString(),
      canRate: json['canRate'] == true || json['can_rate'] == true,
      hasRating: json['hasRating'] == true || json['has_rating'] == true || json['rating'] != null,
    );
  }
}
