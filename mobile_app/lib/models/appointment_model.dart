class AppointmentModel {
  final String id;
  final String doctorId;
  final String doctorName;
  final String phone;
  final String date;
  final String time;
  final String? endTime;
  final String? originalTime;
  final String? originalEndTime;
  final int extensionMinutes;
  final bool emergencyExtension;
  final String? extensionReason;
  final String notes;
  final String status;
  final String? createdAt;
  final int? rating;
  final String? ratingComment;
  final String? reviewCreatedAt;
  final String? paymentStatus;
  final String? paymentId;
  final double paymentAmount;
  final String? paymentMethod;
  final String? paymentTransactionId;
  final String? refundRequestId;
  final String? refundStatus;
  final bool canRequestRefund;
  final String? specialization;
  final String? doctorPhoto;
  final double consultationFee;
  final String? duration;
  final bool canRate;
  final bool hasRating;

  AppointmentModel({
    required this.id,
    required this.doctorId,
    required this.doctorName,
    required this.phone,
    required this.date,
    required this.time,
    this.endTime,
    this.originalTime,
    this.originalEndTime,
    this.extensionMinutes = 0,
    this.emergencyExtension = false,
    this.extensionReason,
    required this.notes,
    required this.status,
    this.createdAt,
    this.rating,
    this.ratingComment,
    this.reviewCreatedAt,
    this.paymentStatus,
    this.paymentId,
    this.paymentAmount = 0,
    this.paymentMethod,
    this.paymentTransactionId,
    this.refundRequestId,
    this.refundStatus,
    this.canRequestRefund = false,
    this.specialization,
    this.doctorPhoto,
    this.consultationFee = 0,
    this.duration,
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
      endTime: json['endTime']?.toString() ?? json['appointment_end_time']?.toString() ?? json['end_time']?.toString(),
      originalTime: json['original_appointment_time']?.toString(),
      originalEndTime: json['original_appointment_end_time']?.toString(),
      extensionMinutes: int.tryParse(json['extension_minutes']?.toString() ?? '') ?? 0,
      emergencyExtension: json['emergency_extension'] == true || json['emergency_extension']?.toString() == '1',
      extensionReason: json['extension_reason']?.toString(),
      notes: json['notes']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      createdAt: json['created_at']?.toString(),
      rating: json['rating'] is int ? json['rating'] as int : int.tryParse(json['rating']?.toString() ?? ''),
      ratingComment: json['ratingComment']?.toString() ?? json['rating_comment']?.toString(),
      reviewCreatedAt: json['reviewCreatedAt']?.toString() ?? json['review_created_at']?.toString(),
      paymentStatus: json['paymentStatus']?.toString() ?? json['payment_status']?.toString(),
      paymentId: json['paymentId']?.toString() ?? json['payment_id']?.toString(),
      paymentAmount: _toDouble(json['paymentAmount'] ?? json['payment_amount']),
      paymentMethod: json['paymentMethod']?.toString() ?? json['payment_method']?.toString(),
      paymentTransactionId: json['paymentTransactionId']?.toString() ?? json['payment_transaction_id']?.toString() ?? json['transaction_id']?.toString(),
      refundRequestId: json['refundRequestId']?.toString() ?? json['refund_request_id']?.toString(),
      refundStatus: json['refundStatus']?.toString() ?? json['refund_status']?.toString(),
      canRequestRefund: json['canRequestRefund'] == true || json['can_request_refund'] == true,
      specialization: json['specialization']?.toString() ?? json['doctor_specialization']?.toString(),
      doctorPhoto: json['doctorPhoto']?.toString() ?? json['doctor_photo']?.toString() ?? json['avatar']?.toString(),
      consultationFee: _toDouble(json['consultationFee'] ?? json['consultation_fee'] ?? json['paymentAmount'] ?? json['payment_amount']),
      duration: json['duration']?.toString() ?? json['appointment_duration']?.toString(),
      canRate: json['canRate'] == true || json['can_rate'] == true,
      hasRating: json['hasRating'] == true || json['has_rating'] == true || json['rating'] != null,
    );
  }

  String get effectiveStatus {
    final refund = (refundStatus ?? '').toLowerCase();
    if (refund.contains('pending')) return 'Refund Pending';
    if (refund.contains('approved')) return 'Refund Approved';
    if (refund.contains('rejected')) return 'Refund Rejected';
    if (refund.contains('completed')) return 'Refund Completed';
    if (refund.contains('processing')) return 'Refund Processing';
    if ((paymentStatus ?? '').toLowerCase().contains('pending')) return 'Pending Payment';
    return status.isEmpty ? 'Upcoming' : status;
  }

  bool get isPaid {
    final value = (paymentStatus ?? '').toLowerCase();
    return value.contains('paid') || value.contains('completed') || value.contains('success');
  }

  bool get isDelayed => emergencyExtension || extensionMinutes > 0 || (extensionReason ?? '').isNotEmpty;

  static double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }
}
