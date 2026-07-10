import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/cards.dart';
import '../../models/refund_model.dart';
import '../../providers/refund_provider.dart';

class RefundHistoryScreen extends StatefulWidget {
  const RefundHistoryScreen({super.key});

  @override
  State<RefundHistoryScreen> createState() => _RefundHistoryScreenState();
}

class _RefundHistoryScreenState extends State<RefundHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RefundProvider>().loadRefunds();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Refunds')),
      body: Consumer<RefundProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return ListView.builder(
              padding: const EdgeInsets.all(18),
              itemCount: 5,
              itemBuilder: (_, __) => Container(
                height: 118,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(color: AppColors.lightBorder.withOpacity(0.35), borderRadius: BorderRadius.circular(26)),
              ),
            );
          }
          if (provider.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off_rounded, size: 64, color: AppColors.lightDanger),
                    const SizedBox(height: 14),
                    Text(provider.error!, textAlign: TextAlign.center),
                    const SizedBox(height: 14),
                    ElevatedButton(onPressed: provider.loadRefunds, child: const Text('Retry')),
                  ],
                ),
              ),
            );
          }
          if (provider.refunds.isEmpty) {
            return RefreshIndicator(
              onRefresh: provider.loadRefunds,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 160),
                  Icon(Icons.receipt_long_outlined, size: 72, color: AppColors.lightGrey),
                  SizedBox(height: 16),
                  Center(child: Text('No refund requests yet')),
                  SizedBox(height: 8),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 36),
                    child: Text('Eligible appointment refunds will appear here after you submit a request.', textAlign: TextAlign.center),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: provider.loadRefunds,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
              itemCount: provider.refunds.length,
              itemBuilder: (context, index) => _RefundCard(refund: provider.refunds[index]),
            ),
          );
        },
      ),
    );
  }
}

class _RefundCard extends StatelessWidget {
  final RefundModel refund;

  const _RefundCard({required this.refund});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(refund.status);
    return CustomCard(
      onTap: () => context.push('/refund_details', extra: refund),
      borderRadius: 26,
      marginBottom: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(16)),
                child: Icon(Icons.undo_rounded, color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(refund.displayId, style: Theme.of(context).textTheme.titleLarge),
                    Text(refund.doctorName, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(999)),
                child: Text(refund.status, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 11)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _Mini(label: 'Appointment', value: '#${refund.appointmentId}')),
              Expanded(child: _Mini(label: 'Amount', value: '\$${refund.refundAmount.toStringAsFixed(2)}')),
              Expanded(child: _Mini(label: 'Requested', value: (refund.requestedAt ?? '').split('T').first)),
            ],
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    final value = status.toLowerCase();
    if (value.contains('reject')) return AppColors.lightDanger;
    if (value.contains('process')) return AppColors.lightPrimary;
    if (value.contains('approved') || value.contains('completed')) return AppColors.lightSuccess;
    return AppColors.lightWarning;
  }
}

class _Mini extends StatelessWidget {
  final String label;
  final String value;

  const _Mini({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 4),
        Text(value.isEmpty ? 'N/A' : value, style: Theme.of(context).textTheme.bodyLarge),
      ],
    );
  }
}
