import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../services/secure_storage_service.dart';
import '../constants/api_config.dart';
import 'api_exception.dart';

// Single backend gateway for the patient mobile app. It attaches the stored
// JWT to every request and clears local auth when the server rejects a token.
class ApiService {
  final Dio _dio;
  final SecureStorageService _secureStorage;
  VoidCallback? onUnauthorized;

  ApiService({SecureStorageService? secureStorage})
      : _secureStorage = secureStorage ?? SecureStorageService(),
        _dio = Dio(
          BaseOptions(
            baseUrl: ApiConfig.baseUrl,
            connectTimeout: Duration(seconds: 45),
            receiveTimeout: Duration(seconds: 90),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final isPublicAuthRequest = _isPublicAuthPath(options.path);
          final token = await _secureStorage.getToken();
          if (token != null && !isPublicAuthRequest) {
            options.headers['Authorization'] = 'Bearer $token';
          } else {
            options.headers.remove('Authorization');
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          final apiError = ApiException.fromDioException(error);
          final isPublicAuthRequest = _isPublicAuthPath(error.requestOptions.path);
          if (apiError.statusCode == 401 && !isPublicAuthRequest) {
            await _secureStorage.clearAll();
            onUnauthorized?.call();
          }
          handler.reject(DioException(
            requestOptions: error.requestOptions,
            response: error.response,
            error: apiError,
          ));
        },
      ),
    );
  }

  bool _isPublicAuthPath(String path) {
    return path == '/api/login' ||
        path == '/login' ||
        path == '/api/register' ||
        path == '/api/register/phone-availability' ||
        path == '/api/otp/send' ||
        path == '/api/otp/verify' ||
        path == '/api/forgot-password' ||
        path == '/api/reset-password';
  }

  Future<Response<T>> get<T>(
    String endpoint, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.get<T>(
        endpoint,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<Response<T>> post<T>(
    String endpoint, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.post<T>(
        endpoint,
        data: data,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<Response<T>> put<T>(
    String endpoint, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.put<T>(
        endpoint,
        data: data,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<Response<T>> delete<T>(
    String endpoint, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.delete<T>(
        endpoint,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<List<int>> downloadPaymentReceipt(String paymentId) async {
    try {
      final response = await _dio.get<List<int>>(
        '/api/payments/$paymentId/receipt',
        options: Options(responseType: ResponseType.bytes),
      );
      return response.data ?? <int>[];
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<List<int>> downloadTreatmentPlanPdf(String reportId) async {
    try {
      final response = await _dio.get<List<int>>(
        '/api/patient/treatment-plan/$reportId/export/pdf',
        options: Options(responseType: ResponseType.bytes),
      );
      return response.data ?? <int>[];
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException exception) {
    final error = exception.error;
    if (error is ApiException) {
      return error;
    }
    return ApiException.fromDioException(exception);
  }

  Future<void> saveToken(String token) async {
    await _secureStorage.saveToken(token);
  }

  Future<String?> getToken() async {
    return await _secureStorage.getToken();
  }

  Future<void> clearToken() async {
    await _secureStorage.clearToken();
  }

  Future<void> saveUserSession({
    required String userId,
    required String username,
    required String role,
  }) async {
    await _secureStorage.saveUserId(userId);
    await _secureStorage.saveUsername(username);
    await _secureStorage.saveRole(role);
  }

  Future<void> clearSession() async {
    await _secureStorage.clearAll();
  }
}
