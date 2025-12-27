import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'offline_auth_service.dart';
import 'connectivity_service.dart';
import 'smart_http_client.dart';

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
      // Online login failed, try offline
    }

    // Backend unavailable, try offline login
    if (await _offlineAuth.hasCachedCredentials(agentCode)) {
      return await offlineLogin(agentCode, pin);
    }

    // No cached credentials available
    throw Exception(
      'Servidor indisponível e sem credenciais offline. Conecte-se online pelo menos uma vez.',
    );
  }

  /// Check if currently in offline mode.
  Future<bool> isOfflineMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_offlineModeKey) ?? false;
  }

  /// Refresh token when connection is restored after offline session.
  /// Uses cached credentials to get a new valid JWT token from the server.
  /// Returns true if token was successfully refreshed.
  Future<bool> refreshTokenOnReconnect() async {
    try {
      // Only refresh if we were in offline mode
      final wasOffline = await isOfflineMode();
      if (!wasOffline) return true; // Already online, token should be valid

      // Check if we're actually online now
      final isOnline = await _connectivity.checkConnectivity();
      if (!isOnline) return false; // Still offline

      // Get cached credentials
      final prefs = await SharedPreferences.getInstance();
      final agentCode = prefs.getString(_agentCodeKey);
      if (agentCode == null) return false;

      // Get cached PIN from offline auth service
      final cachedPin = await _offlineAuth.getCachedPin(agentCode);
      if (cachedPin == null) return false;

      // Get device serial
      final deviceData = await getDeviceData();
      final deviceSerial = deviceData?['serial_number'] ?? '';

      // Attempt online login to get fresh token
      await posLogin(agentCode, cachedPin, deviceSerial);

      // Success! Offline mode flag is cleared by posLogin
      return true;
    } catch (e) {
      // Failed to refresh, user may need to re-login
      return false;
    }
  }

  /// Check if current token is valid (not an offline fake token).
  Future<bool> hasValidOnlineToken() async {
    final token = await getToken();
    if (token == null) return false;
    // Offline tokens start with 'offline_session_'
    return !token.startsWith('offline_session_');
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
  /// Uses SmartHttpClient for connectivity-aware requests.
  /// Throws [OfflineException] if offline.
  Future<http.Response> authenticatedGet(
    String endpoint, {
    bool checkConnectivity = true,
  }) async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Não autenticado');
    }

    // Use SmartHttpClient for connectivity-aware requests
    final smartClient = SmartHttpClient();
    return smartClient.get(
      endpoint,
      requireAuth: true,
      checkConnectivity: checkConnectivity,
    );
  }

  /// Make authenticated POST request with token header.
  /// Uses SmartHttpClient for connectivity-aware requests.
  /// Throws [OfflineException] if offline.
  Future<http.Response> authenticatedPost(
    String endpoint,
    Map<String, dynamic> body, {
    bool checkConnectivity = true,
  }) async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Não autenticado');
    }

    // Use SmartHttpClient for connectivity-aware requests
    final smartClient = SmartHttpClient();
    return smartClient.post(
      endpoint,
      body,
      requireAuth: true,
      checkConnectivity: checkConnectivity,
    );
  }
}
