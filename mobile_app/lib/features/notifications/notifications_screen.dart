import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/cards.dart';
import '../../providers/notification_provider.dart';
import '../../models/notification_model.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with WidgetsBindingObserver {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().loadNotifications();
    });
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        context.read<NotificationProvider>().loadNotifications(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      context.read<NotificationProvider>().loadNotifications(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.notifications),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.mark_chat_read_rounded),
            onPressed: () async {
              await context.read<NotificationProvider>().markAllRead();
            },
          ),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.cloud_off, size: 64, color: AppColors.lightDanger),
                    const SizedBox(height: 16),
                    Text(provider.error!, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: provider.loadNotifications,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (provider.notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_off,
                    size: 64,
                    color: AppColors.lightGrey,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    AppStrings.noNotifications,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.loadNotifications(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
              children: [
                GradientCard(
                  colors: const [Color(0xFF3B82F6), Color(0xFF14B8A6)],
                  borderRadius: 30,
                  padding: const EdgeInsets.all(22),
                  child: Row(
                    children: [
                      Container(
                        width: 54,
                        height: 54,
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(18)),
                        child: const Icon(Icons.notifications_active_rounded, color: Colors.white),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Notification center', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
                            Text('${provider.notifications.where((item) => item.status.toLowerCase() != 'read').length} unread updates', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.85))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                ...provider.notifications.map(
                  (notification) => _NotificationItem(
                    notification: notification,
                    onToggleRead: () async {
                      if (notification.status.toLowerCase() == 'read') {
                        await provider.markAsUnread(notification.id);
                      } else {
                        await provider.markAsRead(notification.id);
                      }
                    },
                    onDelete: () async {
                      await provider.deleteNotification(notification.id);
                    },
                    onOpen: () async {
                      if (notification.status.toLowerCase() != 'read') {
                        await provider.markAsRead(notification.id);
                      }
                      if (!context.mounted) return;
                      if (notification.type.toLowerCase().startsWith('refund') && (notification.referenceId ?? '').isNotEmpty) {
                        context.push('/refund_details', extra: notification.referenceId);
                      }
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _NotificationItem extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback onToggleRead;
  final VoidCallback onDelete;
  final VoidCallback onOpen;

  const _NotificationItem({
    required this.notification,
    required this.onToggleRead,
    required this.onDelete,
    required this.onOpen,
  });

  IconData _getIcon() {
    switch (notification.type) {
      case 'appointment_reminder':
        return Icons.event;
      case 'payment_confirmation':
        return Icons.payment;
      case 'refund_submitted':
      case 'refund_approved':
      case 'refund_rejected':
      case 'refund_processing':
      case 'refund_completed':
        return Icons.receipt_long;
      case 'prediction_alert':
        return Icons.assessment;
      default:
        return Icons.notifications;
    }
  }

  Color _getColor() {
    switch (notification.type) {
      case 'appointment_reminder':
        return AppColors.lightPrimary;
      case 'payment_confirmation':
        return AppColors.lightSuccess;
      case 'refund_submitted':
      case 'refund_approved':
      case 'refund_rejected':
      case 'refund_processing':
      case 'refund_completed':
        return AppColors.lightPrimary;
      case 'prediction_alert':
        return AppColors.lightSecondary;
      default:
        return AppColors.lightGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRead = notification.status.toLowerCase() == 'read';
    return CustomCard(
      onTap: onOpen,
      marginBottom: const EdgeInsets.only(bottom: 12),
      borderRadius: 26,
      padding: const EdgeInsets.all(16),
      backgroundColor: isRead ? null : AppColors.lightPrimary.withOpacity(0.05),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getColor().withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getIcon(),
                  color: _getColor(),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: AppColors.lightPrimary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      notification.message.isEmpty ? notification.type : notification.message,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      notification.createdAt ?? '',
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: onToggleRead,
                child: Text(isRead ? 'Mark Unread' : 'Mark Read'),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: onDelete,
                child: Text('Delete'),
              ),
              if (notification.type.toLowerCase().startsWith('refund') && (notification.referenceId ?? '').isNotEmpty) ...[
                const SizedBox(width: 8),
                TextButton(
                  onPressed: onOpen,
                  child: const Text('Open'),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

