import 'package:flutter/material.dart';
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
            statusColor: statusColor,
            status: apt.status,
          );
        },
      ),
    );
  }
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
        onTap: () => _showDetails(context),
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
              Row(
                children: [
                  Icon(Icons.star_rounded, size: 18, color: AppColors.lightWarning),
                  const SizedBox(width: 6),
                  Text('You rated this session ${appointment.rating ?? 0}/5'),
                ],
              ),
            ] else if (appointment.canRate) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                icon: const Icon(Icons.star_rate_rounded),
                label: const Text('Rate Session'),
                onPressed: () => _showRatingDialog(context),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showDetails(BuildContext context) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Appointment Details', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 16),
            _Detail(label: 'Doctor', value: appointment.doctorName),
            _Detail(label: 'Date', value: appointment.date),
            _Detail(label: 'Time', value: appointment.time),
            _Detail(label: 'Phone', value: appointment.phone),
            _Detail(label: 'Status', value: appointment.status),
            if (appointment.hasRating) _Detail(label: 'Your Rating', value: '${appointment.rating ?? 0}/5'),
            if ((appointment.ratingComment ?? '').isNotEmpty) _Detail(label: 'Comment', value: appointment.ratingComment!),
            if (appointment.notes.isNotEmpty) _Detail(label: 'Notes', value: appointment.notes),
            if (appointment.canRate) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.star_rate_rounded),
                  label: const Text('Rate Session'),
                  onPressed: () {
                    Navigator.pop(context);
                    _showRatingDialog(context);
                  },
                ),
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

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Rate Your Session'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('How was your completed session with $doctor?'),
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
              const SizedBox(height: 12),
              TextField(
                controller: commentController,
                maxLines: 3,
                maxLength: 1000,
                decoration: const InputDecoration(
                  labelText: 'Comment optional',
                  hintText: 'Share your feedback',
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
                          ? 'Thank you for rating your session.'
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

class _Detail extends StatelessWidget {
  final String label;
  final String value;

  const _Detail({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyLarge)),
        ],
      ),
    );
  }
}

