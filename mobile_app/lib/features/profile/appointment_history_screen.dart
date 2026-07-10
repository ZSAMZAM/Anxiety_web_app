import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/cards.dart';
import '../../providers/appointment_provider.dart';
import '../../models/appointment_model.dart';

class AppointmentHistoryScreen extends StatefulWidget {
  const AppointmentHistoryScreen({Key? key}) : super(key: key);

  @override
  State<AppointmentHistoryScreen> createState() => _AppointmentHistoryScreenState();
}

class _AppointmentHistoryScreenState extends State<AppointmentHistoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppointmentProvider>().loadAppointments();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<AppointmentModel> _filterAppointments(List<AppointmentModel> items, List<String> statuses) {
    return items.where((appointment) => statuses.contains(appointment.status.toLowerCase())).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.appointmentHistory),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: AppStrings.upcoming),
            Tab(text: AppStrings.completed),
            Tab(text: AppStrings.cancelled),
          ],
        ),
      ),
      body: Consumer<AppointmentProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return Center(child: CircularProgressIndicator());
          }

          final upcoming = _filterAppointments(provider.appointments, ['pending', 'pending payment', 'confirmed', 'rescheduled']);
          final completed = _filterAppointments(provider.appointments, ['completed']);
          final cancelled = _filterAppointments(provider.appointments, ['cancelled', 'rejected']);

          return TabBarView(
            controller: _tabController,
            children: [
              _buildAppointmentList(context, upcoming, AppStrings.noUpcomingAppointments, AppColors.lightPrimary, 'Upcoming', provider.loadAppointments),
              _buildAppointmentList(context, completed, AppStrings.noCompletedAppointments, AppColors.lightSuccess, 'Completed', provider.loadAppointments),
              _buildAppointmentList(context, cancelled, AppStrings.noCancelledAppointments, AppColors.lightDanger, 'Cancelled', provider.loadAppointments),
            ],
          );
        },
      ),
    );
  }

  Widget _buildAppointmentList(BuildContext context, List<AppointmentModel> appointments, String emptyLabel, Color statusColor, String status, Future<void> Function() onRefresh) {
    if (appointments.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.55,
              child: Center(child: Text(emptyLabel)),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.all(16),
        itemCount: appointments.length,
        itemBuilder: (context, index) {
          final apt = appointments[index];
          return _AppointmentCard(
            appointment: apt,
            doctor: apt.doctorName,
            date: apt.date,
            time: apt.time,
            hospital: '',
            statusColor: _statusColor(apt.effectiveStatus, statusColor),
            status: apt.effectiveStatus,
          );
        },
      ),
    );
  }
}

Color _statusColor(String status, Color fallback) {
  final value = status.toLowerCase();
  if (value.contains('reject') || value.contains('cancel')) return AppColors.lightDanger;
  if (value.contains('refund') && value.contains('pending')) return AppColors.lightWarning;
  if (value.contains('refund') && value.contains('processing')) return AppColors.lightPrimary;
  if (value.contains('refund') && value.contains('approved')) return AppColors.lightSuccess;
  if (value.contains('refund') && value.contains('completed')) return AppColors.lightSuccess;
  if (value.contains('payment')) return AppColors.lightWarning;
  return fallback;
}

class _AppointmentCard extends StatelessWidget {
  final AppointmentModel appointment;
  final String doctor;
  final String date;
  final String time;
  final String hospital;
  final Color statusColor;
  final String status;

  const _AppointmentCard({
    required this.appointment,
    required this.doctor,
    required this.date,
    required this.time,
    required this.hospital,
    required this.statusColor,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: 12),
      child: CustomCard(
        onTap: () => context.push('/appointment_details', extra: appointment),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  doctor,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 16, color: AppColors.lightGrey),
                const SizedBox(width: 8),
                Text(date),
                const SizedBox(width: 16),
                Icon(Icons.access_time, size: 16, color: AppColors.lightGrey),
                const SizedBox(width: 8),
                Text(time),
              ],
            ),
            if (appointment.isDelayed) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.lightWarning.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: AppColors.lightWarning.withOpacity(0.35)),
                ),
                child: Text(
                  'Your therapist needs additional time with the previous patient.\nOld: ${appointment.originalTime ?? time} - ${appointment.originalEndTime ?? appointment.endTime ?? ''}\nNew: ${appointment.time}${appointment.endTime?.isNotEmpty == true ? ' - ${appointment.endTime}' : ''}\nDelay: ${appointment.extensionMinutes} minutes',
                  style: TextStyle(color: AppColors.lightWarning, fontWeight: FontWeight.w700, fontSize: 12),
                ),
              ),
            ],
            if (hospital.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.location_on, size: 16, color: AppColors.lightGrey),
                  const SizedBox(width: 8),
                  Expanded(child: Text(hospital)),
                ],
              ),
            ],
            if (appointment.hasRating) ...[
              const SizedBox(height: 12),
              _SubmittedReview(appointment: appointment),
            ] else if (appointment.canRate) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                icon: const Icon(Icons.star_rate_rounded),
                label: const Text('Rate Your Doctor'),
                onPressed: () => _showRatingDialog(context),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showRatingDialog(BuildContext context) {
    var selectedRating = 5;
    final commentController = TextEditingController();
    const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Rate Your Doctor'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('How was your completed appointment with $doctor?'),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final value = index + 1;
                  return IconButton(
                    icon: Icon(
                      value <= selectedRating ? Icons.star_rounded : Icons.star_border_rounded,
                      color: AppColors.lightWarning,
                      size: 32,
                    ),
                    onPressed: () => setDialogState(() => selectedRating = value),
                  );
                }),
              ),
              Text(labels[selectedRating - 1], style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              TextField(
                controller: commentController,
                maxLines: 3,
                maxLength: 500,
                decoration: const InputDecoration(
                  labelText: 'Feedback optional',
                  hintText: 'Doctor was very helpful.',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final provider = context.read<AppointmentProvider>();
                final success = await provider.rateAppointment(
                  appointmentId: appointment.id,
                  rating: selectedRating,
                  comment: commentController.text,
                );
                if (!context.mounted) return;
                Navigator.pop(dialogContext);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      success
                          ? 'Thank you for rating your doctor.'
                          : provider.error ?? 'Unable to submit rating.',
                    ),
                  ),
                );
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    ).whenComplete(commentController.dispose);
  }
}

String _stars(int rating) {
  final value = rating.clamp(0, 5);
  return '${'★' * value}${'☆' * (5 - value)} $value/5';
}

class _SubmittedReview extends StatelessWidget {
  final AppointmentModel appointment;

  const _SubmittedReview({required this.appointment});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.lightWarning.withOpacity(0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.lightWarning.withOpacity(0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Your Rating: ${_stars(appointment.rating ?? 0)}',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.lightWarning,
                  fontWeight: FontWeight.w800,
                ),
          ),
          if ((appointment.ratingComment ?? '').isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Your Feedback: ${appointment.ratingComment!}'),
          ],
          if ((appointment.reviewCreatedAt ?? '').isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Submitted: ${appointment.reviewCreatedAt!.split('T').first}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}
