import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_strings.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/language_provider.dart';
import '../../core/theme/app_colors.dart';
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
      showSuccessSnackbar(context, context.tr('loginSuccess'));
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
                ? AppColors.darkCalmGradient
                : AppColors.calmGradient,
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fade,
            child: SlideTransition(
              position: _slide,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 22),
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: Consumer<LanguageProvider>(
                      builder: (context, languageProvider, _) {
                        return DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: languageProvider.languageCode,
                            borderRadius: BorderRadius.circular(18),
                            icon: const Icon(Icons.language_rounded),
                            items: AppLocalizations.supportedLanguages.entries.map((entry) {
                              return DropdownMenuItem(
                                value: entry.key,
                                child: Text(entry.key == 'so' ? context.tr('somali') : context.tr('english')),
                              );
                            }).toList(),
                            onChanged: (value) {
                              if (value != null) languageProvider.setLanguage(value);
                            },
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                  _HeroIllustration(isDark: isDark),
                  const SizedBox(height: 18),
                  Text(
                    context.tr('welcomeToAnxietyCare'),
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    context.tr('loginSubtitle'),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSecondaryCard.withOpacity(0.88) : Colors.white.withOpacity(0.94),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                      boxShadow: [
                        BoxShadow(
                          color: isDark ? Colors.black.withOpacity(0.30) : AppColors.lightPrimary.withOpacity(0.10),
                          blurRadius: 34,
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
                          Text(context.tr('signInSecurely'), style: Theme.of(context).textTheme.headlineSmall),
                          const SizedBox(height: 6),
                          Text(context.tr('patientAccountsOnly'), style: Theme.of(context).textTheme.bodyMedium),
                          const SizedBox(height: 16),
                          CustomTextField(
                            label: context.tr('username'),
                            hintText: context.tr('enterUsername'),
                            controller: _usernameController,
                            prefixIcon: const Icon(Icons.person_rounded),
                            validator: (value) {
                              final trimmed = value?.trim() ?? '';
                              if (trimmed.isEmpty) return context.tr('usernameRequired');
                              if (trimmed.length < 3) return AppStrings.invalidUsername;
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),
                          CustomTextField(
                            label: context.tr('password'),
                            hintText: context.tr('enterPassword'),
                            controller: _passwordController,
                            obscureText: true,
                            prefixIcon: const Icon(Icons.lock_rounded),
                            validator: (value) {
                              if (value?.isEmpty ?? true) return context.tr('passwordRequired');
                              if (value!.length < 6) return AppStrings.passwordTooShort;
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () => context.push('/forgot_password'),
                              child: Text(context.tr('forgotPassword')),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Consumer<AuthProvider>(
                            builder: (context, authProvider, _) {
                              return Container(
                                height: 58,
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: AppColors.primaryGradient,
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primaryGradient.first.withOpacity(0.3),
                                      blurRadius: 22,
                                      spreadRadius: -6,
                                      offset: const Offset(0, 14),
                                    ),
                                  ],
                                ),
                                child: ElevatedButton(
                                  key: const ValueKey('mobile-login-submit'),
                                  onPressed: authProvider.isLoading ? null : _handleLogin,
                                  style: ElevatedButton.styleFrom(
                                    elevation: 0,
                                    shadowColor: Colors.transparent,
                                    backgroundColor: Colors.transparent,
                                    disabledBackgroundColor: Colors.transparent,
                                    foregroundColor: Colors.white,
                                    disabledForegroundColor: Colors.white70,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                  ),
                                  child: authProvider.isLoading
                                      ? const SizedBox(
                                          height: 24,
                                          width: 24,
                                          child: CircularProgressIndicator(
                                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : Text(
                                          context.tr('login'),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 16,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(context.tr('dontHaveAccount'), style: Theme.of(context).textTheme.bodyMedium),
                      TextButton(
                        onPressed: () {
                          FocusScope.of(context).unfocus();
                          context.push('/register');
                        },
                        child: Text(context.tr('signUp')),
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
