import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/cards.dart';

class BookingSuccessScreen extends StatefulWidget {
  final String paymentId;
  final String bookingId;
  final String doctorName;
  final String doctorId;
  final String referenceNumber;
  final String date;
  final String time;
  final String paymentMethod;
  final double amountPaid;

  const BookingSuccessScreen({
    Key? key,
    required this.paymentId,
    required this.bookingId,
    required this.doctorName,
    required this.doctorId,
    required this.referenceNumber,
    required this.date,
    required this.time,
    required this.paymentMethod,
    required this.amountPaid,
  }) : super(key: key);

  @override
  State<BookingSuccessScreen> createState() => _BookingSuccessScreenState();
}

class _BookingSuccessScreenState extends State<BookingSuccessScreen> {
  bool _downloadingReceipt = false;

  Future<void> _downloadReceipt() async {
    if (widget.paymentId.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Receipt is available after payment details are synced.')),
      );
      return;
    }
    setState(() => _downloadingReceipt = true);
    try {
      final bytes = await context.read<ApiService>().downloadPaymentReceipt(widget.paymentId);
      if (bytes.isEmpty) {
        throw Exception('Receipt file was empty.');
      }
      final directory = await getTemporaryDirectory();
      final file = File('${directory.path}${Platform.pathSeparator}payment-receipt-${widget.paymentId}.pdf');
      await file.writeAsBytes(bytes, flush: true);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Receipt downloaded: ${file.path}')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to download receipt. Please try again.')),
      );
    } finally {
      if (mounted) setState(() => _downloadingReceipt = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 800),
                tween: Tween(begin: 0.82, end: 1),
                curve: Curves.elasticOut,
                builder: (context, value, child) => Transform.scale(scale: value, child: child),
                child: Container(
                  width: 132,
                  height: 132,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: AppColors.successGradient),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.lightSuccess.withOpacity(0.26),
                        blurRadius: 34,
                        offset: const Offset(0, 18),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.check_rounded, color: Colors.white, size: 70),
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Payment Successful',
                style: Theme.of(context).textTheme.displaySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Your confirmed appointment will appear in your appointments list.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              CustomCard(
                borderRadius: 30,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _DetailRow(
                      label: 'Payment ID',
                      value: widget.paymentId,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Booking ID',
                      value: widget.bookingId,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Doctor',
                      value: widget.doctorName,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Transaction Reference',
                      value: widget.referenceNumber,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Date',
                      value: widget.date,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Time',
                      value: widget.time,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Payment Method',
                      value: widget.paymentMethod,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Amount Paid',
                      value: '\$${widget.amountPaid.toStringAsFixed(2)}',
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Status',
                      value: 'Confirmed',
                      valueColor: AppColors.lightSuccess,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.lightPrimary.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: AppColors.lightBorder,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info,
                      color: AppColors.lightPrimary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'You will receive a reminder 24 hours before your appointment.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              GradientButton(
                label: 'View Appointment',
                onPressed: () {
                  context.go('/appointment_history');
                },
              ),
              const SizedBox(height: 12),
              SecondaryButtonWidget(
                label: 'Download Receipt',
                onPressed: _downloadingReceipt ? null : _downloadReceipt,
              ),
              const SizedBox(height: 12),
              SecondaryButtonWidget(
                label: 'Back to Dashboard',
                onPressed: () {
                  context.go('/dashboard');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _DetailRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: valueColor,
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}

class SecondaryButtonWidget extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final double? width;

  const SecondaryButtonWidget({
    Key? key,
    required this.label,
    required this.onPressed,
    this.width,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width ?? double.infinity,
      height: 56,
      child: OutlinedButton(
        onPressed: onPressed,
        child: Text(label),
      ),
    );
  }
}
 
