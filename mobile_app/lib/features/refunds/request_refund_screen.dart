import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/cards.dart';
import '../../models/appointment_model.dart';
import '../../providers/appointment_provider.dart';
import '../../providers/refund_provider.dart';

class RequestRefundScreen extends StatefulWidget {
  final AppointmentModel appointment;

  const RequestRefundScreen({super.key, required this.appointment});

  @override
  State<RequestRefundScreen> createState() => _RequestRefundScreenState();
}

class _RequestRefundScreenState extends State<RequestRefundScreen> {
  final _notesController = TextEditingController();
  String _reason = 'Doctor did not attend';

  static const reasons = [
    'Doctor did not attend',
    'Appointment never started',
    'Doctor cancelled',
    'Wrong payment',
    'Technical issue',
    'Other',
  ];

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Submit refund request?'),
        content: const Text('Your request will be reviewed by an administrator and cannot be duplicated for this appointment.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Submit')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final provider = context.read<RefundProvider>();
    final refund = await provider.requestRefund(
      appointmentId: widget.appointment.id,
      reason: _reason,
      notes: _notesController.text,
    );
    if (!mounted) return;
    if (refund == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(provider.error ?? 'Unable to submit refund request.')));
      return;
    }
    await context.read<AppointmentProvider>().loadAppointments();
    await _showSuccess();
    if (!mounted) return;
    context.go('/refunds');
  }

  Future<void> _showSuccess() {
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.check_circle_rounded, color: AppColors.lightSuccess, size: 58),
        title: const Text('Refund submitted'),
        content: const Text('Status: Refund Pending. Estimated processing time is 3-5 business days.'),
        actions: [
          ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('Done')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final amount = widget.appointment.paymentAmount > 0 ? widget.appointment.paymentAmount : widget.appointment.consultationFee;
    return Scaffold(
      appBar: AppBar(title: const Text('Request Refund')),
      body: Consumer<RefundProvider>(
        builder: (context, provider, _) {
          return ListView(
            padding: const EdgeInsets.all(18),
            children: [
              GradientCard(
                colors: const [Color(0xFF2563EB), Color(0xFF14B8A6)],
                borderRadius: 30,
                padding: const EdgeInsets.all(22),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Appointment summary', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
                    const SizedBox(height: 12),
                    _WhiteRow(label: 'Doctor', value: widget.appointment.doctorName),
                    _WhiteRow(label: 'Payment amount', value: '\$${amount.toStringAsFixed(2)}'),
                    _WhiteRow(label: 'Refund amount', value: '\$${amount.toStringAsFixed(2)}'),
                    _WhiteRow(label: 'Payment ID', value: widget.appointment.paymentId ?? 'N/A'),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              CustomCard(
                borderRadius: 26,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Reason for refund', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _reason,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: reasons.map((reason) => DropdownMenuItem(value: reason, child: Text(reason))).toList(),
                      onChanged: provider.isSubmitting ? null : (value) => setState(() => _reason = value ?? _reason),
                    ),
                    const SizedBox(height: 18),
                    TextField(
                      controller: _notesController,
                      minLines: 5,
                      maxLines: 7,
                      maxLength: 500,
                      enabled: !provider.isSubmitting,
                      decoration: const InputDecoration(
                        labelText: 'Additional notes',
                        hintText: 'Explain what happened during the appointment.',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: provider.isSubmitting ? null : _submit,
                        icon: provider.isSubmitting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send_rounded),
                        label: Text(provider.isSubmitting ? 'Submitting...' : 'Submit Refund Request'),
                      ),
                    ),
                    if (provider.error != null) ...[
                      const SizedBox(height: 12),
                      Text(provider.error!, style: const TextStyle(color: AppColors.lightDanger, fontWeight: FontWeight.w700)),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _WhiteRow extends StatelessWidget {
  final String label;
  final String value;

  const _WhiteRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(color: Colors.white.withOpacity(0.78)))),
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
