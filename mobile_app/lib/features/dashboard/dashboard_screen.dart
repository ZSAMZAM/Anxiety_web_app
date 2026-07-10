import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/network/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/dashboard_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/safe_image.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadDashboard();
    });
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        context.read<DashboardProvider>().loadDashboard(silent: true);
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
      context.read<DashboardProvider>().loadDashboard(silent: true);
    }
  }

  Future<void> _refresh() {
    return context.read<DashboardProvider>().loadDashboard();
  }

  void _openTab(int index) {
    setState(() => _currentIndex = index);
    switch (index) {
      case 1:
        context.push('/assessment');
        break;
      case 2:
        context.push('/appointment_history');
        break;
      case 3:
        context.push('/notifications');
        break;
      case 4:
        context.push('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardProvider>();
    final user = context.watch<AuthProvider>().user;

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? AppColors.darkCalmGradient
                : AppColors.calmGradient,
          ),
        ),
        child: SafeArea(
          child: dashboard.isLoading
              ? const _DashboardSkeleton()
              : RefreshIndicator(
                  onRefresh: _refresh,
                  child: LayoutBuilder(
                  builder: (context, constraints) {
                    final maxWidth = constraints.maxWidth >= 900 ? 1040.0 : double.infinity;
                    return ListView(
                      padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
                      children: [
                        Center(
                          child: ConstrainedBox(
                            constraints: BoxConstraints(maxWidth: maxWidth),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _DashboardHeader(
                                  name: _displayName(user?.fullName, user?.username),
                                  avatarUrl: user?.avatar,
                                  unreadCount: dashboard.unreadNotifications,
                                ),
                                const SizedBox(height: 10),
                                if (dashboard.error != null) ...[
                                  _FriendlyErrorCard(onRetry: _refresh),
                                  const SizedBox(height: 10),
                                ],
                                _MentalHealthStatusCard(provider: dashboard),
                                const SizedBox(height: 10),
                                _StatsGrid(provider: dashboard),
                                const SizedBox(height: 12),
                                _QuickActions(provider: dashboard),
                                const SizedBox(height: 12),
                                _UpcomingAppointmentCard(provider: dashboard),
                                const SizedBox(height: 12),
                                _RecommendedTherapists(provider: dashboard),
                                const SizedBox(height: 12),
                                _WellnessTips(provider: dashboard),
                                const SizedBox(height: 12),
                                _RecentPredictionHistory(provider: dashboard),
                                const SizedBox(height: 12),
                                _NotificationsPreview(provider: dashboard),
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                  ),
                ),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkCard.withOpacity(0.96) : Colors.white.withOpacity(0.96),
              border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.30 : 0.10),
                  blurRadius: 24,
                  spreadRadius: -12,
                  offset: const Offset(0, -8),
                ),
              ],
            ),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: _openTab,
              type: BottomNavigationBarType.fixed,
              iconSize: 22,
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Home'),
                BottomNavigationBarItem(icon: Icon(Icons.psychology_rounded), label: 'Assess'),
                BottomNavigationBarItem(icon: Icon(Icons.event_rounded), label: 'Bookings'),
                BottomNavigationBarItem(icon: Icon(Icons.notifications_rounded), label: 'Alerts'),
                BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DashboardHeader extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  final int unreadCount;

  const _DashboardHeader({
    required this.name,
    required this.avatarUrl,
    required this.unreadCount,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      children: [
        _Avatar(url: avatarUrl, name: name, size: 48),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hello, $name',
                style: Theme.of(context).textTheme.headlineMedium,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 3),
              Text(
                _formattedToday(),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            _IconButtonSurface(
              icon: Icons.notifications_rounded,
              onTap: () => context.push('/notifications'),
            ),
            if (unreadCount > 0)
              Positioned(
                right: -2,
                top: -4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.lightDanger,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
                      width: 2,
                    ),
                  ),
                  child: Text(
                    unreadCount > 9 ? '9+' : unreadCount.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(width: 8),
        _IconButtonSurface(
          icon: Icons.person_rounded,
          onTap: () => context.push('/profile'),
        ),
      ],
    );
  }
}

class _MentalHealthStatusCard extends StatelessWidget {
  final DashboardProvider provider;

  const _MentalHealthStatusCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final prediction = provider.latestPrediction;
    final status = _statusLabel(prediction?.status);
    final statusColor = _statusColor(status);
    final confidence = provider.latestConfidence.clamp(0, 100);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard.withOpacity(0.94) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.22 : 0.06),
            blurRadius: 20,
            spreadRadius: -8,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppColors.lightPrimary.withOpacity(isDark ? 0.16 : 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.health_and_safety_rounded, color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Mental Health Status',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                      ),
                ),
              ),
              _Pill(label: _riskLevel(status), color: statusColor.withOpacity(0.12), textColor: statusColor),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            status,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                'Confidence $confidence%',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const Spacer(),
              Text(
                prediction == null ? 'Not assessed' : _formatDate(prediction.date),
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: confidence / 100,
                    minHeight: 5,
                    backgroundColor: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '$confidence%',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _GradientCardButton(
                label: 'New Assessment',
                icon: Icons.psychology_rounded,
                onTap: () => context.push('/assessment'),
              ),
              if (provider.hasAssessment)
                _GradientCardButton(
                  label: 'View History',
                  icon: Icons.timeline_rounded,
                  onTap: () => context.push('/prediction_history'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final DashboardProvider provider;

  const _StatsGrid({required this.provider});

  @override
  Widget build(BuildContext context) {
    final stats = [
      _StatData('Total Assessments', provider.totalPredictions, Icons.assignment_turned_in_rounded, AppColors.lightPrimary),
      _StatData('Anxiety Detections', provider.anxietyDetections, Icons.warning_amber_rounded, AppColors.lightWarning),
      _StatData('Depression Detections', provider.depressionDetections, Icons.health_and_safety_rounded, AppColors.lightDanger),
      _StatData('Therapy Sessions', provider.therapySessions, Icons.event_available_rounded, AppColors.lightSuccess),
    ];

    return _ResponsiveGrid(
      minTileWidth: 148,
      spacing: 10,
      children: stats
          .map(
            (stat) => _PremiumSurface(
              padding: const EdgeInsets.all(11),
              child: Row(
                children: [
                  _TintedIcon(icon: stat.icon, color: stat.color),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stat.value.toString(),
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          stat.label,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _QuickActions extends StatelessWidget {
  final DashboardProvider provider;

  const _QuickActions({required this.provider});

  @override
  Widget build(BuildContext context) {
    final actions = [
      _ActionData('Start Assessment', Icons.psychology_rounded, AppColors.lightPrimary, () => context.push('/assessment')),
      if (provider.hasTreatmentPlan)
        _ActionData('Treatment Plan', Icons.assignment_turned_in_rounded, AppColors.lightSuccess, () => context.push('/treatment_plan'))
      else if (provider.canBookTherapist)
        _ActionData('Book Therapist', Icons.medical_services_rounded, AppColors.lightAccent, () => context.push('/doctors')),
      if (provider.hasAppointments)
        _ActionData('My Appointments', Icons.event_note_rounded, AppColors.lightSuccess, () => context.push('/appointment_history')),
      if (provider.latestResultIsHealthy)
        _ActionData('Recommendations', Icons.spa_rounded, AppColors.lightSecondary, () => context.push('/recommendations')),
      if (provider.hasAssessment)
        _ActionData('Prediction History', Icons.timeline_rounded, AppColors.lightWarning, () => context.push('/prediction_history')),
      _ActionData('Profile', Icons.person_rounded, AppColors.lightAccent, () => context.push('/profile')),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(title: 'Quick Actions'),
        const SizedBox(height: 12),
        if (!provider.hasAssessment) ...[
          _PremiumSurface(
            child: _EmptyState(
              icon: Icons.psychology_rounded,
              title: 'Complete your mental health assessment before booking a therapist.',
              message: 'Start with an assessment so AnxietyCare can guide the next step.',
              actionLabel: 'Start Assessment',
              onAction: () => context.push('/assessment'),
            ),
          ),
          const SizedBox(height: 12),
        ],
        _ResponsiveGrid(
          minTileWidth: 128,
          spacing: 10,
          children: actions
              .map(
                (action) => _AnimatedActionCard(
                  title: action.title,
                  icon: action.icon,
                  color: action.color,
                  onTap: action.onTap,
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

class _UpcomingAppointmentCard extends StatelessWidget {
  final DashboardProvider provider;

  const _UpcomingAppointmentCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final appointment = provider.nextAppointment;
    final doctor = _findDoctor(provider.recommendedDoctors, appointment);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(title: 'Upcoming Appointment'),
        const SizedBox(height: 12),
        _PremiumSurface(
          child: appointment == null
              ? _EmptyState(
                  icon: Icons.event_busy_rounded,
                  title: 'No upcoming appointments',
                  message: 'Appointments will appear here after a professional-support assessment and booking.',
                  actionLabel: 'View Assessment History',
                  onAction: () => context.push('/prediction_history'),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _Avatar(
                          url: doctor?.photo,
                          name: doctor?.name ?? appointment.doctorName,
                          size: 64,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _fallback(appointment.doctorName, doctor?.name ?? 'Therapist'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              const SizedBox(height: 3),
                              Text(
                                _fallback(doctor?.specialization, 'Specialty not listed'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              const SizedBox(height: 7),
                              _StatusBadge(label: _fallback(appointment.status, 'Pending')),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _InfoRow(icon: Icons.calendar_today_rounded, text: _formatDate(appointment.date)),
                    const SizedBox(height: 8),
                    _InfoRow(icon: Icons.schedule_rounded, text: _fallback(appointment.time, 'Time not assigned')),
                    const SizedBox(height: 8),
                    _InfoRow(
                      icon: Icons.local_hospital_rounded,
                      text: _fallback(doctor?.hospital, 'Clinic details not listed'),
                    ),
                    const SizedBox(height: 14),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton.icon(
                        onPressed: () => context.push('/appointment_history'),
                        icon: const Icon(Icons.open_in_new_rounded, size: 18),
                        label: const Text('View Details'),
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _RecommendedTherapists extends StatelessWidget {
  final DashboardProvider provider;

  const _RecommendedTherapists({required this.provider});

  @override
  Widget build(BuildContext context) {
    final doctors = provider.recommendedDoctors;
    if (!provider.canBookTherapist) {
      return _PremiumSurface(
        child: _EmptyState(
          icon: Icons.medical_services_rounded,
          title: provider.hasAssessment
              ? 'Therapist booking is not needed for your latest result'
              : 'Complete your mental health assessment before booking a therapist.',
          message: provider.hasAssessment
              ? 'Healthy results keep you focused on recommendations and assessment history.'
              : 'Start an assessment first, then booking opens only if professional support is recommended.',
          actionLabel: provider.hasAssessment ? 'View History' : 'Start Assessment',
          onAction: () => provider.hasAssessment
              ? context.push('/prediction_history')
              : context.push('/assessment'),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: 'Recommended Therapists',
          actionLabel: 'View All',
          onAction: () => context.push('/doctors'),
        ),
        const SizedBox(height: 12),
        if (doctors.isEmpty)
          _PremiumSurface(
            child: _EmptyState(
              icon: Icons.medical_information_rounded,
              title: 'No therapists available',
              message: 'Available therapists from the backend will appear here.',
              actionLabel: 'Refresh',
              onAction: () => context.read<DashboardProvider>().loadDashboard(),
            ),
          )
        else
          SizedBox(
            height: 238,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: doctors.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (context, index) => _TherapistCard(doctor: doctors[index]),
            ),
          ),
      ],
    );
  }
}

class _WellnessTips extends StatelessWidget {
  final DashboardProvider provider;

  const _WellnessTips({required this.provider});

  @override
  Widget build(BuildContext context) {
    final tips = provider.recommendations;
    if (!provider.latestResultIsHealthy) {
      return _PremiumSurface(
        child: _EmptyState(
          icon: provider.canBookTherapist ? Icons.medical_information_rounded : Icons.spa_rounded,
          title: provider.canBookTherapist
              ? 'Professional support is recommended'
              : 'Wellness recommendations appear after a healthy assessment',
          message: provider.canBookTherapist
              ? 'Book a therapist to continue with professional care.'
              : 'Complete your mental health assessment before viewing recommendations.',
          actionLabel: provider.hasTreatmentPlan ? 'View Treatment Plan' : provider.canBookTherapist ? 'Book Therapist' : 'Start Assessment',
          onAction: () => provider.hasTreatmentPlan
              ? context.push('/treatment_plan')
              : provider.canBookTherapist
              ? context.push('/doctors')
              : context.push('/assessment'),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: 'Wellness Tips',
          actionLabel: 'Open',
          onAction: () => context.push('/recommendations'),
        ),
        const SizedBox(height: 12),
        if (tips.isEmpty)
          _PremiumSurface(
            child: _EmptyState(
              icon: Icons.spa_rounded,
              title: 'Wellness guidance is ready after an assessment',
              message: 'Take an assessment to load personalized recommendations from the backend.',
              actionLabel: 'Start Assessment',
              onAction: () => context.push('/assessment'),
            ),
          )
        else
          Column(
            children: tips
                .take(3)
                .map(
                  (tip) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _PremiumSurface(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _TintedIcon(icon: Icons.self_improvement_rounded, color: AppColors.lightSuccess),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _fallback(tip.title, tip.category.isNotEmpty ? tip.category : 'Wellness Tip'),
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  _fallback(tip.description, 'Recommendation details were not included.'),
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}

class _RecentPredictionHistory extends StatelessWidget {
  final DashboardProvider provider;

  const _RecentPredictionHistory({required this.provider});

  @override
  Widget build(BuildContext context) {
    final predictions = provider.recentPredictions;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: 'Recent Prediction History',
          actionLabel: 'View All History',
          onAction: () => context.push('/prediction_history'),
        ),
        const SizedBox(height: 12),
        _PremiumSurface(
          child: predictions.isEmpty
              ? _EmptyState(
                  icon: Icons.insights_rounded,
                  title: 'No predictions yet',
                  message: 'Your latest five assessment results will appear here.',
                  actionLabel: 'Take Assessment',
                  onAction: () => context.push('/assessment'),
                )
              : Column(
                  children: predictions
                      .take(5)
                      .map(
                        (prediction) => _PredictionRow(prediction: prediction),
                      )
                      .toList(),
                ),
        ),
      ],
    );
  }
}

class _NotificationsPreview extends StatelessWidget {
  final DashboardProvider provider;

  const _NotificationsPreview({required this.provider});

  @override
  Widget build(BuildContext context) {
    final notifications = provider.notifications;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: 'Notifications Preview',
          actionLabel: 'View All',
          onAction: () => context.push('/notifications'),
        ),
        const SizedBox(height: 12),
        _PremiumSurface(
          child: notifications.isEmpty
              ? _EmptyState(
                  icon: Icons.notifications_none_rounded,
                  title: 'No notifications yet',
                  message: 'Appointment, payment, and admin updates will appear here.',
                  actionLabel: 'Refresh',
                  onAction: () => context.read<DashboardProvider>().loadDashboard(),
                )
              : Column(
                  children: notifications
                      .take(3)
                      .map((notification) => _NotificationRow(notification: notification))
                      .toList(),
                ),
        ),
      ],
    );
  }
}

class _TherapistCard extends StatelessWidget {
  final DoctorModel doctor;

  const _TherapistCard({required this.doctor});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: _PremiumSurface(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _Avatar(url: doctor.photo, name: doctor.name, size: 54),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _fallback(doctor.name, 'Therapist'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _fallback(doctor.specialization, 'Specialty not listed'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _InfoRow(icon: Icons.star_rounded, text: doctor.rating > 0 ? doctor.rating.toStringAsFixed(1) : 'Rating not listed'),
            const SizedBox(height: 7),
            _InfoRow(icon: Icons.payments_rounded, text: doctor.fee > 0 ? '\$${doctor.fee.toStringAsFixed(2)}' : 'Fee not listed'),
            const SizedBox(height: 7),
            _InfoRow(icon: Icons.local_hospital_rounded, text: _fallback(doctor.hospital, 'Clinic not listed')),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => context.push('/doctor_profile', extra: doctor.id),
                child: const Text('Book Now'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PredictionRow extends StatelessWidget {
  final PredictionModel prediction;

  const _PredictionRow({required this.prediction});

  @override
  Widget build(BuildContext context) {
    final confidence = prediction.details['confidence'] is num
        ? (prediction.details['confidence'] as num).round().clamp(0, 100)
        : 0;
    final status = _statusLabel(prediction.status);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          _TintedIcon(icon: Icons.analytics_rounded, color: _statusColor(status)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(status, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 3),
                Text(_formatDate(prediction.date), style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
          _Pill(label: '$confidence%', color: _statusColor(status).withOpacity(0.12), textColor: _statusColor(status)),
        ],
      ),
    );
  }
}

class _NotificationRow extends StatelessWidget {
  final NotificationModel notification;

  const _NotificationRow({required this.notification});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _TintedIcon(
            icon: notification.isRead ? Icons.notifications_none_rounded : Icons.notifications_active_rounded,
            color: notification.isRead ? AppColors.lightGrey : AppColors.lightAccent,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _fallback(notification.title, 'Notification'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 3),
                Text(
                  _fallback(notification.message, 'No message details were included.'),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 3),
                Text(_formatDate(notification.date), style: Theme.of(context).textTheme.labelSmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AnimatedActionCard extends StatefulWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _AnimatedActionCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  State<_AnimatedActionCard> createState() => _AnimatedActionCardState();
}

class _AnimatedActionCardState extends State<_AnimatedActionCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      child: AnimatedScale(
        duration: const Duration(milliseconds: 130),
        scale: _pressed ? 0.97 : 1,
        child: _PremiumSurface(
          padding: const EdgeInsets.all(11),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _TintedIcon(icon: widget.icon, color: widget.color),
              const SizedBox(height: 9),
              Text(
                widget.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PremiumSurface extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;

  const _PremiumSurface({
    required this.child,
    this.padding = const EdgeInsets.all(14),
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.18 : 0.06),
            blurRadius: 18,
            spreadRadius: -8,
            offset: const Offset(0, 9),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _ResponsiveGrid extends StatelessWidget {
  final double minTileWidth;
  final double spacing;
  final List<Widget> children;

  const _ResponsiveGrid({
    required this.minTileWidth,
    required this.spacing,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final count = (constraints.maxWidth / minTileWidth).floor().clamp(2, 4).toInt();
        final width = (constraints.maxWidth - (spacing * (count - 1))) / count;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: children.map((child) => SizedBox(width: width, child: child)).toList(),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _TintedIcon(icon: icon, color: AppColors.lightAccent, size: 38),
        const SizedBox(height: 10),
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 6),
        Text(message, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 10),
        FilledButton.icon(
          onPressed: onAction,
          icon: const Icon(Icons.arrow_forward_rounded, size: 18),
          label: Text(actionLabel),
        ),
      ],
    );
  }
}

class _FriendlyErrorCard extends StatelessWidget {
  final Future<void> Function() onRetry;

  const _FriendlyErrorCard({
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return _PremiumSurface(
      child: Row(
        children: [
          _TintedIcon(icon: Icons.cloud_off_rounded, color: AppColors.lightDanger),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'We could not refresh everything right now. Please try again.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
          TextButton(onPressed: () => onRetry(), child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? AppColors.darkCard : AppColors.lightBorder;
    final highlight = isDark ? AppColors.darkBorder : Colors.white;
    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: highlight,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: 8,
        separatorBuilder: (_, __) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          return Container(
            height: index == 0 ? 56 : (index == 1 ? 156 : 92),
            decoration: BoxDecoration(
              color: base,
              borderRadius: BorderRadius.circular(18),
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _SectionHeader({
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
        if (actionLabel != null && onAction != null)
          TextButton(onPressed: onAction, child: Text(actionLabel!)),
      ],
    );
  }
}

class _IconButtonSurface extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _IconButtonSurface({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: isDark ? AppColors.darkCard : Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
          child: Icon(icon),
        ),
      ),
    );
  }
}

class _TintedIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;

  const _TintedIcon({
    required this.icon,
    required this.color,
    this.size = 36,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Icon(icon, color: color, size: size * 0.52),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String? url;
  final String name;
  final double size;

  const _Avatar({
    required this.url,
    required this.name,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    final initials = _initials(name);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: AppColors.primaryGradient),
        borderRadius: BorderRadius.circular(size / 2.8),
      ),
      clipBehavior: Clip.antiAlias,
      child: SafeImage(
        url: url,
        fit: BoxFit.cover,
        fallback: Center(child: Text(initials, style: _avatarStyle(size))),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final Color color;
  final Color textColor;

  const _Pill({
    required this.label,
    required this.color,
    required this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;

  const _StatusBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    final normalized = label.toLowerCase();
    final color = normalized.contains('confirm') || normalized.contains('complete')
        ? AppColors.lightSuccess
        : normalized.contains('pending')
            ? AppColors.lightWarning
            : normalized.contains('cancel')
                ? AppColors.lightDanger
                : AppColors.lightPrimary;
    return _Pill(label: _fallback(label, 'Pending'), color: color.withOpacity(0.12), textColor: color);
  }
}

class _GradientCardButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _GradientCardButton({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: isDark ? AppColors.darkSecondaryCard : AppColors.lightSoftBlue,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary, size: 17),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoRow({
    required this.icon,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 17, color: AppColors.lightGrey),
        const SizedBox(width: 7),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}

class _StatData {
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  _StatData(this.label, this.value, this.icon, this.color);
}

class _ActionData {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  _ActionData(this.title, this.icon, this.color, this.onTap);
}

String _displayName(String? fullName, String? username) {
  final name = _fallback(fullName, _fallback(username, 'Patient'));
  return name.length > 24 ? name.substring(0, 24) : name;
}

String _fallback(String? value, String fallback) {
  final text = value?.trim() ?? '';
  return text.isEmpty ? fallback : text;
}

String _formattedToday() {
  return _formatDate(DateTime.now());
}

String _formatDate(DateTime date) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${months[date.month - 1]} ${date.day}, ${date.year}';
}

String _statusLabel(String? value) {
  final normalized = value?.trim().toLowerCase() ?? '';
  if (normalized.contains('depression')) return 'Depression';
  if (normalized.contains('anxiety')) return 'Anxiety';
  if (normalized.contains('normal')) return 'Normal';
  if (normalized.contains('neutral')) return 'Neutral';
  return 'No Assessment Yet';
}

String _riskLevel(String status) {
  final normalized = status.toLowerCase();
  if (normalized.contains('depression')) return 'High Risk';
  if (normalized.contains('anxiety')) return 'Moderate Risk';
  if (normalized.contains('normal') || normalized.contains('neutral')) return 'Low Risk';
  return 'Not Analyzed';
}

Color _statusColor(String status) {
  final normalized = status.toLowerCase();
  if (normalized.contains('depression')) return AppColors.lightDanger;
  if (normalized.contains('anxiety')) return AppColors.lightWarning;
  if (normalized.contains('normal') || normalized.contains('neutral')) return AppColors.lightSuccess;
  return AppColors.lightPrimary;
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((part) => part.isNotEmpty).toList();
  if (parts.isEmpty) return 'P';
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'.toUpperCase();
}

TextStyle _avatarStyle(double size) {
  return TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w900,
    fontSize: size * 0.32,
  );
}

DoctorModel? _findDoctor(List<DoctorModel> doctors, AppointmentModel? appointment) {
  if (appointment == null) return null;
  for (final doctor in doctors) {
    if (doctor.id == appointment.doctorId) return doctor;
    if (doctor.name.toLowerCase() == appointment.doctorName.toLowerCase()) return doctor;
  }
  return null;
}
