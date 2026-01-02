import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'offline_auth_service.dart';
import 'connectivity_service.dart';

/// Service for authentication using the backend API.
/// Uses /api/v1/auth/pos-login for POS device login with agent-device binding.
/// Supports offline login fallback when backend is unavailable.
class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static const String _deviceKey = 'device_data';
  static const String _agentCodeKey = 'last_agent_code';
  static const String _offlineModeKey = 'is_offline_mode';

  final OfflineAuthService _offlineAuth = OfflineAuthService();
  final ConnectivityService _connectivity = ConnectivityService();

  /// Perform POS login with device-agent binding validation.
  /// Returns user data on success, throws exception on failure.
  /// Caches credentials for offline login on success.
  Future<Map<String, dynamic>> posLogin(
    String agentCode,
    String pin,
    String deviceSerial,
  ) async {
    final url = Uri.parse('${AppConstants.baseUrl}/auth/pos-login');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': agentCode,
          'password': pin,
          'device_serial': deviceSerial,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // Store token and user data
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, data['access_token']);
        await prefs.setString(_userKey, jsonEncode(data['user']));
        await prefs.setString(_deviceKey, jsonEncode(data['device']));
        await prefs.setString(_agentCodeKey, agentCode);
        await prefs.setBool(_offlineModeKey, false); // Clear offline mode

        // Cache credentials for offline login
        await _offlineAuth.cacheCredentials(
          agentCode: agentCode,
          pin: pin,
          agentData: data['user'] as Map<String, dynamic>,
          deviceData: data['device'] as Map<String, dynamic>?,
        );

        return data;
      } else {
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['detail'] ?? 'Erro de autenticação');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erro de conexão: $e');
    }
  }

  /// Simple login using agent credentials (for PIN verification).
  /// Uses the agents/login endpoint.
  Future<Map<String, dynamic>> login(String agentCode, String pin) async {
    final url = Uri.parse('${AppConstants.baseUrl}/agents/login');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'agent_code': agentCode, 'pin': pin}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['detail'] ?? 'Falha na autenticação');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erro de conexão: $e');
    }
  }

  /// Get stored authentication token.
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  /// Get stored user data.
  Future<Map<String, dynamic>?> getUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString(_userKey);
    if (userData != null) {
      return jsonDecode(userData);
    }
    return null;
  }

  /// Get stored device data.
  Future<Map<String, dynamic>?> getDeviceData() async {
    final prefs = await SharedPreferences.getInstance();
    final deviceData = prefs.getString(_deviceKey);
    if (deviceData != null) {
      return jsonDecode(deviceData);
    }
    return null;
  }

  /// Get last agent code used for login.
  Future<String?> getLastAgentCode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_agentCodeKey);
  }

  /// Get last agent data for login screen (returns Map for compatibility).
  Future<Map<String, dynamic>?> getLastAgent() async {
    final agentCode = await getLastAgentCode();
    if (agentCode == null) return null;
    return {'agent_code': agentCode};
  }

  /// Check if user is currently logged in.
  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Logout - clear all stored credentials.
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    await prefs.remove(_deviceKey);
    await prefs.remove(_offlineModeKey);
    // Keep last agent code for convenience on next login
  }

  /// Attempt offline login using cached credentials.
  /// Returns user data if cache is valid, throws exception otherwise.
  Future<Map<String, dynamic>> offlineLogin(
    String agentCode,
    String pin,
  ) async {
    // Check if cached credentials exist and are valid
    if (!await _offlineAuth.isCacheValid(agentCode)) {
      throw Exception(
        'Credenciais offline expiradas. Conecte-se online para renovar.',
      );
    }

    // Validate PIN against cached hash
    final isValid = await _offlineAuth.validateOffline(agentCode, pin);
    if (!isValid) {
      throw Exception('PIN incorreto');
    }

    // Get cached data
    final agentData = await _offlineAuth.getCachedAgentData(agentCode);
    final deviceData = await _offlineAuth.getCachedDeviceData(agentCode);

    if (agentData == null) {
      throw Exception('Dados de cache inválidos');
    }

    // Store in shared preferences for session
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(agentData));
    if (deviceData != null) {
      await prefs.setString(_deviceKey, jsonEncode(deviceData));
    }
    await prefs.setString(_agentCodeKey, agentCode);
    await prefs.setString(
      _tokenKey,
      'offline_session_${DateTime.now().millisecondsSinceEpoch}',
    );
    await prefs.setBool(_offlineModeKey, true); // Mark as offline mode

    return {'user': agentData, 'device': deviceData, 'offline': true};
  }

  /// Smart login: tries online first, falls back to offline if available.
  Future<Map<String, dynamic>> smartLogin(
    String agentCode,
    String pin,
    String deviceSerial,
  ) async {
    // First, try online login
    try {
      final isOnline = await _connectivity.checkConnectivity();
      if (isOnline) {
        return await posLogin(agentCode, pin, deviceSerial);
      }
    } catch (e) {
      // Check if error is from server (not network error)
      final errorMsg = e.toString();

      // If server returned an error (not connection error), propagate it
      // This includes "POS não registrado", "PIN inválido", etc.
      if (!errorMsg.contains('Erro de conexão') &&
          !errorMsg.contains('SocketException') &&
          !errorMsg.contains('TimeoutException') &&
          !errorMsg.contains('HandshakeException')) {
        // Server responded with an error - throw it as is
        rethrow;
      }
      // Connection error - try offline fallback
    }

    // Backend unavailable, try offline login
    if (await _offlineAuth.hasCachedCredentials(agentCode)) {
      return await offlineLogin(agentCode, pin);
    }

    // No cached credentials available - provide clear message
    throw Exception(
      'Sem credenciais em cache. Conecte-se ao servidor pela primeira vez para ativar o login offline.',
    );
  }

  /// Check if currently in offline mode.
  Future<bool> isOfflineMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_offlineModeKey) ?? false;
  }

  /// Get cached credentials expiry time.
  Future<DateTime?> getOfflineCacheExpiry(String agentCode) async {
    return _offlineAuth.getCacheExpiryTime(agentCode);
  }

  /// Get last sync time.
  Future<DateTime?> getLastSyncTime() async {
    return _offlineAuth.getLastSyncTime();
  }

  /// Make authenticated HTTP request with token header.
  Future<http.Response> authenticatedGet(String endpoint) async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Não autenticado');
    }

    return http.get(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
  }

  /// Make authenticated POST request with token header.
  Future<http.Response> authenticatedPost(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Não autenticado');
    }

    return http.post(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
  }

  // ==================== SEAMLESS MODE TRANSITION ====================

  /// Set offline mode explicitly.
  Future<void> setOfflineMode(bool isOffline) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_offlineModeKey, isOffline);
  }

  /// Validate if current token is still valid with the server.
  /// Returns true if valid, false if DEFINITELY expired/invalid (401/403).
  /// Returns null if check couldn't be performed (network issue, endpoint missing, etc).
  ///
  /// NOTE: We are VERY permissive here - only explicit 401/403 causes logout.
  /// Any other error (404, 500, network) returns null to allow proceeding.
  Future<bool?> validateToken() async {
    try {
      final token = await getToken();
      if (token == null) {
        debugPrint('⚠️ validateToken: No token stored');
        return false;
      }

      debugPrint('🔐 validateToken: Checking token validity...');

      // Try a simple authenticated request to validate token
      // Use the merchants endpoint since we know it exists
      final response = await http
          .get(
            Uri.parse('${AppConstants.baseUrl}/merchants?limit=1'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 5));

      debugPrint('🔐 validateToken: Response status ${response.statusCode}');

      if (response.statusCode == 200) {
        debugPrint('✅ Token is VALID');
        return true; // Token valid
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        debugPrint('❌ Token is EXPIRED (${response.statusCode})');
        return false; // Token definitely expired/invalid
      }

      // Any other status code - can't determine, so be permissive
      debugPrint(
        '⚠️ validateToken: Unclear status ${response.statusCode}, assuming OK',
      );
      return null;
    } catch (e) {
      debugPrint('⚠️ validateToken: Error $e - assuming token OK');
      return null; // Network error - can't validate, assume OK
    }
  }

  /// Handle transition from offline to online mode.
  /// Validates token and returns result.
  Future<ModeTransitionResult> handleOnlineTransition() async {
    // Check if we even have a token
    final token = await getToken();
    if (token == null) {
      return ModeTransitionResult(
        success: false,
        requiresReauth: true,
        message: 'Sem credenciais. Por favor faça login.',
      );
    }

    // Validate token with server
    final isValid = await validateToken();

    if (isValid == false) {
      // Token definitely expired
      return ModeTransitionResult(
        success: false,
        requiresReauth: true,
        message: 'Sessão expirada. Por favor faça login novamente.',
      );
    }

    if (isValid == null) {
      // Couldn't validate (server issue), but we have a token
      // Allow transition but warn - might fail during sync
      return ModeTransitionResult(
        success: true,
        requiresReauth: false,
        message: 'Não foi possível validar sessão. Tentando sincronizar...',
      );
    }

    // Token is valid!
    await setOfflineMode(false);
    return ModeTransitionResult(success: true, requiresReauth: false);
  }
}

/// Result of a mode transition attempt.
class ModeTransitionResult {
  final bool success;
  final bool requiresReauth;
  final String? message;

  ModeTransitionResult({
    required this.success,
    this.requiresReauth = false,
    this.message,
  });
}
