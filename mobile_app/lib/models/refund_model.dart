class RefundModel {
  final String id;
  final String appointmentId;
  final String paymentId;
  final String doctorName;
  final double amount;
  final double refundAmount;
  final String reason;
  final String notes;
  final String status;
  final String? appointmentDate;
  final String? appointmentTime;
  final String? requestedAt;
  final String? processedAt;
  final String? adminNotes;
  final String? gatewayReference;

  RefundModel({
    required this.id,
    required this.appointmentId,
    required this.paymentId,
    required this.doctorName,
    required this.amount,
    required this.refundAmount,
    required this.reason,
    required this.notes,
    required this.status,
    this.appointmentDate,
    this.appointmentTime,
    this.requestedAt,
    this.processedAt,
    this.adminNotes,
    this.gatewayReference,
  });

  factory RefundModel.fromJson(Map<String, dynamic> json) {
    return RefundModel(
      id: json['id']?.toString() ?? json['refund_id']?.toString() ?? '',
      appointmentId: json['appointment_id']?.toString() ?? '',
      paymentId: json['payment_id']?.toString() ?? '',
      doctorName: json['doctor_name']?.toString() ?? json['doctor']?['name']?.toString() ?? 'Doctor',
      amount: _toDouble(json['amount']),
      refundAmount: _toDouble(json['refund_amount']),
      reason: json['reason']?.toString() ?? '',
      notes: json['notes']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Pending Review',
      appointmentDate: json['appointment_date']?.toString() ?? json['appointment']?['date']?.toString(),
      appointmentTime: json['appointment_time']?.toString() ?? json['appointment']?['time']?.toString(),
      requestedAt: json['requested_at']?.toString(),
      processedAt: json['processed_at']?.toString(),
      adminNotes: json['admin_notes']?.toString(),
      gatewayReference: json['gateway_refund_id']?.toString() ?? json['gateway_reference']?.toString(),
    );
  }

  String get displayId => id.startsWith('RF-') ? id : 'RF-${id.padLeft(6, '0')}';

  static double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }
}
