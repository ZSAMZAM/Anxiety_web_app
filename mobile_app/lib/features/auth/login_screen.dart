import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/dialogs.dart';
import '../../core/widgets/text_fields.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 700))..forward();
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    _slide = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(_fade);
  }

  @override
  void dispose() {
    _controller.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.login(_usernameController.text.trim(), _passwordController.text);

    if (!mounted) return;
    if (success) {
      showSuccessSnackbar(context, AppStrings.loginSuccess);
      context.go('/dashboard');
    } else {
      showErrorSnackbar(context, authProvider.error ?? AppStrings.invalidCredentials);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, const Color(0xFF0D1D2F)]
                : [const Color(0xFFEAF7FB), AppColors.lightBackground],
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fade,
            child: SlideTransition(
              position: _slide,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 18, 24, 30),
                children: [
                  const SizedBox(height: 8),
                  _HeroIllustration(isDark: isDark),
                  const SizedBox(height: 28),
                  Text(
                    'Welcome to AnxietyCare',
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Private mental health support, assessments, doctors, bookings, and updates in one calm space.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 28),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkCard.withOpacity(0.92) : Colors.white.withOpacity(0.92),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(isDark ? 0.25 : 0.08),
                          blurRadius: 30,
                          spreadRadius: -12,
                          offset: const Offset(0, 20),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Sign in securely', style: Theme.of(context).textTheme.headlineSmall),
                          const SizedBox(height: 6),
                          Text('Patient accounts only on mobile.', style: Theme.of(context).textTheme.bodyMedium),
                          const SizedBox(height: 22),
                          CustomTextField(
                            label: AppStrings.username,
                            hintText: 'Enter your username',
                            controller: _usernameController,
                            prefixIcon: const Icon(Icons.person_rounded),
                            validator: (value) {
                              final trimmed = value?.trim() ?? '';
                              if (trimmed.isEmpty) return 'Username is required.';
                              if (trimmed.length < 3) return AppStrings.invalidUsername;
                              return null;
                            },
                          ),
                          const SizedBox(height: 18),
                          CustomTextField(
                            label: AppStrings.password,
                            hintText: 'Enter your password',
                            controller: _passwordController,
                            obscureText: true,
                            prefixIcon: const Icon(Icons.lock_rounded),
                            validator: (value) {
                              if (value?.isEmpty ?? true) return 'Password is required.';
                              if (value!.length < 6) return AppStrings.passwordTooShort;
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () => context.push('/forgot_password'),
                              child: Text(AppStrings.forgotPassword),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Consumer<AuthProvider>(
                            builder: (context, authProvider, _) {
                              return GradientButton(
                                label: AppStrings.login,
                                onPressed: _handleLogin,
                                isLoading: authProvider.isLoading,
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(AppStrings.dontHaveAccount, style: Theme.of(context).textTheme.bodyMedium),
                      TextButton(
                        onPressed: () => context.push('/register'),
                        child: Text(AppStrings.signUp),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroIllustration extends StatelessWidget {
  final bool isDark;

  const _HeroIllustration({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 210,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(34),
        gradient: LinearGradient(
          colors: isDark ? AppColors.darkCalmGradient : AppColors.calmGradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      child: Stack(
        children: [
          Positioned(
            right: 22,
            top: 22,
            child: _Bubble(size: 72, color: AppColors.lightSecondary.withOpacity(0.16)),
          ),
          Positioned(
            left: 20,
            bottom: 22,
            child: _Bubble(size: 54, color: AppColors.lightAccent.withOpacity(0.16)),
          ),
          Center(
            child: TweenAnimationBuilder<double>(
              duration: const Duration(milliseconds: 900),
              tween: Tween(begin: 0.88, end: 1),
              curve: Curves.elasticOut,
              builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
              child: Container(
                width: 112,
                height: 112,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: AppColors.primaryGradient),
                  borderRadius: BorderRadius.circular(34),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.lightPrimary.withOpacity(0.28),
                      blurRadius: 30,
                      offset: const Offset(0, 18),
                    ),
                  ],
                ),
                child: const Icon(Icons.psychology_alt_rounded, size: 58, color: Colors.white),
              ),
            ),
          ),
          Positioned(
            left: 24,
            top: 24,
            child: _TrustPill(icon: Icons.verified_user_rounded, label: 'Private'),
          ),
          Positioned(
            right: 24,
            bottom: 24,
            child: _TrustPill(icon: Icons.favorite_rounded, label: 'Care'),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final double size;
  final Color color;

  const _Bubble({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _TrustPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _TrustPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface.withOpacity(0.82),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 6),
          Text(label, style: Theme.of(context).textTheme.labelSmall),
        ],
      ),
    );
  }
}
