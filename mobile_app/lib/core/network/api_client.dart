import 'package:dio/dio.dart';
import '../../services/secure_storage_service.dart';
import '../constants/api_config.dart';
import 'api_exception.dart';

class ApiService {
  final Dio _dio;
  final SecureStorageService _secureStorage;

  ApiService({SecureStorageService? secureStorage})
      : _secureStorage = secureStorage ?? SecureStorageService(),
        _dio = Dio(
          BaseOptions(
            baseUrl: ApiConfig.baseUrl,
            connectTimeout: Duration(seconds: 30),
            receiveTimeout: Duration(seconds: 30),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _secureStorage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          final apiError = ApiException.fromDioException(error);
          if (apiError.statusCode == 401) {
            await _secureStorage.clearAll();
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
