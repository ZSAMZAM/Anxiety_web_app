import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/network/api_client.dart';
import 'core/providers/auth_provider.dart';
import 'core/providers/dashboard_provider.dart';
import 'core/providers/assessment_provider.dart';
import 'core/providers/doctor_provider.dart';
import 'core/providers/booking_provider.dart';
import 'core/providers/language_provider.dart';
import 'core/providers/theme_provider.dart';
import 'providers/profile_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/prediction_provider.dart';
import 'providers/appointment_provider.dart';
import 'providers/refund_provider.dart';
import 'providers/treatment_plan_provider.dart';
import 'core/routes/app_routes.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final ApiService _apiService;

  @override
  void initState() {
    super.initState();
    _apiService = ApiService();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>(
          create: (_) => _apiService,
        ),
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(
            apiService: _apiService,
          )..initAuth(),
        ),
        ChangeNotifierProvider<DashboardProvider>(
          create: (_) => DashboardProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<AssessmentProvider>(
          create: (_) => AssessmentProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<DoctorProvider>(
          create: (_) => DoctorProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<BookingProvider>(
          create: (_) => BookingProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<ProfileProvider>(
          create: (_) => ProfileProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<NotificationProvider>(
          create: (_) => NotificationProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<PredictionProvider>(
          create: (_) => PredictionProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<AppointmentProvider>(
          create: (_) => AppointmentProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<RefundProvider>(
          create: (_) => RefundProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<TreatmentPlanProvider>(
          create: (_) => TreatmentPlanProvider(
            apiService: _apiService,
          ),
        ),
        ChangeNotifierProvider<ThemeProvider>(
          create: (_) => ThemeProvider()..loadTheme(),
        ),
        ChangeNotifierProvider<LanguageProvider>(
          create: (_) => LanguageProvider()..loadLanguage(),
        ),
      ],
      child: const _AppShell(),
    );
  }
}

class _AppShell extends StatefulWidget {
  const _AppShell();

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  late final _router = createAppRouter(context.read<AuthProvider>());

  @override
  Widget build(BuildContext context) {
    return Consumer2<ThemeProvider, LanguageProvider>(
      builder: (context, themeProvider, languageProvider, _) {
        return MaterialApp.router(
          title: 'AnxietyCare',
          theme: AppTheme.lightTheme(),
          darkTheme: AppTheme.darkTheme(),
          themeMode: themeProvider.themeMode,
          locale: Locale(languageProvider.languageCode),
          routerConfig: _router,
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
}
