import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/cards.dart';
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
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DoctorProvider>().getDoctorById(widget.doctorId);
    });
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
                  child: doctor.photo != null
                      ? Image.network(
                          doctor.photo!,
                          fit: BoxFit.cover,
                        )
                      : Icon(
                          Icons.person,
                          size: 100,
                          color: AppColors.lightGrey,
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
                                      doctor.rating
                                          .toString(),
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
                                    '\$${doctor.fee}',
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
                            _DetailLine(label: 'Hospital / Clinic', value: doctor.hospital),
                            _DetailLine(label: 'City', value: doctor.city),
                            _DetailLine(label: 'District', value: doctor.district),
                            _DetailLine(label: 'Clinic Location', value: doctor.location),
                            _DetailLine(label: 'Consultation Fee', value: '\$${doctor.fee.toStringAsFixed(2)}'),
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
                            ...List.generate(7, (index) {
                              final date = _nextDateForWeekday(index + 1);
                              final slots = doctor.slotsForDate(date);
                              return _ScheduleRow(
                                day: _weekdayName(index + 1),
                                slots: slots,
                              );
                            }),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      GradientButton(
                        label: AppStrings
                            .bookAppointment,
                        onPressed: () {
                          context.push(
                            '/booking',
                            extra: doctor.id,
                          );
                        },
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
  final List<Map<String, String>> slots;

  const _ScheduleRow({
    required this.day,
    required this.slots,
  });

  @override
  Widget build(BuildContext context) {
    final isClosed = slots.isEmpty;
    final value = isClosed
        ? 'Closed'
        : slots.map((slot) => '${slot['start']} - ${slot['end']}').join(', ');
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
                    color: isClosed ? AppColors.lightDanger : null,
                  ),
            ),
          ),
        ],
      ),
    );
  }
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
