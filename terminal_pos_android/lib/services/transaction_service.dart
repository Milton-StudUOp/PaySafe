import 'dart:convert';
import 'auth_service.dart';

/// Service for transaction operations using the backend API.
class TransactionService {
  final AuthService _authService = AuthService();

  /// Process a payment through the backend.
  /// This calls /payments/ which integrates with M-Pesa SDK for mobile money.
  /// For DINHEIRO (cash), the SDK is bypassed but still goes through the same endpoint.
  Future<Map<String, dynamic>> createTransaction(
    Map<String, dynamic> txData,
  ) async {
    // Use /payments/ endpoint which processes M-Pesa/eMola/mKesh payments
    // and handles the SDK integration properly
    final response = await _authService.authenticatedPost('/payments/', txData);

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['detail'] ?? 'Erro ao processar pagamento');
    }
  }

  /// Get transactions for a specific agent.
  Future<List<Map<String, dynamic>>> getAgentTransactions(
    int agentId, {
    int skip = 0,
    int limit = 50,
  }) async {
    final response = await _authService.authenticatedGet(
      '/transactions/agent/$agentId?skip=$skip&limit=$limit',
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Erro ao buscar transações');
    }
  }

  /// Get a transaction by its UUID.
  Future<Map<String, dynamic>> getTransactionByUuid(String uuid) async {
    final response = await _authService.authenticatedGet(
      '/transactions/uuid/$uuid',
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Transação não encontrada');
    }
  }

  /// Get transactions list with filters.
  Future<List<Map<String, dynamic>>> getTransactions({
    int skip = 0,
    int limit = 50,
    String? status,
    String? paymentMethod,
    int? merchantId,
    int? agentId,
    int? posId,
    String? province,
    String? district,
    String? startDate,
    String? endDate,
  }) async {
    final params = <String, String>{
      'skip': skip.toString(),
      'limit': limit.toString(),
      if (status != null) 'status': status,
      if (paymentMethod != null) 'payment_method': paymentMethod,
      if (merchantId != null) 'merchant_id': merchantId.toString(),
      if (agentId != null) 'agent_id': agentId.toString(),
      if (posId != null) 'pos_id': posId.toString(),
      if (province != null) 'province': province,
      if (district != null) 'district': district,
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
    };

    final queryString = params.entries
        .map((e) => '${e.key}=${e.value}')
        .join('&');
    final response = await _authService.authenticatedGet(
      '/transactions/?$queryString',
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Erro ao buscar transações');
    }
  }
}
