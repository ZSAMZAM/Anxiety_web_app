import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/text_fields.dart';
import '../../core/widgets/cards.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/providers/doctor_provider.dart';
import '../../core/providers/dashboard_provider.dart';
import '../../providers/appointment_provider.dart';
import '../../providers/notification_provider.dart';

// Patient payment UI. Production payments call the merchant-backed backend endpoint.
class PaymentScreen extends StatefulWidget {
  final String bookingId;
  final String doctorId;
  final double fee;
  final String appointmentDate;
  final String appointmentTime;

  const PaymentScreen({
    Key? key,
    required this.bookingId,
    required this.doctorId,
    required this.fee,
    required this.appointmentDate,
    required this.appointmentTime,
  }) : super(key: key);

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _phoneController = TextEditingController();
  String? _selectedMethod = 'mwallet_account';
  bool _isProcessing = false;
  String? _statusMessage;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handlePayment() async {
    if (_isProcessing) return;

    if (_selectedMethod == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select a payment method')),
      );
      return;
    }

    final paymentPhone = _phoneController.text.trim();
    if (paymentPhone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter your phone number')),
      );
      return;
    }
    final phonePattern = RegExp(r'^\+252(61|62|63|65|66|67|68|69|77|90)\d{7}$');
    if (!phonePattern.hasMatch(paymentPhone)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid Somali payment phone number.')),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _statusMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.post(
        AppConstants.paymentEndpoint,
        data: {
          'amount': widget.fee,
          'payment_method': _selectedMethod,
          'payment_phone': paymentPhone,
          'description': 'Appointment payment',
          'booking_id': widget.bookingId,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final payment = data['payment'] as Map<String, dynamic>? ?? {};
      var status = _paymentStatus(payment);
      final transactionId = _paymentReference(payment);

      if (_isPendingStatus(status)) {
        final completedPayment = await _pollPaymentStatus(
          apiService: apiService,
          paymentId: payment['id']?.toString() ?? '',
        );
        if (completedPayment == null) {
          if (mounted) {
            setState(() => _statusMessage =
                'Payment is still pending. Your appointment remains pending payment.');
          }
          return;
        }
        payment
          ..clear()
          ..addAll(completedPayment);
        status = _paymentStatus(payment);
        if (!_isCompletedStatus(status)) {
          if (mounted) {
            setState(() => _statusMessage =
                _paymentFailureMessage(payment, 'Payment was not completed. Please retry with your merchant wallet.'));
          }
          return;
        }
      } else if (!_isCompletedStatus(status)) {
        if (mounted) {
          setState(() => _statusMessage =
              _paymentFailureMessage(payment, 'Payment was not completed. Please retry with your merchant wallet.'));
        }
        return;
      }
      final completedTransactionId = _paymentReference(payment).isNotEmpty
          ? _paymentReference(payment)
          : transactionId;
      if (completedTransactionId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment completed without a transaction reference.')),
        );
        return;
      }
      final paidDoctorName = context.read<DoctorProvider>().selectedDoctor?.name ?? 'Selected therapist';

      await Future.wait([
        context.read<AppointmentProvider>().loadAppointments(),
        context.read<DashboardProvider>().loadDashboard(silent: true),
        context.read<NotificationProvider>().loadNotifications(silent: true),
        context.read<DoctorProvider>().getDoctorById(widget.doctorId),
      ]);

      if (!mounted) return;
      context.go('/booking_success', extra: {
        'paymentId': payment['id']?.toString() ?? '',
        'bookingId': widget.bookingId,
        'doctorId': widget.doctorId,
        'doctorName': paidDoctorName,
        'referenceNumber': completedTransactionId,
        'date': widget.appointmentDate,
        'time': widget.appointmentTime,
        'paymentMethod': payment['paymentMethod']?.toString() ??
            payment['payment_method']?.toString() ??
            _selectedMethod ??
            'mwallet_account',
        'amountPaid': payment['amount'] ?? widget.fee,
      });
    } catch (error) {
      final message = error is ApiException ? error.message : 'Unable to process payment.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<Map<String, dynamic>?> _pollPaymentStatus({
    required ApiService apiService,
    required String paymentId,
  }) async {
    if (paymentId.isEmpty) return null;
    setState(() => _statusMessage = 'Merchant processing. Waiting for confirmation...');

    for (var attempt = 0; attempt < 12; attempt++) {
      await Future.delayed(const Duration(seconds: 5));
      if (!mounted) return null;

      try {
        final response = await apiService.get(
          AppConstants.paymentStatusEndpoint(paymentId),
        );
        final data = response.data as Map<String, dynamic>;
        final payment = data['payment'] as Map<String, dynamic>? ?? {};
        final status = _paymentStatus(payment);

        if (_isCompletedStatus(status) || _isFailedStatus(status)) return payment;
      } catch (_) {
        if (mounted) {
          setState(() => _statusMessage =
              'Still waiting for merchant confirmation. Please keep this screen open.');
        }
      }
    }

    return null;
  }

  String _paymentStatus(Map<String, dynamic> payment) {
    return (payment['status'] ?? payment['payment_status'] ?? '').toString().toLowerCase();
  }

  bool _isCompletedStatus(String status) {
    return ['completed', 'paid', 'success', 'successful', 'approved'].contains(status);
  }

  bool _isPendingStatus(String status) {
    return status.isEmpty || ['pending', 'processing', 'accepted', 'inprogress', 'in_progress'].contains(status);
  }

  bool _isFailedStatus(String status) {
    return ['failed', 'failure', 'cancelled', 'canceled', 'declined', 'rejected', 'error'].contains(status);
  }

  String _paymentFailureMessage(Map<String, dynamic> payment, String fallback) {
    final value = payment['message'] ??
        payment['failureReason'] ??
        payment['failure_reason'] ??
        payment['error'];
    final message = value?.toString().trim() ?? '';
    return message.isEmpty ? fallback : message;
  }

  String _paymentReference(Map<String, dynamic> payment) {
    return (payment['transactionId'] ??
            payment['transaction_id'] ??
            payment['referenceId'] ??
            payment['reference_id'] ??
            '')
        .toString();
  }

  @override
  Widget build(BuildContext context) {
    final doctor = context.watch<DoctorProvider>().selectedDoctor;
    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.payment),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(22, 10, 22, 30),
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
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(20)),
                    child: const Icon(Icons.lock_rounded, color: Colors.white),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Secure payment', style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                        const SizedBox(height: 6),
                        Text(
                          '\$${widget.fee.toStringAsFixed(2)} appointment fee',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.86)),
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),
            CustomCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Appointment Summary', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 12),
                  _PaymentDetail(label: 'Doctor', value: doctor?.name ?? 'Selected therapist'),
                  _PaymentDetail(label: 'Date', value: widget.appointmentDate.split('T').first),
                  _PaymentDetail(label: 'Time', value: widget.appointmentTime),
                  _PaymentDetail(label: 'Amount', value: '\$${widget.fee.toStringAsFixed(2)}'),
                ],
              ),
            ),
            const SizedBox(height: 22),
            Text(AppStrings.paymentMethod, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            _PaymentMethodOption(
              title: 'Hormuud Merchant Wallet',
              subtitle: 'Pay with your merchant wallet phone number',
              icon: Icons.account_balance_wallet,
              isSelected: _selectedMethod == 'mwallet_account',
              onTap: () => setState(() => _selectedMethod = 'mwallet_account'),
            ),
            const SizedBox(height: 32),
            CustomTextField(
              label: AppStrings.phoneNumber,
              hintText: '+252612345678',
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              prefixIcon: Icon(Icons.phone),
            ),
            const SizedBox(height: 32),
            GradientButton(
              label: _isProcessing ? AppStrings.paymentProcessing : AppStrings.payNow,
              onPressed: _handlePayment,
              isLoading: _isProcessing,
            ),
            if (_isProcessing) ...[
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: const LinearProgressIndicator(minHeight: 8),
              ),
            ],
            if (_statusMessage != null) ...[
              const SizedBox(height: 12),
              CustomCard(
                backgroundColor: AppColors.lightWarning.withOpacity(0.08),
                border: Border.all(color: AppColors.lightWarning.withOpacity(0.28)),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, color: AppColors.lightWarning),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _statusMessage!,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.lightInfo.withOpacity(0.1),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: AppColors.lightInfo.withOpacity(0.3),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.lock,
                    color: AppColors.lightSecondary,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Your payment information is secure and encrypted. We do not store your payment details.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentDetail extends StatelessWidget {
  final String label;
  final String value;

  const _PaymentDetail({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
          Expanded(
            child: Text(
              value.trim().isEmpty ? 'Not available' : value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodOption extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodOption({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: CustomCard(
        backgroundColor: isSelected ? AppColors.lightPrimary.withOpacity(0.05) : null,
        border: isSelected
            ? Border.all(
                color: AppColors.lightPrimary,
                width: 2,
              )
            : null,
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.lightPrimary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: AppColors.lightPrimary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 3),
                  Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                color: AppColors.lightPrimary,
              ),
          ],
        ),
      ),
    );
  }
}
