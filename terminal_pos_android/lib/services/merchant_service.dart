import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';
import 'auth_service.dart';

/// Service for merchant operations using the backend API.
class MerchantService {
  final AuthService _authService = AuthService();

  /// Search merchants by name or other criteria.
  Future<List<Map<String, dynamic>>> searchMerchants(String query) async {
    final response = await _authService.authenticatedGet(
      '/merchants/?search=${Uri.encodeComponent(query)}&limit=20',
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Erro ao buscar comerciantes');
    }
  }

  /// Get merchant by NFC UID.
  Future<Map<String, dynamic>?> getMerchantByNfc(String nfcUid) async {
    try {
      final response = await _authService.authenticatedGet(
        '/merchants/nfc/${Uri.encodeComponent(nfcUid)}',
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw Exception('Erro ao buscar comerciante');
      }
    } catch (e) {
      if (e.toString().contains('404')) return null;
      rethrow;
    }
  }

  /// Get merchant by ID.
  Future<Map<String, dynamic>> getMerchant(int merchantId) async {
    final response = await _authService.authenticatedGet(
      '/merchants/$merchantId',
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Comerciante não encontrado');
    }
  }

  /// Quick registration for ambulante (street vendor).
  /// Requires only name and market_id. No NFC, no KYC documents.
  Future<Map<String, dynamic>> createAmbulante({
    required String fullName,
    required int marketId,
    String? phoneNumber,
    String? mpesaNumber,
  }) async {
    final body = {
      'full_name': fullName,
      'market_id': marketId,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      if (mpesaNumber != null) 'mpesa_number': mpesaNumber,
    };

    final response = await _authService.authenticatedPost(
      '/merchants/ambulante',
      body,
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['detail'] ?? 'Erro ao registrar ambulante');
    }
  }

  /// Create a new merchant with full data.
  Future<Map<String, dynamic>> createMerchant({
    required String fullName,
    required int marketId,
    String? phoneNumber,
    String? mpesaNumber,
    String? emolaNumber,
    String? mkeshNumber,
    String? nfcUid,
    String? stallNumber,
    String? idNumber,
  }) async {
    final body = {
      'full_name': fullName,
      'market_id': marketId,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      if (mpesaNumber != null) 'mpesa_number': mpesaNumber,
      if (emolaNumber != null) 'emola_number': emolaNumber,
      if (mkeshNumber != null) 'mkesh_number': mkeshNumber,
      if (nfcUid != null) 'nfc_uid': nfcUid,
      if (stallNumber != null) 'stall_number': stallNumber,
      if (idNumber != null) 'id_number': idNumber,
    };

    final response = await _authService.authenticatedPost('/merchants/', body);

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['detail'] ?? 'Erro ao criar comerciante');
    }
  }

  /// Create a new merchant from a raw Map (for screens that build data as Map).
  Future<Map<String, dynamic>> createMerchantFromData(
    Map<String, dynamic> data,
  ) async {
    final response = await _authService.authenticatedPost('/merchants/', data);

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['detail'] ?? 'Erro ao criar comerciante');
    }
  }

  /// Update existing merchant.
  Future<Map<String, dynamic>> updateMerchant(
    int merchantId,
    Map<String, dynamic> updates,
  ) async {
    final token = await _authService.getToken();
    if (token == null) {
      throw Exception('Não autenticado');
    }

    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/merchants/$merchantId'),
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
      throw Exception(errorData['detail'] ?? 'Erro ao atualizar comerciante');
    }
  }
}
