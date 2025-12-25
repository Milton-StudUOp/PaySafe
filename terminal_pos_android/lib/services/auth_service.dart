import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

/// Service for authentication using the backend API.
/// Uses /api/v1/auth/pos-login for POS device login with agent-device binding.
class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static const String _deviceKey = 'device_data';
  static const String _agentCodeKey = 'last_agent_code';

  /// Perform POS login with device-agent binding validation.
  /// Returns user data on success, throws exception on failure.
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
    // Keep last agent code for convenience on next login
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
}
