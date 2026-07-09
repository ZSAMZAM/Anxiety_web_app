import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/notification_model.dart';
import '../core/constants/app_constants.dart';

class NotificationProvider extends ChangeNotifier {
  final ApiService apiService;

  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _error;

  NotificationProvider({required this.apiService});

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> loadNotifications() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.get(AppConstants.notificationsEndpoint);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final notifications = data['notifications'] as List<dynamic>? ?? [];
        _notifications = notifications
            .map((item) => NotificationModel.fromJson(item as Map<String, dynamic>))
            .toList();
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (error) {
      if (error is ApiException) {
        _error = error.message;
      } else {
        _error = 'Unable to load notifications.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> markAsRead(String notificationId) async {
    try {
      final response = await apiService.put(
        '${AppConstants.notificationsEndpoint}/$notificationId/read',
      );
      if (response.statusCode == 200) {
        await loadNotifications();
        return true;
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to update notification.';
    }
    return false;
  }

  Future<bool> markAsUnread(String notificationId) async {
    try {
      final response = await apiService.put(
        '${AppConstants.notificationsEndpoint}/$notificationId/unread',
      );
      if (response.statusCode == 200) {
        await loadNotifications();
        return true;
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to update notification.';
    }
    return false;
  }

  Future<bool> markAllRead() async {
    try {
      final response = await apiService.put(
        '${AppConstants.notificationsEndpoint}/mark-all-read',
      );
      if (response.statusCode == 200) {
        await loadNotifications();
        return true;
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to update notifications.';
    }
    return false;
  }

  Future<bool> deleteNotification(String notificationId) async {
    try {
      final response = await apiService.delete(
        '${AppConstants.notificationsEndpoint}/$notificationId',
      );
      if (response.statusCode == 200) {
        await loadNotifications();
        return true;
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to delete notification.';
    }
    return false;
  }
}
