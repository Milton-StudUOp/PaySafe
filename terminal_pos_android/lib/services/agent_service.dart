import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';
import 'auth_service.dart';

/// Service for agent operations using the backend API.
class AgentService {
  final AuthService _authService = AuthService();

  /// Get agent by ID.
  Future<Map<String, dynamic>> getAgent(int agentId) async {
    final response = await _authService.authenticatedGet('/agents/$agentId');

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Agente não encontrado');
    }
  }

  /// Reset agent PIN (admin endpoint).
  /// Note: This requires admin access on backend.
  Future<Map<String, dynamic>> resetPin(int agentId) async {
    final response = await _authService.authenticatedPost(
      '/agents/$agentId/reset-pin',
      {},
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['detail'] ?? 'Erro ao redefinir PIN');
    }
  }

  /// Update agent PIN (for self-service PIN change).
  /// Uses the PUT /agents/{id} endpoint with pin field.
  Future<Map<String, dynamic>> updatePin(int agentId, String newPin) async {
    final token = await _authService.getToken();
    if (token == null) {
      throw Exception('Não autenticado');
    }

    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/agents/$agentId'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'pin': newPin}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['detail'] ?? 'Erro ao atualizar PIN');
    }
  }

  /// Update agent details (for profile updates).
  Future<Map<String, dynamic>> updateAgent(
    int agentId,
    Map<String, dynamic> updates,
  ) async {
    final token = await _authService.getToken();
    if (token == null) {
      throw Exception('Não autenticado');
    }

    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/agents/$agentId'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(updates),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['detail'] ?? 'Erro ao atualizar agente');
    }
  }
}
