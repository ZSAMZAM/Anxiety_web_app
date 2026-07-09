import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/cards.dart';
import '../../core/widgets/text_fields.dart';
import '../../core/providers/booking_provider.dart';
import '../../core/providers/doctor_provider.dart';

class BookingScreen extends StatefulWidget {
  final String doctorId;

  const BookingScreen({Key? key, required this.doctorId}) : super(key: key);

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final _notesController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDoctorDetails();
    });
  }

  @override
  void didUpdateWidget(covariant BookingScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.doctorId != widget.doctorId) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _loadDoctorDetails();
      });
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<bool> _loadDoctorDetails() {
    if (widget.doctorId.trim().isEmpty) {
      return Future.value(false);
    }
    return context.read<DoctorProvider>().getDoctorById(widget.doctorId);
  }

  void _selectDate() async {
    final doctorProvider = context.read<DoctorProvider>();
    final selectedDoctor = doctorProvider.selectedDoctor;
    final doctor = selectedDoctor?.id == widget.doctorId
        ? selectedDoctor
        : null;
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(Duration(days: 90)),
    );

    if (date != null) {
      if (doctor != null && !doctor.isAvailableOn(date)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('The doctor is not available on this day.'),
          ),
        );
        return;
      }
      context.read<BookingProvider>().setDate(date);
    }
  }

  void _selectTime() {
    final selectedDate = context.read<BookingProvider>().selectedDate;
    if (selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an available date first.')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) {
        final doctorProvider = context.read<DoctorProvider>();
        final selectedDoctor = doctorProvider.selectedDoctor;
        final doctor = selectedDoctor?.id == widget.doctorId
            ? selectedDoctor
            : null;
        final dateKey = selectedDate.toIso8601String().split('T').first;
        final bookedTimes = doctorProvider.bookedSlots
            .where((slot) => slot['date']?.toString() == dateKey)
            .map((slot) {
              final value = slot['time']?.toString() ?? '';
              return value.length >= 5 ? value.substring(0, 5) : value;
            })
            .toSet();
        final slots = _slotOptions(doctor?.slotsForDate(selectedDate) ?? []);
        return AlertDialog(
          title: Text('Select Time'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: slots.isEmpty
                  ? [const Text('No available times for the selected date.')]
                  : slots.map((slot) {
                      final start = slot['start'] ?? '';
                      final end = slot['end'] ?? '';
                      final label = '$start - $end';
                      final isBooked = bookedTimes.contains(start);
                      final isPast = _isPastSlot(selectedDate, start);
                      final disabled = isBooked || isPast;
                      return ListTile(
                        enabled: !disabled,
                        title: Text(label),
                        subtitle: disabled
                            ? Text(isBooked ? 'Booked' : 'Past time')
                            : const Text('Available'),
                        trailing: disabled
                            ? const Icon(Icons.block)
                            : const Icon(Icons.check_circle_outline),
                        onTap: disabled
                            ? null
                            : () {
                                context.read<BookingProvider>().setTime(label);
                                Navigator.pop(context);
                              },
                      );
                    }).toList(),
            ),
          ),
        );
      },
    );
  }

  void _handleConfirmBooking() async {
    final bookingProvider = context.read<BookingProvider>();
    final doctorProvider = context.read<DoctorProvider>();
    final selectedDoctor = doctorProvider.selectedDoctor;
    final doctor = selectedDoctor?.id == widget.doctorId
        ? selectedDoctor
        : null;

    if (doctor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Doctor details are not available.')),
      );
      return;
    }

    if (bookingProvider.selectedDate == null ||
        bookingProvider.selectedTime == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Please select date and time')));
      return;
    }

    if (bookingProvider.selectedTime!.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select an available time')),
      );
      return;
    }

    final selectedDate = bookingProvider.selectedDate!;
    final startTime = bookingProvider.selectedTime!.split('-').first.trim();
    if (!doctor.isAvailableOn(selectedDate) ||
        _isPastSlot(selectedDate, startTime)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please select a valid future appointment slot.'),
        ),
      );
      return;
    }

    if (_phoneController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Please enter your phone number')));
      return;
    }

    final phonePattern = RegExp(r'^\+252(61|62|63|65|66|67|68|69|77|90)\d{7}$');
    if (!phonePattern.hasMatch(_phoneController.text.trim())) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Enter a valid Somali phone number, e.g. +25261XXXXXXX',
          ),
        ),
      );
      return;
    }

    final success = await bookingProvider.confirmBooking(
      widget.doctorId,
      doctorName: doctor.name,
      phone: _phoneController.text.trim(),
    );

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(bookingProvider.error ?? 'Unable to confirm booking.'),
        ),
      );
      return;
    }

    context.push(
      '/payment',
      extra: {
        'bookingId': bookingProvider.booking?.id ?? '',
        'doctorId': widget.doctorId,
        'fee': doctor.fee,
        'appointmentDate': selectedDate.toIso8601String(),
        'appointmentTime': bookingProvider.selectedTime ?? '',
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.booking),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Consumer2<DoctorProvider, BookingProvider>(
        builder: (context, doctorProvider, bookingProvider, _) {
          final selectedDoctor = doctorProvider.selectedDoctor;
          final doctor = selectedDoctor?.id == widget.doctorId
              ? selectedDoctor
              : null;

          if (doctor == null) {
            return RefreshIndicator(
              onRefresh: _loadDoctorDetails,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(
                    height: MediaQuery.of(context).size.height * 0.65,
                    child: Center(
                      child: doctorProvider.error != null
                          ? Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.error_outline,
                                    color: AppColors.lightDanger,
                                    size: 48,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    doctorProvider.error!,
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 16),
                                  GradientButton(
                                    label: 'Retry',
                                    onPressed: _loadDoctorDetails,
                                  ),
                                ],
                              ),
                            )
                          : const CircularProgressIndicator(),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _loadDoctorDetails,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GradientCard(
                    colors: const [Color(0xFF0F8EA8), Color(0xFF14B8A6)],
                    borderRadius: 34,
                    padding: const EdgeInsets.all(24),
                    child: Row(
                      children: [
                        Container(
                          width: 58,
                          height: 58,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.18),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Icon(
                            Icons.event_available_rounded,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Book your visit',
                                style: Theme.of(context).textTheme.headlineSmall
                                    ?.copyWith(color: Colors.white),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Choose a date, pick an available time, then review before payment.',
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(
                                      color: Colors.white.withOpacity(0.86),
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Doctor Summary
                  CustomCard(
                    child: Row(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            color: AppColors.lightBorder,
                          ),
                          child: doctor.photo != null
                              ? Image.network(doctor.photo!, fit: BoxFit.cover)
                              : Icon(Icons.person),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                doctor.name,
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              Text(
                                doctor.specialization,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              Text(
                                '\$${doctor.fee.toStringAsFixed(2)}',
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(color: AppColors.lightPrimary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Date Selection
                  Text(
                    AppStrings.selectedDate,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _selectDate,
                    child: CustomCard(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            bookingProvider.selectedDate != null
                                ? DateFormat(
                                    'MMMM dd, yyyy',
                                  ).format(bookingProvider.selectedDate!)
                                : 'Select Date',
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                          Icon(
                            Icons.calendar_today,
                            color: AppColors.lightPrimary,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Time Selection
                  Text(
                    AppStrings.selectedTime,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _selectTime,
                    child: CustomCard(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            bookingProvider.selectedTime ?? 'Select Time',
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                          Icon(
                            Icons.access_time,
                            color: AppColors.lightPrimary,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Phone
                  Text(
                    AppStrings.phoneNumber,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  CustomTextField(
                    label: AppStrings.phoneNumber,
                    hintText: '+252 61 234 5678',
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 24),
                  // Notes
                  Text(
                    AppStrings.notes,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  CustomTextField(
                    label: '',
                    hintText: 'Add notes (optional)',
                    controller: _notesController,
                    maxLines: 3,
                    onChanged: (value) {
                      context.read<BookingProvider>().setNotes(value);
                    },
                  ),
                  const SizedBox(height: 32),
                  CustomCard(
                    borderRadius: 28,
                    padding: const EdgeInsets.all(18),
                    backgroundColor: Theme.of(
                      context,
                    ).colorScheme.primary.withOpacity(0.05),
                    border: Border.all(
                      color: Theme.of(
                        context,
                      ).colorScheme.primary.withOpacity(0.16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Booking review',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 12),
                        _ReviewRow(label: 'Doctor', value: doctor.name),
                        _ReviewRow(
                          label: 'Date',
                          value: bookingProvider.selectedDate != null
                              ? DateFormat(
                                  'MMM dd, yyyy',
                                ).format(bookingProvider.selectedDate!)
                              : 'Not selected',
                        ),
                        _ReviewRow(
                          label: 'Time',
                          value: bookingProvider.selectedTime ?? 'Not selected',
                        ),
                        _ReviewRow(
                          label: 'Fee',
                          value: '\$${doctor.fee.toStringAsFixed(2)}',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  GradientButton(
                    label: 'Proceed to Payment',
                    onPressed: _handleConfirmBooking,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  bool _isPastSlot(DateTime date, String startTime) {
    final parts = startTime.split(':');
    if (parts.length < 2) return false;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return false;
    final slotDateTime = DateTime(
      date.year,
      date.month,
      date.day,
      hour,
      minute,
    );
    return slotDateTime.isBefore(DateTime.now());
  }

  List<Map<String, String>> _slotOptions(List<Map<String, String>> ranges) {
    final slots = <Map<String, String>>[];
    for (final range in ranges) {
      final start = _parseClock(range['start'] ?? '');
      final end = _parseClock(range['end'] ?? '');
      if (start == null || end == null || !start.isBefore(end)) continue;

      var cursor = start;
      while (cursor.isBefore(end)) {
        final next = cursor.add(const Duration(hours: 1));
        if (next.isAfter(end)) break;
        slots.add({'start': _formatClock(cursor), 'end': _formatClock(next)});
        cursor = next;
      }
    }
    return slots;
  }

  DateTime? _parseClock(String value) {
    final parts = value.split(':');
    if (parts.length < 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    return DateTime(2000, 1, 1, hour, minute);
  }

  String _formatClock(DateTime value) {
    return '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
  }
}

class _ReviewRow extends StatelessWidget {
  final String label;
  final String value;

  const _ReviewRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.titleSmall,
            ),
          ),
        ],
      ),
    );
  }
}
