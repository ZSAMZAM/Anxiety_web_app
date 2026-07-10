import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/cards.dart';
import '../../core/widgets/safe_image.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/doctor_provider.dart';

class DoctorProfileScreen extends StatefulWidget {
  final String doctorId;

  const DoctorProfileScreen({
    Key? key,
    required this.doctorId,
  }) : super(key: key);

  @override
  State<DoctorProfileScreen> createState() =>
      _DoctorProfileScreenState();
}

class _DoctorProfileScreenState extends State<DoctorProfileScreen> {
  int _selectedAvailabilityWeekday = DateTime.now().weekday;
  bool _assessmentChecked = false;
  bool _hasAssessment = false;
  bool _hasAnyAssessment = false;
  String _assessmentMessage = 'Complete your mental health assessment before booking a therapist.';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DoctorProvider>().getDoctorById(widget.doctorId);
      _loadAssessmentStatus();
    });
  }

  Future<void> _loadAssessmentStatus() async {
    try {
      final response = await context.read<ApiService>().get(AppConstants.historyEndpoint);
      final data = response.data as Map<String, dynamic>? ?? {};
      if (!mounted) return;
      setState(() {
        _hasAssessment = data['can_book_therapist'] == true;
        _hasAnyAssessment = data['has_assessment'] == true || ((data['history'] as List<dynamic>? ?? []).isNotEmpty);
        _assessmentMessage = data['booking_message']?.toString() ??
            'Complete your mental health assessment before booking a therapist.';
        _assessmentChecked = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _hasAssessment = false;
        _hasAnyAssessment = false;
        _assessmentMessage = 'Complete your mental health assessment before booking a therapist.';
        _assessmentChecked = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.doctorProfile),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Consumer<DoctorProvider>(
        builder: (context, doctorProvider, _) {
          final doctor = doctorProvider.selectedDoctor;

          if (doctorProvider.isLoading) {
            return Center(
              child: CircularProgressIndicator(),
            );
          }

          if (doctor == null) {
            return Center(
              child: Text('Doctor not found'),
            );
          }
          final selectedDate = _nextDateForWeekday(_selectedAvailabilityWeekday);
          final selectedDayOpen = doctor.isAvailableOn(selectedDate);
          final activeDoctor = doctor.status.trim().toUpperCase() == 'ACTIVE';
          final canBook = _assessmentChecked && _hasAssessment && activeDoctor && selectedDayOpen;
          final unavailableMessage = !_assessmentChecked
              ? 'Checking assessment status...'
              : !_hasAnyAssessment
                  ? 'Complete your mental health assessment before booking a therapist.'
                  : !_hasAssessment
                      ? (_assessmentMessage == 'Complete your mental health assessment before booking a therapist.'
                          ? 'Your latest assessment does not recommend therapist booking. View your assessment history for details.'
                          : _assessmentMessage)
                  : !activeDoctor
                      ? 'This doctor is currently unavailable.'
                      : 'This doctor is not available on ${_weekdayName(_selectedAvailabilityWeekday)}.';

          return RefreshIndicator(
            onRefresh: () => doctorProvider.getDoctorById(widget.doctorId),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                children: [
                // Doctor Image Header
                Container(
                  width: double.infinity,
                  height: 300,
                  color: AppColors.lightBorder,
                  child: SafeImage(
                    url: doctor.photo,
                    fit: BoxFit.cover,
                    fallback: Icon(
                      Icons.person,
                      size: 100,
                      color: AppColors.lightGrey,
                    ),
                  ),
                ),
                // Details Card
                Transform.translate(
                  offset: Offset(0, -30),
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: CustomCard(
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment:
                                MainAxisAlignment
                                    .spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    doctor.name,
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineMedium,
                                  ),
                                  Text(
                                    doctor.specialization,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium,
                                  ),
                                ],
                              ),
                              Container(
                                padding: EdgeInsets
                                    .symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors
                                      .lightWarning
                                      .withOpacity(0.1),
                                  borderRadius:
                                      BorderRadius
                                          .circular(8),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.star,
                                      size: 16,
                                      color: AppColors
                                          .lightWarning,
                                    ),
                                    const SizedBox(
                                      width: 4,
                                    ),
                                    Text(
                                      doctor.rating.toStringAsFixed(1),
                                      style:
                                          TextStyle(
                                            color: AppColors
                                                .lightWarning,
                                            fontWeight:
                                                FontWeight
                                                    .w600,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment:
                                MainAxisAlignment
                                    .spaceAround,
                            children: [
                              _InfoItem(
                                label: 'Hospital',
                                value: doctor.hospital,
                              ),
                              _InfoItem(
                                label: 'Experience',
                                value:
                                    '${doctor.experience} years',
                              ),
                              _InfoItem(
                                label: 'Fee',
                                value:
                                    '\$${doctor.fee.toStringAsFixed(2)} USD',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      Text(
                        'About',
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        doctor.biography?.isNotEmpty == true
                            ? doctor.biography!
                            : 'Biography has not been added for this therapist.',
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium,
                      ),
                      const SizedBox(height: 24),
                      CustomCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Patient Reviews', style: Theme.of(context).textTheme.headlineSmall),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Text(
                                  '★★★★★',
                                  style: TextStyle(color: AppColors.lightWarning, fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${doctor.rating.toStringAsFixed(1)}/5',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              doctor.reviewCount > 0
                                  ? 'Based on ${doctor.reviewCount} reviews'
                                  : 'No patient reviews yet',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            if (doctor.recentReviews.isNotEmpty) ...[
                              const SizedBox(height: 16),
                              Text('Recent Reviews', style: Theme.of(context).textTheme.titleMedium),
                              const SizedBox(height: 10),
                              ...doctor.recentReviews.take(3).map((review) {
                                final feedback = review['feedback']?.toString() ?? '';
                                final rating = review['rating']?.toString() ?? '';
                                if (feedback.trim().isEmpty) return const SizedBox.shrink();
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(Icons.star_rounded, size: 18, color: AppColors.lightWarning),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          '$rating/5 - $feedback',
                                          style: Theme.of(context).textTheme.bodyMedium,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      CustomCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _DetailLine(label: 'Hospital / Clinic', value: doctor.hospital),
                            _DetailLine(label: 'City', value: doctor.city),
                            _DetailLine(label: 'District', value: doctor.district),
                            _DetailLine(label: 'Clinic Location', value: doctor.location),
                            _DetailLine(label: 'Consultation Fee', value: '\$${doctor.fee.toStringAsFixed(2)} USD'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      CustomCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Weekly Availability',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 12),
                            DropdownButtonFormField<int>(
                              value: _selectedAvailabilityWeekday,
                              decoration: InputDecoration(
                                labelText: 'Availability',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                              ),
                              icon: const Icon(Icons.keyboard_arrow_down),
                              items: List.generate(7, (index) {
                                final weekday = index + 1;
                                return DropdownMenuItem<int>(
                                  value: weekday,
                                  child: Text(_weekdayName(weekday)),
                                );
                              }),
                              onChanged: (value) {
                                if (value == null) return;
                                setState(() {
                                  _selectedAvailabilityWeekday = value;
                                });
                              },
                            ),
                            const SizedBox(height: 12),
                            Builder(
                              builder: (context) {
                                return _ScheduleRow(
                                  day: _weekdayName(
                                    _selectedAvailabilityWeekday,
                                  ),
                                  date: selectedDate,
                                  slots: doctor.slotsForDate(selectedDate),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      if (canBook)
                        GradientButton(
                          label: AppStrings
                              .bookAppointment,
                          onPressed: () {
                            context.push(
                              '/booking',
                              extra: doctor.id,
                            );
                          },
                        )
                      else
                        CustomCard(
                          backgroundColor: AppColors.lightWarning.withOpacity(0.10),
                          border: Border.all(
                            color: AppColors.lightWarning.withOpacity(0.28),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.info_rounded,
                                color: AppColors.lightWarning,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      unavailableMessage,
                                      style: Theme.of(context).textTheme.titleMedium,
                                    ),
                                    if (_assessmentChecked && (!_hasAssessment || !selectedDayOpen || !activeDoctor)) ...[
                                      const SizedBox(height: 12),
                                      OutlinedButton(
                                        onPressed: () {
                                          if (!_hasAnyAssessment) {
                                            context.push('/assessment');
                                          } else if (!_hasAssessment) {
                                            context.push('/prediction_history');
                                          } else {
                                            context.push('/doctors');
                                          }
                                        },
                                        child: Text(
                                          !_hasAnyAssessment
                                              ? 'Start Assessment'
                                              : !_hasAssessment
                                                  ? 'View History'
                                                  : 'Choose Another Doctor',
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _DetailLine extends StatelessWidget {
  final String label;
  final String value;

  const _DetailLine({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    if (value.trim().isEmpty) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoItem extends StatelessWidget {
  final String label;
  final String value;

  const _InfoItem({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(
                color: AppColors.lightPrimary,
              ),
        ),
      ],
    );
  }
}

class _ScheduleRow extends StatelessWidget {
  final String day;
  final DateTime date;
  final List<Map<String, String>> slots;

  const _ScheduleRow({
    required this.day,
    required this.date,
    required this.slots,
  });

  @override
  Widget build(BuildContext context) {
    final isClosed = slots.isEmpty;
    final isToday = _isSameDate(date, DateTime.now());
    final activeSlots = isToday
        ? slots.where((slot) => !_isSlotEndedToday(slot['end'] ?? '')).toList()
        : slots;
    final isTimeOver = isToday && slots.isNotEmpty && activeSlots.isEmpty;
    final value = isClosed
        ? 'Closed'
        : isTimeOver
            ? "today's time is over"
            : activeSlots.map((slot) => '${slot['start']} - ${slot['end']}').join(', ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(day, style: Theme.of(context).textTheme.bodyLarge),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isClosed || isTimeOver ? AppColors.lightDanger : null,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

bool _isSameDate(DateTime left, DateTime right) {
  return left.year == right.year && left.month == right.month && left.day == right.day;
}

bool _isSlotEndedToday(String endTime) {
  final parts = endTime.split(':');
  if (parts.length < 2) return false;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return false;
  final now = DateTime.now();
  final slotEnd = DateTime(now.year, now.month, now.day, hour, minute);
  return !slotEnd.isAfter(now);
}

DateTime _nextDateForWeekday(int weekday) {
  final today = DateTime.now();
  final delta = (weekday - today.weekday) % 7;
  return DateTime(today.year, today.month, today.day).add(Duration(days: delta));
}

String _weekdayName(int weekday) {
  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return days[weekday - 1];
}
