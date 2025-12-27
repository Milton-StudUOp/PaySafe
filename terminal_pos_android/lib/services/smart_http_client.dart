import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'connectivity_service.dart';

/// Exception thrown when the app is offline and cannot make network requests.
class OfflineException implements Exception {
  final String message;
  OfflineException([this.message = 'Sem conexão com o servidor']);

  @override
  String toString() => message;
}

/// Exception thrown when authentication fails (401).
class AuthenticationException implements Exception {
  final String message;
  AuthenticationException([
    this.message = 'Sessão expirada. Faça login novamente.',
  ]);

  @override
  String toString() => message;
}

/// Smart HTTP Client that handles connectivity awareness.
///
/// Features:
/// - Checks connectivity before making requests
/// - Throws OfflineException immediately when offline (no timeout wait)
/// - Handles 401 errors gracefully
/// - Configurable timeouts
/// - Centralized error handling
class SmartHttpClient {
  static final SmartHttpClient _instance = SmartHttpClient._internal();
  factory SmartHttpClient() => _instance;
  SmartHttpClient._internal();

  static const String _tokenKey = 'auth_token';
  final ConnectivityService _connectivity = ConnectivityService();

  /// Default request timeout
  static const Duration defaultTimeout = Duration(seconds: 10);

  /// Check if we're online before making a request.
  /// Returns true if online, false if offline.
  Future<bool> get isOnline async {
    // Use cached status first for speed
    if (!_connectivity.isConnected) return false;
    return true;
  }

  /// Get stored authentication token.
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  /// Build authorization headers.
  Future<Map<String, String>> _buildHeaders({bool requireAuth = true}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};

    if (requireAuth) {
      final token = await _getToken();
      if (token != null && !token.startsWith('offline_session_')) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  /// Make a GET request with connectivity checking.
  /// Throws [OfflineException] if offline.
  /// Throws [AuthenticationException] if 401.
  Future<http.Response> get(
    String endpoint, {
    bool requireAuth = true,
    Duration timeout = defaultTimeout,
    bool checkConnectivity = true,
  }) async {
    // Check connectivity first (immediate fail if offline)
    if (checkConnectivity && !await isOnline) {
      throw OfflineException();
    }

    try {
      final headers = await _buildHeaders(requireAuth: requireAuth);
      final response = await http
          .get(Uri.parse('${AppConstants.baseUrl}$endpoint'), headers: headers)
          .timeout(timeout);

      _handleResponseErrors(response);
      return response;
    } on TimeoutException {
      throw OfflineException('Tempo limite excedido. Verifique sua conexão.');
    } catch (e) {
      if (e is OfflineException || e is AuthenticationException) rethrow;
      throw OfflineException('Erro de rede: ${e.toString().split(':').first}');
    }
  }

  /// Make a POST request with connectivity checking.
  /// Throws [OfflineException] if offline.
  /// Throws [AuthenticationException] if 401.
  Future<http.Response> post(
    String endpoint,
    Map<String, dynamic> body, {
    bool requireAuth = true,
    Duration timeout = defaultTimeout,
    bool checkConnectivity = true,
  }) async {
    // Check connectivity first (immediate fail if offline)
    if (checkConnectivity && !await isOnline) {
      throw OfflineException();
    }

    try {
      final headers = await _buildHeaders(requireAuth: requireAuth);
      final response = await http
          .post(
            Uri.parse('${AppConstants.baseUrl}$endpoint'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(timeout);

      _handleResponseErrors(response);
      return response;
    } on TimeoutException {
      throw OfflineException('Tempo limite excedido. Verifique sua conexão.');
    } catch (e) {
      if (e is OfflineException || e is AuthenticationException) rethrow;
      throw OfflineException('Erro de rede: ${e.toString().split(':').first}');
    }
  }

  /// Make a PUT request with connectivity checking.
  Future<http.Response> put(
    String endpoint,
    Map<String, dynamic> body, {
    bool requireAuth = true,
    Duration timeout = defaultTimeout,
    bool checkConnectivity = true,
  }) async {
    if (checkConnectivity && !await isOnline) {
      throw OfflineException();
    }

    try {
      final headers = await _buildHeaders(requireAuth: requireAuth);
      final response = await http
          .put(
            Uri.parse('${AppConstants.baseUrl}$endpoint'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(timeout);

      _handleResponseErrors(response);
      return response;
    } on TimeoutException {
      throw OfflineException('Tempo limite excedido. Verifique sua conexão.');
    } catch (e) {
      if (e is OfflineException || e is AuthenticationException) rethrow;
      throw OfflineException('Erro de rede: ${e.toString().split(':').first}');
    }
  }

  /// Handle common response errors.
  void _handleResponseErrors(http.Response response) {
    if (response.statusCode == 401) {
      throw AuthenticationException();
    }
    // Other status codes are handled by the calling service
  }

  /// Make a request that tolerates offline mode (returns null instead of throwing).
  /// Useful for background sync operations.
  Future<http.Response?> tryGet(
    String endpoint, {
    bool requireAuth = true,
    Duration timeout = defaultTimeout,
  }) async {
    try {
      return await get(endpoint, requireAuth: requireAuth, timeout: timeout);
    } on OfflineException {
      debugPrint('📡 Offline: Skipping request to $endpoint');
      return null;
    } on AuthenticationException {
      debugPrint('🔐 Auth failed for $endpoint');
      return null;
    } catch (e) {
      debugPrint('❌ Request error for $endpoint: $e');
      return null;
    }
  }

  /// Make a POST request that tolerates offline mode.
  Future<http.Response?> tryPost(
    String endpoint,
    Map<String, dynamic> body, {
    bool requireAuth = true,
    Duration timeout = defaultTimeout,
  }) async {
    try {
      return await post(
        endpoint,
        body,
        requireAuth: requireAuth,
        timeout: timeout,
      );
    } on OfflineException {
      debugPrint('📡 Offline: Skipping POST to $endpoint');
      return null;
    } on AuthenticationException {
      debugPrint('🔐 Auth failed for POST $endpoint');
      return null;
    } catch (e) {
      debugPrint('❌ POST error for $endpoint: $e');
      return null;
    }
  }
}
