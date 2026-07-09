class PredictionModel {
  final String? id;
  final String result;
  final String className;
  final double confidence;
  final String? date;
  final String? summary;

  PredictionModel({
    this.id,
    required this.result,
    required this.className,
    required this.confidence,
    this.date,
    this.summary,
  });

  factory PredictionModel.fromJson(Map<String, dynamic> json) {
    return PredictionModel(
      id: json['id']?.toString(),
      result: json['result']?.toString() ?? json['class_name']?.toString() ?? json['status']?.toString() ?? '',
      className: json['class_name']?.toString() ?? json['status']?.toString() ?? '',
      confidence: json['confidence'] is num ? (json['confidence'] as num).toDouble() : double.tryParse(json['confidence']?.toString() ?? '') ?? 0.0,
      date: json['date']?.toString(),
      summary: json['summary']?.toString(),
    );
  }
}

class PredictionHistoryItem {
  final String id;
  final DateTime date;
  final String status;
  final String anxietyLevel;
  final int confidence;
  final String summary;

  PredictionHistoryItem({
    required this.id,
    required this.date,
    required this.status,
    required this.anxietyLevel,
    required this.confidence,
    required this.summary,
  });

  factory PredictionHistoryItem.fromJson(Map<String, dynamic> json) {
    return PredictionHistoryItem(
      id: json['id']?.toString() ?? '',
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      status: json['result']?.toString() ?? json['anxietyLevel']?.toString() ?? '',
      anxietyLevel: json['anxietyLevel']?.toString() ?? json['result']?.toString() ?? '',
      confidence: json['confidence'] is int
          ? json['confidence'] as int
          : (json['confidence'] is num
              ? (json['confidence'] as num).round()
              : int.tryParse(json['confidence']?.toString() ?? '') ?? 0),
      summary: json['summary']?.toString() ?? '',
    );
  }
}
