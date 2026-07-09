import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/dialogs.dart';
import '../../core/widgets/text_fields.dart';

class PhoneVerificationScreen extends StatefulWidget {
  final String phone;

  const PhoneVerificationScreen({
    Key? key,
    required this.phone,
  }) : super(key: key);

  @override
  State<PhoneVerificationScreen> createState() => _PhoneVerificationScreenState();
}

class _PhoneVerificationScreenState extends State<PhoneVerificationScreen> {
  final _otpController = TextEditingController();

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final authProvider = context.read<AuthProvider>();
    final phone = widget.phone.isNotEmpty
        ? widget.phone
        : authProvider.pendingVerificationPhone ?? '';

    if (phone.isEmpty) {
      showErrorSnackbar(context, 'Phone number is missing. Please register again.');
      return;
    }

    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      showErrorSnackbar(context, 'Enter the 6 digit verification code.');
      return;
    }

    final success = await authProvider.verifyOtpAndLogin(phone: phone, otpCode: otp);
    if (!mounted) return;

    if (success) {
      showSuccessSnackbar(context, 'Phone verified. Welcome to your dashboard.');
      context.go('/dashboard');
      return;
    }

    showErrorSnackbar(context, authProvider.error ?? 'Verification failed.');
  }

  Future<void> _resend() async {
    final authProvider = context.read<AuthProvider>();
    final phone = widget.phone.isNotEmpty
        ? widget.phone
        : authProvider.pendingVerificationPhone ?? '';

    if (phone.isEmpty) {
      showErrorSnackbar(context, 'Phone number is missing. Please register again.');
      return;
    }

    final success = await authProvider.sendOtp(phone);
    if (!mounted) return;

    if (success) {
      showSuccessSnackbar(context, 'Verification code sent.');
      return;
    }

    showErrorSnackbar(context, authProvider.error ?? 'Unable to resend code.');
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final phone = widget.phone.isNotEmpty
        ? widget.phone
        : authProvider.pendingVerificationPhone ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify Phone'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: AppColors.primaryGradient,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.sms_outlined,
                    color: Colors.white,
                    size: 42,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Enter verification code',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                phone.isEmpty
                    ? 'We sent a code to your phone number.'
                    : 'We sent a code to $phone.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 28),
              CustomTextField(
                label: 'Verification Code',
                hintText: 'Enter 6 digit code',
                controller: _otpController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                prefixIcon: const Icon(Icons.lock_outline),
              ),
              const SizedBox(height: 24),
              GradientButton(
                label: authProvider.isLoading ? AppStrings.pleaseWait : 'Verify',
                onPressed: _verify,
                isLoading: authProvider.isLoading,
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: authProvider.isLoading ? null : _resend,
                  child: const Text('Resend code'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
