class NotificationModel {
  final String id;
  final String userId;
  final String recipient;
  final String title;
  final String message;
  final String type;
  final String status;
  final String? createdAt;

  NotificationModel({
    required this.id,
    required this.userId,
    required this.recipient,
    required this.title,
    required this.message,
    required this.type,
    required this.status,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      recipient: json['recipient']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notification',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? json['notification_type']?.toString() ?? 'general',
      status: json['status']?.toString() ??
          (json['is_read'] == true || json['is_read'] == 1 ? 'Read' : 'Unread'),
      createdAt: json['created_at']?.toString() ?? json['date']?.toString(),
    );
  }
}
