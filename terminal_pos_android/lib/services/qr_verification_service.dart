import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'transaction_cache_service.dart';
import 'offline_payment_queue_service.dart';
import 'connectivity_service.dart';

/// Result of QR code verification
class VerificationResult {
  final bool isValid;
  final String status;
  final String message;
  final bool isOfflineVerification;
  final Map<String, dynamic>? transactionData;
  final String? warning;

  VerificationResult({
    required this.isValid,
    required this.status,
    required this.message,
    this.isOfflineVerification = false,
    this.transactionData,
    this.warning,
  });

  Map<String, dynamic> toJson() => {
    'is_valid': isValid,
    'status': status,
    'message': message,
    'is_offline_verification': isOfflineVerification,
    'receipt_code': transactionData?['transaction_uuid'] != null
        ? 'TXN-${transactionData!['transaction_uuid']}'
        : (transactionData?['offline_transaction_uuid'] != null
              ? 'TXN-${transactionData!['offline_transaction_uuid']}'
              : null),
    'amount': transactionData?['amount'],
    'currency': transactionData?['currency'] ?? 'MZN',
    'issued_at': transactionData?['created_at'],
    'reprint_count': 0,
    'merchant_name':
        transactionData?['merchant_name'] ??
        transactionData?['merchant']?['full_name'],
    'agent_name':
        transactionData?['agent_name'] ??
        transactionData?['agent']?['full_name'],
    // Market name: try direct field, then nested merchant.market
    'market_name':
        transactionData?['market_name'] ??
        transactionData?['merchant']?['market']?['name'] ??
        transactionData?['merchant']?['market_name'],
    'warning': warning,
  };
}

/// Service for verifying QR codes with offline support.
///
/// Can verify QR codes locally when offline by:
/// 1. Checking HMAC signature locally
/// 2. Looking up transaction in local cache
class QRVerificationService {
  static const String _secretKey = 'paysafe-qr-secret-2026';

  final TransactionCacheService _transactionCache = TransactionCacheService();
  final OfflinePaymentQueueService _offlineQueue = OfflinePaymentQueueService();
  final ConnectivityService _connectivity = ConnectivityService();

  /// Verify a QR code token.
  /// If online, this just returns null (caller should use API).
  /// If offline, performs local verification.
  Future<VerificationResult?> verifyOffline(String qrToken) async {
    debugPrint('QRVerificationService: Verifying offline: $qrToken');

    // Parse token: format is "receiptCode|signature"
    if (!qrToken.contains('|')) {
      return VerificationResult(
        isValid: false,
        status: 'INVALID_FORMAT',
        message: 'Formato de QR Code inválido',
        isOfflineVerification: true,
      );
    }

    final parts = qrToken.split('|');
    if (parts.length != 2) {
      return VerificationResult(
        isValid: false,
        status: 'INVALID_FORMAT',
        message: 'Formato de QR Code inválido',
        isOfflineVerification: true,
      );
    }

    final receiptCode = parts[0];
    final signature = parts[1];

    debugPrint('QRVerificationService: code=$receiptCode, sig=$signature');

    // Step 1: Verify HMAC signature locally
    if (!_verifySignature(receiptCode, signature)) {
      debugPrint('QRVerificationService: Signature mismatch!');
      final expectedSig = _generateSignature(receiptCode);
      debugPrint(
        'QRVerificationService: Expected=$expectedSig, Got=$signature',
      );

      return VerificationResult(
        isValid: false,
        status: 'INVALID_SIGNATURE',
        message: '⚠️ QR Code ADULTERADO! Este recibo pode ser fraudulento.',
        isOfflineVerification: true,
      );
    }

    debugPrint('QRVerificationService: Signature valid');

    // Step 2: Extract UUID and lookup transaction
    if (!receiptCode.startsWith('TXN-')) {
      return VerificationResult(
        isValid: false,
        status: 'INVALID_FORMAT',
        message: 'Formato de código de recibo inválido',
        isOfflineVerification: true,
      );
    }

    final uuid = receiptCode.substring(4); // Remove "TXN-"
    debugPrint('QRVerificationService: Looking up UUID: $uuid');

    // Step 3: Search in transaction cache (online transactions)
    final cachedTransaction = await _findInCache(uuid);
    if (cachedTransaction != null) {
      debugPrint('QRVerificationService: Found in transaction cache');
      return VerificationResult(
        isValid: true,
        status: 'VALID',
        message: '✅ Recibo VÁLIDO (verificação offline)',
        isOfflineVerification: true,
        transactionData: cachedTransaction,
        warning: 'Verificado localmente - dados do cache',
      );
    }

    // Step 4: Search in offline payment queue
    final offlinePayment = await _findInOfflineQueue(uuid);
    if (offlinePayment != null) {
      debugPrint('QRVerificationService: Found in offline queue');
      final isPending = offlinePayment['synced'] != true;
      return VerificationResult(
        isValid: true,
        status: isPending ? 'PENDING_SYNC' : 'VALID',
        message: isPending
            ? '✅ Recibo VÁLIDO (pendente sincronização)'
            : '✅ Recibo VÁLIDO (pagamento offline)',
        isOfflineVerification: true,
        transactionData: offlinePayment,
        warning: isPending
            ? '⏳ Este pagamento ainda não foi sincronizado com o servidor'
            : null,
      );
    }

    // Not found in any local source
    debugPrint('QRVerificationService: Transaction not found locally');
    return VerificationResult(
      isValid: false,
      status: 'NOT_FOUND_OFFLINE',
      message: 'Transação não encontrada no cache local',
      isOfflineVerification: true,
      warning: 'Conecte-se à internet para verificar no servidor',
    );
  }

  /// Check if we're currently offline
  bool get isOffline => !_connectivity.isConnected;

  /// Generate HMAC-SHA256 signature (same as backend Python)
  String _generateSignature(String receiptCode) {
    final keyBytes = utf8.encode(_secretKey);
    final messageBytes = utf8.encode(receiptCode);
    final hmac = Hmac(sha256, keyBytes);
    final digest = hmac.convert(messageBytes);
    return digest.toString().substring(0, 16);
  }

  /// Verify signature matches expected
  bool _verifySignature(String receiptCode, String signature) {
    final expected = _generateSignature(receiptCode);
    return signature == expected;
  }

  /// Find transaction in cache by UUID
  /// Searches both transaction_uuid and offline_transaction_uuid (for synced offline payments)
  Future<Map<String, dynamic>?> _findInCache(String uuid) async {
    final transactions = await _transactionCache.getAllCachedTransactions();

    for (final tx in transactions) {
      // Check primary transaction_uuid
      if (tx['transaction_uuid'] == uuid) {
        return tx;
      }
      // Also check offline_transaction_uuid (for synced offline payments)
      if (tx['offline_transaction_uuid'] == uuid) {
        return tx;
      }
    }

    return null;
  }

  /// Find transaction in offline payment queue by UUID
  Future<Map<String, dynamic>?> _findInOfflineQueue(String uuid) async {
    final payments = await _offlineQueue.getQueuedPayments();

    for (final payment in payments) {
      if (payment['transaction_uuid'] == uuid) {
        return payment;
      }
    }

    return null;
  }
}
