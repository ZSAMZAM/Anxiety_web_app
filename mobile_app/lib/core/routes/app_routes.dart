import 'package:go_router/go_router.dart';
import '../../features/auth/splash_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/auth/phone_verification_screen.dart';
import '../../features/auth/forgot_password_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/assessment/assessment_screen.dart';
import '../../features/prediction/prediction_result_screen.dart';
import '../../features/recommendations/recommendations_screen.dart';
import '../../features/doctors/doctor_list_screen.dart';
import '../../features/doctors/doctor_profile_screen.dart';
import '../../features/booking/booking_screen.dart';
import '../../features/payments/payment_screen.dart';
import '../../features/booking/booking_success_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/appointment_history_screen.dart';
import '../../features/profile/prediction_history_screen.dart';
import '../../features/profile/settings_screen.dart';

final appRoutes = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      builder: (context, state) =>
          const SplashScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) =>
          const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) =>
          const RegisterScreen(),
    ),
    GoRoute(
      path: '/verify_phone',
      builder: (context, state) {
        final phone = state.extra as String?;
        return PhoneVerificationScreen(phone: phone ?? '');
      },
    ),
    GoRoute(
      path: '/forgot_password',
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) =>
          const DashboardScreen(),
    ),
    GoRoute(
      path: '/assessment',
      builder: (context, state) =>
          const AssessmentScreen(),
    ),
    GoRoute(
      path: '/prediction_result',
      builder: (context, state) =>
          const PredictionResultScreen(),
    ),
    GoRoute(
      path: '/recommendations',
      builder: (context, state) =>
          const RecommendationsScreen(),
    ),
    GoRoute(
      path: '/doctors',
      builder: (context, state) =>
          const DoctorListScreen(),
    ),
    GoRoute(
      path: '/doctor_profile',
      builder: (context, state) {
        final doctorId =
            state.extra as String?;
        return DoctorProfileScreen(
          doctorId: doctorId ?? '',
        );
      },
    ),
    GoRoute(
      path: '/booking',
      builder: (context, state) {
        final doctorId =
            state.extra as String?;
        return BookingScreen(
          doctorId: doctorId ?? '',
        );
      },
    ),
    GoRoute(
      path: '/payment',
      builder: (context, state) {
        final args =
            state.extra as Map<String, dynamic>?;
        final feeValue = args?['fee'];
        final fee = feeValue is num
            ? feeValue.toDouble()
            : double.tryParse(feeValue?.toString() ?? '') ?? 0.0;
        return PaymentScreen(
          bookingId: args?['bookingId']?.toString() ?? '',
          doctorId: args?['doctorId']?.toString() ?? '',
          fee: fee,
          appointmentDate: args?['appointmentDate']?.toString() ?? '',
          appointmentTime: args?['appointmentTime']?.toString() ?? '',
        );
      },
    ),
    GoRoute(
      path: '/booking_success',
      builder: (context, state) {
        final args =
            state.extra as Map<String, dynamic>?;
        return BookingSuccessScreen(
          doctorId: args?['doctorId']?.toString() ?? '',
          referenceNumber: args?['referenceNumber']?.toString() ?? '',
          date: args?['date']?.toString() ?? '',
          time: args?['time']?.toString() ?? '',
        );
      },
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) =>
          const NotificationsScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) =>
          const ProfileScreen(),
    ),
    GoRoute(
      path: '/appointment_history',
      builder: (context, state) =>
          const AppointmentHistoryScreen(),
    ),
    GoRoute(
      path: '/prediction_history',
      builder: (context, state) =>
          const PredictionHistoryScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
);
