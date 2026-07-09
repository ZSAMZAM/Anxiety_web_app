import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/auth_provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToNext();
  }

  void _navigateToNext() async {
    await Future.delayed(Duration(seconds: AppConstants.splashDuration));
    if (!mounted) return;

    final authProvider = context.read<AuthProvider>();
    if (authProvider.isAuthenticated) {
      context.go('/dashboard');
      return;
    }

    if (authProvider.isLoading) {
      await Future.doWhile(() async {
        await Future.delayed(Duration(milliseconds: 100));
        return authProvider.isLoading && mounted;
      });
    }

    if (!mounted) return;
    context.go(authProvider.isAuthenticated ? '/dashboard' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: AppColors.primaryGradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.favorite,
                  size: 60,
                  color: Colors.white,
                ),
              )
                  .animate(onPlay: (controller) => controller.repeat())
                  .scale(
                    duration: const Duration(milliseconds: 1500),
                    begin: const Offset(0.8, 0.8),
                    end: const Offset(1.0, 1.0),
                  ),
              const SizedBox(height: 32),
              Text(
                AppStrings.appName,
                style: Theme.of(context).textTheme.displayMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                textAlign: TextAlign.center,
              )
                  .animate()
                  .fadeIn(duration: const Duration(milliseconds: 800))
                  .slideY(begin: 0.3, end: 0),
              const SizedBox(height: 16),
              Text(
                AppStrings.splashTagline,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white.withOpacity(0.9),
                    ),
                textAlign: TextAlign.center,
              )
                  .animate()
                  .fadeIn(
                    duration: const Duration(milliseconds: 800),
                    delay: const Duration(milliseconds: 200),
                  )
                  .slideY(begin: 0.3, end: 0),
              const SizedBox(height: 64),
              SizedBox(
                width: 8,
                height: 8,
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 1.5,
                ),
              )
                  .animate()
                  .fadeIn(
                    duration: const Duration(milliseconds: 800),
                    delay: const Duration(milliseconds: 400),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}
