import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/cards.dart';
import '../../core/widgets/safe_image.dart';
import '../../models/appointment_model.dart';
import '../../providers/appointment_provider.dart';

class AppointmentDetailsScreen extends StatelessWidget {
  final AppointmentModel appointment;

  const AppointmentDetailsScreen({super.key, required this.appointment});

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(appointment.effectiveStatus);
    final amount = appointment.paymentAmount > 0 ? appointment.paymentAmount : appointment.consultationFee;

    return Scaffold(
      appBar: AppBar(title: const Text('Appointment Details')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
        children: [
          GradientCard(
            colors: const [Color(0xFF2563EB), Color(0xFF06B6D4)],
            borderRadius: 32,
            padding: const EdgeInsets.all(22),
            child: Row(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.16),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withOpacity(0.38), width: 3),
                  ),
                  child: SafeImage(
                    url: appointment.doctorPhoto,
                    fit: BoxFit.cover,
                    fallback: Center(
                      child: Text(
                        _initials(appointment.doctorName),
                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(appointment.doctorName.isEmpty ? 'Doctor' : appointment.doctorName, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                      const SizedBox(height: 5),
                      Text(appointment.specialization?.isNotEmpty == true ? appointment.specialization! : 'Specialist', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.84))),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(999)),
                        child: Text(appointment.effectiveStatus, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (appointment.isDelayed) ...[
            CustomCard(
              borderRadius: 24,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.warning_amber_rounded, color: AppColors.lightWarning),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Your therapist needs additional time with the previous patient.',
                      style: TextStyle(color: AppColors.lightWarning, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],
          CustomCard(
            borderRadius: 28,
            child: Column(
              children: [
                _DetailRow(icon: Icons.calendar_month_rounded, label: 'Appointment date', value: appointment.date),
                _DetailRow(icon: Icons.schedule_rounded, label: 'Appointment time', value: appointment.time),
                _DetailRow(icon: Icons.timer_rounded, label: 'Appointment end time', value: appointment.endTime ?? ''),
                if (appointment.originalTime?.isNotEmpty == true)
                  _DetailRow(icon: Icons.history_rounded, label: 'Original time', value: '${appointment.originalTime} - ${appointment.originalEndTime ?? ''}'),
                if (appointment.extensionMinutes > 0)
                  _DetailRow(icon: Icons.more_time_rounded, label: 'Emergency delay', value: '+${appointment.extensionMinutes} minutes'),
                _DetailRow(icon: Icons.timelapse_rounded, label: 'Duration', value: appointment.duration?.isNotEmpty == true ? appointment.duration! : 'Not recorded'),
                _DetailRow(icon: Icons.medical_services_rounded, label: 'Specialization', value: appointment.specialization ?? 'Specialist'),
                _DetailRow(icon: Icons.attach_money_rounded, label: 'Consultation fee', value: amount > 0 ? '\$${amount.toStringAsFixed(2)}' : 'Not recorded'),
                _DetailRow(icon: Icons.attach_money_rounded, label: 'Payment amount', value: appointment.paymentAmount > 0 ? '\$${appointment.paymentAmount.toStringAsFixed(2)}' : ''),
                _DetailRow(icon: Icons.account_balance_wallet_rounded, label: 'Payment method', value: appointment.paymentMethod ?? ''),
                _DetailRow(icon: Icons.payments_rounded, label: 'Payment status', value: appointment.paymentStatus ?? 'Not recorded'),
                _DetailRow(icon: Icons.event_available_rounded, label: 'Appointment status', value: appointment.status),
                _DetailRow(icon: Icons.confirmation_number_rounded, label: 'Booking ID', value: appointment.id),
                _DetailRow(icon: Icons.receipt_long_rounded, label: 'Payment ID', value: appointment.paymentId ?? 'Not available'),
                _DetailRow(icon: Icons.tag_rounded, label: 'Payment transaction ID', value: appointment.paymentTransactionId ?? ''),
                _DetailRow(icon: Icons.today_rounded, label: 'Created date', value: appointment.createdAt ?? ''),
              ],
            ),
          ),
          if (appointment.notes.isNotEmpty) ...[
            const SizedBox(height: 14),
            CustomCard(
              borderRadius: 26,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Notes', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  Text(appointment.notes),
                ],
              ),
            ),
          ],
          const SizedBox(height: 18),
          _ActionPanel(appointment: appointment, statusColor: statusColor),
        ],
      ),
    );
  }

  String _initials(String value) {
    final parts = value.trim().split(RegExp(r'\s+')).where((part) => part.isNotEmpty).take(2);
    final initials = parts.map((part) => part[0]).join().toUpperCase();
    return initials.isEmpty ? 'DR' : initials;
  }

  Color _statusColor(String status) {
    final value = status.toLowerCase();
    if (value.contains('reject') || value.contains('cancel')) return AppColors.lightDanger;
    if (value.contains('refund') && value.contains('pending')) return AppColors.lightWarning;
    if (value.contains('refund') && value.contains('approved')) return AppColors.lightSuccess;
    if (value.contains('refund') && value.contains('completed')) return AppColors.lightSuccess;
    if (value.contains('completed')) return AppColors.lightSuccess;
    if (value.contains('payment')) return AppColors.lightWarning;
    return AppColors.lightPrimary;
  }
}

class _ActionPanel extends StatelessWidget {
  final AppointmentModel appointment;
  final Color statusColor;

  const _ActionPanel({required this.appointment, required this.statusColor});

  @override
  Widget build(BuildContext context) {
    final actions = <Widget>[];
    final status = appointment.status.toLowerCase();
    final payment = (appointment.paymentStatus ?? '').toLowerCase();

    if (!appointment.isPaid && !payment.contains('not required')) {
      actions.add(_ActionButton(
        icon: Icons.payments_rounded,
        label: 'Pay Now',
        color: AppColors.lightPrimary,
        onTap: () => context.push('/payment', extra: {
          'bookingId': appointment.id,
          'doctorId': appointment.doctorId,
          'fee': appointment.consultationFee > 0 ? appointment.consultationFee : appointment.paymentAmount,
          'appointmentDate': appointment.date,
          'appointmentTime': appointment.time,
        }),
      ));
    } else if (appointment.isPaid) {
      actions.add(_StaticStatus(icon: Icons.check_circle_rounded, label: 'Payment Completed', color: AppColors.lightSuccess));
    }

    if (status == 'pending' || status == 'confirmed') {
      actions.add(_ActionButton(icon: Icons.cancel_rounded, label: 'Cancel Appointment', color: AppColors.lightDanger, onTap: () => _cancelAppointment(context)));
    }

    if (appointment.canRequestRefund) {
      actions.add(_ActionButton(
        icon: Icons.undo_rounded,
        label: 'Request Refund',
        color: AppColors.lightWarning,
        onTap: () => context.push('/request_refund', extra: appointment),
      ));
    }

    return CustomCard(
      borderRadius: 28,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Available actions', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          if (actions.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: statusColor.withOpacity(0.08), borderRadius: BorderRadius.circular(18)),
              child: Text(
                appointment.canRequestRefund ? 'Request a refund from this appointment.' : 'This appointment is not eligible for refund.',
                style: TextStyle(color: statusColor, fontWeight: FontWeight.w700),
              ),
            )
          else
            ..._withSpacing(actions),
        ],
      ),
    );
  }

  Future<void> _cancelAppointment(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel appointment?'),
        content: const Text('This will update the appointment status in the database.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Cancel Appointment')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    final provider = context.read<AppointmentProvider>();
    final success = await provider.cancelAppointment(appointment.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(success ? 'Appointment cancelled.' : provider.error ?? 'Unable to cancel appointment.')),
    );
    if (success) {
      context.pop();
    }
  }

  List<Widget> _withSpacing(List<Widget> items) {
    final spaced = <Widget>[];
    for (var index = 0; index < items.length; index++) {
      spaced.add(items[index]);
      if (index != items.length - 1) {
        spaced.add(const SizedBox(height: 10));
      }
    }
    return spaced;
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
        onPressed: onTap,
        icon: Icon(icon),
        label: Text(label),
      ),
    );
  }
}

class _StaticStatus extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _StaticStatus({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(18)),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: AppColors.lightPrimary.withOpacity(0.09), borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: AppColors.lightPrimary, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value.trim().isEmpty ? 'Not recorded' : value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}
