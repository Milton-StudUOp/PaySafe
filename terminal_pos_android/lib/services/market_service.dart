import 'dart:convert';
import 'auth_service.dart';

/// Service for market operations using the backend API.
class MarketService {
  final AuthService _authService = AuthService();

  /// Get list of approved and active markets for dropdowns.
  /// Returns markets within the agent's jurisdiction.
  Future<List<Map<String, dynamic>>> getApprovedActiveMarkets() async {
    final response = await _authService.authenticatedGet(
      '/markets/approved-active/',
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else if (response.statusCode == 401) {
      throw Exception('Sessão expirada. Faça login novamente.');
    } else if (response.statusCode == 403) {
      throw Exception('Sem permissão para aceder aos mercados.');
    } else {
      final error = jsonDecode(response.body);
      throw Exception(
        error['detail'] ?? 'Erro ao buscar mercados (${response.statusCode})',
      );
    }
  }

  /// Alias for getApprovedActiveMarkets - used by some screens
  Future<List<Map<String, dynamic>>> getApprovedMarkets() async {
    return getApprovedActiveMarkets();
  }

  /// Get all markets with pagination.
  Future<List<Map<String, dynamic>>> getMarkets({
    int skip = 0,
    int limit = 100,
  }) async {
    final response = await _authService.authenticatedGet(
      '/markets/?skip=$skip&limit=$limit',
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Erro ao buscar mercados');
    }
  }

  /// Get market by ID.
  Future<Map<String, dynamic>> getMarket(int marketId) async {
    final response = await _authService.authenticatedGet('/markets/$marketId');

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Mercado não encontrado');
    }
  }

  /// Get market by ID (nullable for screens that expect null on not found).
  Future<Map<String, dynamic>?> getMarketById(int marketId) async {
    try {
      return await getMarket(marketId);
    } catch (e) {
      return null;
    }
  }
}
