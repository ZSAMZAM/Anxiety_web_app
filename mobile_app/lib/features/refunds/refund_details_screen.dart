import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/cards.dart';
import '../../models/refund_model.dart';
import '../../providers/refund_provider.dart';

class RefundDetailsScreen extends StatefulWidget {
  final RefundModel? refund;
  final String? refundId;

  const RefundDetailsScreen({super.key, this.refund, this.refundId});

  @override
  State<RefundDetailsScreen> createState() => _RefundDetailsScreenState();
}

class _RefundDetailsScreenState extends State<RefundDetailsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RefundProvider>().loadRefunds(silent: widget.refund != null);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Refund Details')),
      body: Consumer<RefundProvider>(
        builder: (context, provider, _) {
          final refund = widget.refund ?? provider.byId(widget.refundId ?? '');
          if (refund == null && provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (refund == null) {
            return const Center(child: Text('Refund details are not available yet.'));
          }
          return RefreshIndicator(
            onRefresh: () => provider.loadRefunds(),
            child: ListView(
              padding: const EdgeInsets.all(18),
              children: [
                GradientCard(
                  colors: const [Color(0xFF2563EB), Color(0xFF06B6D4)],
                  borderRadius: 30,
                  padding: const EdgeInsets.all(22),
                  child: Row(
                    children: [
                      Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(20)),
                        child: const Icon(Icons.receipt_long_rounded, color: Colors.white),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(refund.displayId, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                            const SizedBox(height: 4),
                            Text(refund.status, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.85))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                _InfoCard(title: 'Appointment', rows: {
                  'Appointment ID': refund.appointmentId,
                  'Doctor': refund.doctorName,
                  'Date': refund.appointmentDate ?? 'Not recorded',
                  'Time': refund.appointmentTime ?? 'Not recorded',
                }),
                _InfoCard(title: 'Payment', rows: {
                  'Payment ID': refund.paymentId,
                  'Paid amount': _money(refund.amount),
                  'Refund amount': _money(refund.refundAmount),
                  'Gateway reference': refund.gatewayReference?.isNotEmpty == true ? refund.gatewayReference! : 'Not available',
                }),
                _InfoCard(title: 'Reason', rows: {
                  'Reason': refund.reason,
                  'Notes': refund.notes.isEmpty ? 'No notes provided' : refund.notes,
                  'Admin notes': refund.adminNotes?.isNotEmpty == true ? refund.adminNotes! : 'No admin notes yet',
                }),
                CustomCard(
                  borderRadius: 26,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Timeline', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 14),
                      _TimelineItem(label: 'Requested', value: refund.requestedAt ?? 'Waiting', active: true),
                      _TimelineItem(label: 'Reviewed', value: refund.adminNotes?.isNotEmpty == true ? 'Reviewed by admin' : 'Waiting for review', active: refund.adminNotes?.isNotEmpty == true),
                      _TimelineItem(label: 'Approved', value: refund.status.contains('Approved') || refund.status.contains('Processing') || refund.status.contains('Completed') ? refund.status : 'Waiting', active: refund.status.contains('Approved') || refund.status.contains('Processing') || refund.status.contains('Completed')),
                      _TimelineItem(label: 'Completed', value: refund.processedAt ?? 'Waiting', active: refund.status.contains('Completed')),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _money(double value) => '\$${value.toStringAsFixed(2)}';
}

class _InfoCard extends StatelessWidget {
  final String title;
  final Map<String, String> rows;

  const _InfoCard({required this.title, required this.rows});

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      borderRadius: 26,
      marginBottom: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          ...rows.entries.map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 9),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(width: 130, child: Text(entry.key, style: Theme.of(context).textTheme.bodyMedium)),
                    Expanded(child: Text(entry.value, textAlign: TextAlign.right, style: Theme.of(context).textTheme.bodyLarge)),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final String label;
  final String value;
  final bool active;

  const _TimelineItem({required this.label, required this.value, required this.active});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: active ? AppColors.lightSuccess.withOpacity(0.12) : AppColors.lightGrey.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(active ? Icons.check_rounded : Icons.more_horiz_rounded, color: active ? AppColors.lightSuccess : AppColors.lightGrey, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.titleMedium),
                Text(value, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
