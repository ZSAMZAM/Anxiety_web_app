import 'package:flutter/material.dart';
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
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  String? _resetToken;
  bool _isLoading = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _requestReset() async {
    final username = _usernameController.text.trim();
    if (username.isEmpty) {
      showErrorSnackbar(context, 'Enter your username.');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await context.read<ApiService>().post(
            AppConstants.forgotPasswordEndpoint,
            data: {'username': username},
          );
      final data = response.data as Map<String, dynamic>? ?? {};
      setState(() => _resetToken = data['reset_token']?.toString());
      showSuccessSnackbar(context, 'Reset token generated.');
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
    final token = _resetToken;
    final password = _passwordController.text;

    if (token == null || token.isEmpty) {
      showErrorSnackbar(context, 'Request a reset token first.');
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
              'token': token,
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
    final hasToken = _resetToken != null && _resetToken!.isNotEmpty;

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
                    Icons.lock_reset,
                    color: AppColors.lightPrimary,
                    size: 44,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Text(
                hasToken ? 'Create a new password' : 'Reset your password',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                hasToken
                    ? 'Enter a secure new password for your account.'
                    : 'Enter your username to generate a password reset token.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 28),
              if (!hasToken) ...[
                CustomTextField(
                  label: AppStrings.username,
                  hintText: AppStrings.username,
                  controller: _usernameController,
                  prefixIcon: const Icon(Icons.person_outline),
                ),
                const SizedBox(height: 24),
                GradientButton(
                  label: _isLoading ? AppStrings.pleaseWait : 'Request reset',
                  onPressed: _requestReset,
                  isLoading: _isLoading,
                ),
              ] else ...[
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
              ],
            ],
          ),
        ),
      ),
    );
  }
}
