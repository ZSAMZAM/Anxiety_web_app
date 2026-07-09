import 'package:flutter/foundation.dart';

class ApiConfig {
  static const String _localApi = 'http://127.0.0.1:5000';
  static const String _emulatorApi = 'http://10.0.2.2:5000';

  static String get baseUrl {
    if (kIsWeb) {
      return _localApi;
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return _emulatorApi;
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
      case TargetPlatform.fuchsia:
        return _localApi;
    }
  }
}
