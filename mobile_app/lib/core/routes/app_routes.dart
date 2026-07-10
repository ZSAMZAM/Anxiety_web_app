import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
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
import '../../features/profile/appointment_details_screen.dart';
import '../../features/profile/prediction_history_screen.dart';
import '../../features/profile/settings_screen.dart';
import '../../features/refunds/refund_history_screen.dart';
import '../../features/refunds/request_refund_screen.dart';
import '../../features/refunds/refund_details_screen.dart';
import '../../features/treatment_plan/treatment_plan_screen.dart';
import '../../models/appointment_model.dart';
import '../../models/refund_model.dart';

GoRouter createAppRouter(AuthProvider auth) => GoRouter(
  initialLocation: '/splash',
  refreshListenable: auth,
  redirect: (context, state) {
    if (auth.isLoading) return null;

    final authRoutes = {
      '/splash',
      '/login',
      '/register',
      '/verify_phone',
      '/forgot_password',
    };
    final isAuthRoute = authRoutes.contains(state.matchedLocation);
    if (!auth.isAuthenticated && !isAuthRoute) {
      return '/login';
    }
    if (auth.isAuthenticated && ['/login', '/register'].contains(state.matchedLocation)) {
      return '/dashboard';
    }
    return null;
  },
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
        final amountValue = args?['amountPaid'];
        final amountPaid = amountValue is num
            ? amountValue.toDouble()
            : double.tryParse(amountValue?.toString() ?? '') ?? 0.0;
        return BookingSuccessScreen(
          paymentId: args?['paymentId']?.toString() ?? '',
          bookingId: args?['bookingId']?.toString() ?? '',
          doctorName: args?['doctorName']?.toString() ?? 'Selected therapist',
          doctorId: args?['doctorId']?.toString() ?? '',
          referenceNumber: args?['referenceNumber']?.toString() ?? '',
          date: args?['date']?.toString() ?? '',
          time: args?['time']?.toString() ?? '',
          paymentMethod: args?['paymentMethod']?.toString() ?? '',
          amountPaid: amountPaid,
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
      path: '/appointment_details',
      builder: (context, state) {
        final appointment = state.extra as AppointmentModel?;
        return appointment == null
            ? const AppointmentHistoryScreen()
            : AppointmentDetailsScreen(appointment: appointment);
      },
    ),
    GoRoute(
      path: '/request_refund',
      builder: (context, state) {
        final appointment = state.extra as AppointmentModel?;
        return appointment == null
            ? const AppointmentHistoryScreen()
            : RequestRefundScreen(appointment: appointment);
      },
    ),
    GoRoute(
      path: '/refunds',
      builder: (context, state) => const RefundHistoryScreen(),
    ),
    GoRoute(
      path: '/treatment_plan',
      builder: (context, state) => const TreatmentPlanScreen(),
    ),
    GoRoute(
      path: '/treatment_plan/:reportId',
      builder: (context, state) => TreatmentPlanScreen(
        reportId: state.pathParameters['reportId'],
      ),
    ),
    GoRoute(
      path: '/refund_details',
      builder: (context, state) {
        final extra = state.extra;
        return RefundDetailsScreen(
          refund: extra is RefundModel ? extra : null,
          refundId: extra is String ? extra : null,
        );
      },
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
