import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException({required this.message, this.statusCode});

  @override
  String toString() => message;

  factory ApiException.fromDioException(dynamic exception) {
    if (exception is DioException) {
      final response = exception.response;
      final statusCode = response?.statusCode;
      if (exception.error is ApiException) {
        return exception.error as ApiException;
      }
      if (response != null && response.data != null) {
        final data = response.data;
        if (data is Map<String, dynamic> && data['error'] != null) {
          return ApiException(
            message: data['error'].toString(),
            statusCode: statusCode,
          );
        }
      }

      if (statusCode == 401) {
        return ApiException(message: 'Unauthorized. Please log in again.', statusCode: 401);
      }
      if (statusCode == 403) {
        return ApiException(message: 'Forbidden. You do not have access.', statusCode: 403);
      }
      if (statusCode == 404) {
        return ApiException(message: 'Endpoint not found.', statusCode: 404);
      }
      if (statusCode == 500) {
        return ApiException(message: 'Server error. Please try again later.', statusCode: 500);
      }

      if (exception.type == DioExceptionType.connectionTimeout ||
          exception.type == DioExceptionType.receiveTimeout ||
          exception.type == DioExceptionType.sendTimeout) {
        return ApiException(message: 'Request timed out. Please check your connection.', statusCode: statusCode);
      }
      if (exception.type == DioExceptionType.badResponse) {
        return ApiException(message: 'Server error. Please try again later.', statusCode: statusCode);
      }

      return ApiException(message: exception.message ?? 'Network error occurred.', statusCode: statusCode);
    }

    return ApiException(message: exception.toString());
  }
}
