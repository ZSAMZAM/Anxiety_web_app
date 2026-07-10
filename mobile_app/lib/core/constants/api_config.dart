import 'package:flutter/foundation.dart';

class ApiConfig {
  static const String _configuredApi = String.fromEnvironment('API_BASE_URL');
  static const String _debugApi = String.fromEnvironment(
    'DEBUG_API_BASE_URL',
    defaultValue: 'http://127.0.0.1:5000',
  );

  static String get baseUrl {
    if (_configuredApi.isNotEmpty) {
      return _configuredApi;
    }

    if (kReleaseMode) {
      throw StateError(
        'API_BASE_URL must be provided for production builds. '
        'Use --dart-define=API_BASE_URL=https://your-backend.onrender.com',
      );
    }

    return _debugApi;
  }
}
