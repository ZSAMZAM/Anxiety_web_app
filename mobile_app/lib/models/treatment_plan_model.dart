class TreatmentPlanModel {
  final String id;
  final String reportId;
  final String appointmentId;
  final String doctorId;
  final String doctorName;
  final String doctorSpecialization;
  final String doctorHospital;
  final String appointmentDate;
  final String appointmentTime;
  final String assessmentPrediction;
  final String riskLevel;
  final String diagnosis;
  final String treatmentPlan;
  final List<String> recommendations;
  final List<String> lifestyleAdvice;
  final List<String> medications;
  final String followUpDate;
  final String followUpRecommendation;
  final String doctorNotes;
  final String consultationOutcome;
  final String summary;
  final String status;
  final String createdAt;
  final String updatedAt;
  final String? exportPdfUrl;

  const TreatmentPlanModel({
    required this.id,
    required this.reportId,
    required this.appointmentId,
    required this.doctorId,
    required this.doctorName,
    required this.doctorSpecialization,
    required this.doctorHospital,
    required this.appointmentDate,
    required this.appointmentTime,
    required this.assessmentPrediction,
    required this.riskLevel,
    required this.diagnosis,
    required this.treatmentPlan,
    required this.recommendations,
    required this.lifestyleAdvice,
    required this.medications,
    required this.followUpDate,
    required this.followUpRecommendation,
    required this.doctorNotes,
    required this.consultationOutcome,
    required this.summary,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.exportPdfUrl,
  });

  factory TreatmentPlanModel.fromJson(Map<String, dynamic> json) {
    return TreatmentPlanModel(
      id: json['id']?.toString() ?? '',
      reportId: json['report_id']?.toString() ?? json['id']?.toString() ?? '',
      appointmentId: json['appointment_id']?.toString() ?? '',
      doctorId: json['doctor_id']?.toString() ?? '',
      doctorName: json['doctor_name']?.toString() ?? 'Doctor',
      doctorSpecialization: json['doctor_specialization']?.toString() ?? '',
      doctorHospital: json['doctor_hospital']?.toString() ?? '',
      appointmentDate: json['appointment_date']?.toString() ?? '',
      appointmentTime: json['appointment_time']?.toString() ?? '',
      assessmentPrediction: json['assessment_prediction']?.toString() ??
          json['prediction_result']?.toString() ??
          'Not recorded',
      riskLevel: json['risk_level']?.toString() ?? 'Not recorded',
      diagnosis: json['diagnosis']?.toString() ?? 'Not recorded',
      treatmentPlan: json['treatment_plan']?.toString() ?? '',
      recommendations: _toStringList(json['recommendations']),
      lifestyleAdvice: _toStringList(json['lifestyle_advice']),
      medications: _toStringList(json['medications'] ?? json['prescription']),
      followUpDate: json['follow_up_date']?.toString() ?? '',
      followUpRecommendation: json['follow_up_recommendation']?.toString() ?? '',
      doctorNotes: json['doctor_notes']?.toString() ?? '',
      consultationOutcome: json['consultation_outcome']?.toString() ?? '',
      summary: json['summary']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Completed',
      createdAt: json['created_at']?.toString() ?? '',
      updatedAt: json['updated_at']?.toString() ?? '',
      exportPdfUrl: json['export_pdf_url']?.toString(),
    );
  }

  bool get hasExport => exportPdfUrl != null && exportPdfUrl!.isNotEmpty;

  static List<String> _toStringList(dynamic value) {
    if (value is List) {
      return value.map((item) => item.toString().trim()).where((item) => item.isNotEmpty).toList();
    }
    final text = value?.toString().trim() ?? '';
    if (text.isEmpty) return const [];
    return text
        .replaceAll(',', '\n')
        .split('\n')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
  }
}
