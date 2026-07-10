import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/app_strings.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/dialogs.dart';
import '../../core/widgets/text_fields.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({Key? key}) : super(key: key);

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _otpSent = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String _normalizedPhone() {
    final raw = _phoneController.text.trim();
    final digits = raw.replaceAll(RegExp(r'[^\d+]'), '');
    if (digits.startsWith('+252')) return digits;
    if (digits.startsWith('252')) return '+$digits';
    if (digits.startsWith('0')) return '+252${digits.substring(1)}';
    if (digits.startsWith('6')) return '+252$digits';
    return digits;
  }

  Future<void> _requestResetOtp() async {
    final phone = _normalizedPhone();
    if (phone.isEmpty) {
      showErrorSnackbar(context, 'Enter your phone number.');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await context.read<ApiService>().post(
            AppConstants.forgotPasswordEndpoint,
            data: {'phone': phone},
          );
      if (!mounted) return;
      setState(() {
        _otpSent = true;
        _phoneController.text = phone;
      });
      showSuccessSnackbar(context, 'A reset code was sent to your phone.');
    } catch (error) {
      showErrorSnackbar(
        context,
        error is ApiException ? error.message : 'Unable to request password reset.',
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _resetPassword() async {
    final phone = _normalizedPhone();
    final otp = _otpController.text.trim();
    final password = _passwordController.text;

    if (otp.length != 6) {
      showErrorSnackbar(context, 'Enter the 6-digit OTP code.');
      return;
    }
    if (!_isStrongPassword(password)) {
      showErrorSnackbar(context, AppStrings.passwordRequirements);
      return;
    }
    if (password != _confirmPasswordController.text) {
      showErrorSnackbar(context, AppStrings.passwordMismatch);
      return;
    }

    setState(() => _isLoading = true);
    try {
      await context.read<ApiService>().post(
            AppConstants.resetPasswordEndpoint,
            data: {
              'phone': phone,
              'otp_code': otp,
              'password': password,
            },
          );
      if (!mounted) return;
      showSuccessSnackbar(context, 'Password updated. You can log in now.');
      context.go('/login');
    } catch (error) {
      showErrorSnackbar(
        context,
        error is ApiException ? error.message : 'Unable to reset password.',
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  bool _isStrongPassword(String value) {
    return value.length >= AppConstants.minPasswordLength &&
        RegExp(r'[A-Z]').hasMatch(value) &&
        RegExp(r'[a-z]').hasMatch(value) &&
        RegExp(r'[0-9]').hasMatch(value) &&
        RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.forgotPassword),
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
                    color: AppColors.lightPrimary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.sms_outlined,
                    color: AppColors.lightPrimary,
                    size: 44,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Text(
                _otpSent ? 'Enter your reset code' : 'Reset your password',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _otpSent
                    ? 'Enter the OTP sent to your phone and choose a new password.'
                    : 'Enter your registered phone number to receive a reset OTP.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 28),
              CustomTextField(
                label: 'Phone number',
                hintText: '+25261XXXXXXX',
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                prefixIcon: const Icon(Icons.phone_outlined),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d+]')),
                ],
              ),
              const SizedBox(height: 16),
              if (_otpSent) ...[
                CustomTextField(
                  label: 'OTP code',
                  hintText: '6-digit code',
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  prefixIcon: const Icon(Icons.verified_outlined),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: AppStrings.password,
                  hintText: AppStrings.password,
                  controller: _passwordController,
                  obscureText: true,
                  prefixIcon: const Icon(Icons.lock_outline),
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: AppStrings.confirmPassword,
                  hintText: AppStrings.confirmPassword,
                  controller: _confirmPasswordController,
                  obscureText: true,
                  prefixIcon: const Icon(Icons.lock_outline),
                ),
                const SizedBox(height: 24),
                GradientButton(
                  label: _isLoading ? AppStrings.pleaseWait : 'Update password',
                  onPressed: _resetPassword,
                  isLoading: _isLoading,
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: _isLoading ? null : _requestResetOtp,
                  child: const Text('Resend OTP'),
                ),
              ] else ...[
                const SizedBox(height: 8),
                GradientButton(
                  label: _isLoading ? AppStrings.pleaseWait : 'Send OTP',
                  onPressed: _requestResetOtp,
                  isLoading: _isLoading,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
