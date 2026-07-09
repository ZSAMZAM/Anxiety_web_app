import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/cards.dart';

class BookingSuccessScreen extends StatelessWidget {
  final String doctorId;
  final String referenceNumber;
  final String date;
  final String time;

  const BookingSuccessScreen({
    Key? key,
    required this.doctorId,
    required this.referenceNumber,
    required this.date,
    required this.time,
  }) : super(key: key);

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
                'Payment successful. Appointment confirmed.',
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
                      label: 'Reference Number',
                      value: referenceNumber,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Date',
                      value: date,
                    ),
                    Divider(height: 16),
                    _DetailRow(
                      label: 'Time',
                      value: time,
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
                label: 'Return Home',
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
  final VoidCallback onPressed;
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
 
