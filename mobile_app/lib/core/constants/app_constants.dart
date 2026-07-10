import 'api_config.dart';

class AppConstants {
  // Backend API Configuration
  static String get baseUrl => ApiConfig.baseUrl;
  static const String loginEndpoint = '/api/login';
  static const String registerEndpoint = '/api/register';
  static const String phoneAvailabilityEndpoint =
      '/api/register/phone-availability';
  static const String forgotPasswordEndpoint = '/api/forgot-password';
  static const String resetPasswordEndpoint = '/api/reset-password';
  static const String sendOtpEndpoint = '/api/otp/send';
  static const String verifyOtpEndpoint = '/api/otp/verify';
  static const String predictEndpoint = '/api/predict';
  static const String historyEndpoint = '/api/history';
  static const String doctorsEndpoint = '/api/doctors';
  static const String doctorAvailabilityEndpoint = '/api/doctors/'; // + doctorId/availability
  static const String bookingEndpoint = '/api/appointments';
  static const String paymentEndpoint = '/api/payments';
  static String paymentStatusEndpoint(String paymentId) =>
      '/api/payments/$paymentId/status';
  static const String refundsEndpoint = '/api/refunds';
  static const String recommendationsEndpoint = '/api/recommendations';
  static const String notificationsEndpoint = '/api/user/notifications';
  static const String latestTreatmentPlanEndpoint =
      '/api/patient/treatment-plan/latest';
  static const String treatmentPlansEndpoint = '/api/patient/treatment-plans';
  static String treatmentPlanEndpoint(String reportId) =>
      '/api/patient/treatment-plan/$reportId';
  static const String userProfileEndpoint = '/api/profile';
  static const String appointmentHistoryEndpoint = '/api/appointments';
  static const String predictionHistoryEndpoint = '/api/history';
  static const String userStatsEndpoint = '/api/user/stats';

  // App Configuration
  static const String appName = 'AnxietyCare';
  static const String appVersion = '1.0.0';
  static const int splashDuration = 3; // seconds

  // Validation
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 50;
  static const int minNameLength = 2;
  static const int maxNameLength = 50;

  // Assessment
  static const String assessmentQuestion =
      'How have you been feeling today and during the past few days?';
  static const int assessmentMinChars = 20;

  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userIdKey = 'user_id';
  static const String userDataKey = 'user_data';
  static const String themeKey = 'theme_mode';
  static const String notificationsKey = 'notifications';

  // Prediction Types
  static const String predictionNeutral = 'neutral';
  static const String predictionAnxiety = 'anxiety';
  static const String predictionDepression = 'depression';

  // Appointment Status
  static const String appointmentUpcoming = 'upcoming';
  static const String appointmentCompleted = 'completed';
  static const String appointmentCancelled = 'cancelled';

  // Notification Types
  static const String notificationAppointmentReminder = 'appointment_reminder';
  static const String notificationPredictionAlert = 'prediction_alert';
  static const String notificationPaymentConfirmation = 'payment_confirmation';

  // Payment Methods
  static const String paymentMethodEVC = 'evc_plus';
  static const String paymentMethodWAAFI = 'waafi';

  // Timeouts
  static const int connectionTimeout = 30; // seconds
  static const int receiveTimeout = 30; // seconds

  // Constraints
  static const double cornerRadius = 20;
  static const double smallCornerRadius = 12;
  static const double largeCornerRadius = 30;
}
