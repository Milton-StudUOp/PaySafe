import 'package:flutter/foundation.dart';
import 'merchant_service.dart';
import 'merchant_cache_service.dart';
import 'market_service.dart';
import 'market_cache_service.dart';
import 'transaction_service.dart';
import 'transaction_cache_service.dart';
import 'offline_payment_queue_service.dart';
import 'offline_merchant_queue_service.dart';
import 'auth_service.dart';

/// Service for syncing data between backend and local cache.
/// Used for offline functionality.
class SyncService {
  final MerchantService _merchantService = MerchantService();
  final MerchantCacheService _merchantCache = MerchantCacheService();
  final MarketService _marketService = MarketService();
  final MarketCacheService _marketCache = MarketCacheService();
  final TransactionService _transactionService = TransactionService();
  final TransactionCacheService _transactionCache = TransactionCacheService();
  final OfflinePaymentQueueService _offlineQueue = OfflinePaymentQueueService();
  final OfflineMerchantQueueService _offlineMerchantQueue =
      OfflineMerchantQueueService();
  final AuthService _authService = AuthService();

  /// Sync merchants from the agent's market to local cache.
  /// Called after successful online login.
  Future<SyncResult> syncMerchants() async {
    try {
      // Get agent's market ID from user data
      final userData = await _authService.getUserData();
      if (userData == null) {
        return SyncResult(
          success: false,
          message: 'Dados do agente não encontrados',
        );
      }

      final marketId = userData['scope_market_id'] as int?;
      if (marketId == null) {
        return SyncResult(
          success: false,
          message: 'Mercado do agente não definido',
        );
      }

      // Fetch all merchants from the agent's jurisdiction
      final serverMerchants = await _merchantService.getMerchantsByMarket(
        marketId,
      );

      // SMART MERGE STRATEGY:
      // Capture locally modified merchants before wiping cache.
      // This protects against server replication lag (Read-after-Write inconsistency).
      final localMerchants = await _merchantCache.getAllCachedMerchants();
      final modifiedLocals = localMerchants
          .where((m) => m['is_offline_updated'] == true)
          .toList();

      debugPrint(
        '🛡️ Preserving ${modifiedLocals.length} locally modified merchants during sync',
      );

      // Create a map for faster merging
      final Map<dynamic, Map<String, dynamic>> mergedMap = {};

      // 1. Add Server Data first
      for (final m in serverMerchants) {
        mergedMap[m['id']] = m;
      }

      // 2. Overlay Local Modifications (Local wins)
      for (final local in modifiedLocals) {
        final id = local['id'];
        // If it exists in server list, we overwrite it with our fresher local version.
        // If it sends a temp ID not in server list yet, we add it.
        mergedMap[id] = local;
      }

      final finalList = mergedMap.values.toList();

      // Cache them locally
      // NUCLEAR: Clear old cache first to remove orphans, BUT only after successful download
      await _merchantCache.clearCache();
      await _merchantCache.cacheMerchants(
        marketId: marketId,
        merchants: finalList,
      );

      return SyncResult(
        success: true,
        message: 'Sincronizado ${finalList.length} comerciantes',
        merchantCount: finalList.length,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        message:
            'Erro ao sincronizar: ${e.toString().replaceAll('Exception: ', '')}',
      );
    }
  }

  /// Sync transactions from the agent's history to local cache.
  /// Fetches last 8 days of transactions.
  Future<SyncResult> syncTransactions() async {
    try {
      final userData = await _authService.getUserData();
      if (userData == null) {
        return SyncResult(
          success: false,
          message: 'Dados do agente não encontrados',
        );
      }

      final agentId = userData['id'] as int?;
      if (agentId == null) {
        return SyncResult(
          success: false,
          message: 'ID do agente não encontrado',
        );
      }

      // Fetch transactions from last 8 days
      final transactions = await _transactionService.getTransactionHistory(
        days: 8,
      );

      // Cache them locally
      // NUCLEAR: Clear old cache first to remove orphans, BUT only after successful download
      await _transactionCache.clearCache();
      await _transactionCache.cacheTransactions(
        agentId: agentId,
        transactions: transactions,
      );

      return SyncResult(
        success: true,
        message: 'Sincronizado ${transactions.length} transações',
        transactionCount: transactions.length,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        message:
            'Erro ao sincronizar transações: ${e.toString().replaceAll('Exception: ', '')}',
      );
    }
  }

  /// Sync all data (merchants, markets, and transactions).
  /// IMPORTANT: Offline merchants must sync BEFORE offline payments
  /// so that payments can reference real server IDs.
  Future<Map<String, SyncResult>> syncAll() async {
    final marketResult = await syncMarkets();
    final merchantResult = await syncMerchants();
    final transactionResult = await syncTransactions();

    // CRITICAL: Sync offline merchants FIRST to get real server IDs
    final offlineMerchantResult = await syncOfflineMerchantsWithIdMapping();

    // Then sync payments (with resolved IDs)
    final offlinePaymentResult = await syncOfflinePayments();

    return {
      'markets': marketResult,
      'merchants': merchantResult,
      'transactions': transactionResult,
      'offline_merchants': offlineMerchantResult,
      'offline_payments': offlinePaymentResult,
    };
  }

  /// Clear all cached data (server copies) to force a fresh reload.
  /// Does NOT clear offline queues or auth data.
  Future<void> clearCachesForRefresh() async {
    debugPrint('🗑️ Clearing local caches for fresh sync...');
    await _merchantCache.clearCache();
    await _marketCache.clearCache();
    await _transactionCache.clearCache();
    debugPrint('✅ Local caches cleared.');
  }

  /// Sync offline merchants and return mapping of temp IDs to server IDs.
  /// Also updates any pending payments that reference these merchants.
  Future<SyncResult> syncOfflineMerchantsWithIdMapping() async {
    debugPrint('========== SYNC OFFLINE MERCHANTS START ==========');

    try {
      final pendingRegistrations = await _offlineMerchantQueue
          .getPendingRegistrations();

      debugPrint(
        '📋 Found ${pendingRegistrations.length} pending registrations',
      );

      for (int i = 0; i < pendingRegistrations.length; i++) {
        final r = pendingRegistrations[i];
        debugPrint(
          '  [$i] temp_id: ${r['temp_id']}, name: ${r['full_name']}, synced: ${r['synced']}',
        );
      }

      if (pendingRegistrations.isEmpty) {
        debugPrint('✅ No pending registrations to sync');
        return SyncResult(
          success: true,
          message: 'Nenhum comerciante offline pendente',
          offlineMerchantCount: 0,
        );
      }

      int syncedCount = 0;
      int failedCount = 0;

      // Map of temp_id -> server_id for updating payments
      final Map<String, int> idMapping = {};

      // Get pending updates to merge
      final pendingUpdates = await _offlineMerchantQueue.getPendingUpdates();

      for (final registration in pendingRegistrations) {
        final tempId = registration['temp_id'];
        debugPrint('🔄 Syncing: $tempId - ${registration['full_name']}');

        // MERGE LOGIC: Find updates for this merchant
        // We look for updates where merchant_id equals the temp_id string
        final updatesForMerchant = pendingUpdates
            .where((u) => u['merchant_id'].toString() == tempId.toString())
            .toList();

        // Start with base registration data
        Map<String, dynamic> finalData = Map<String, dynamic>.from(
          registration,
        );

        // Apply updates in order
        if (updatesForMerchant.isNotEmpty) {
          debugPrint(
            '   ✨ Found ${updatesForMerchant.length} pending updates for this merchant. Merging...',
          );
          for (final update in updatesForMerchant) {
            final Map<String, dynamic> updateFields = update['updates'] ?? {};
            finalData.addAll(
              updateFields,
            ); // Overwrite registration data with updates
          }
        }

        try {
          debugPrint('   📤 Calling createMerchant API...');
          // Use finalData which contains merged updates
          final response = await _merchantService.createMerchant(
            fullName: finalData['full_name'] ?? 'Comerciante',
            marketId: finalData['market_id'] ?? 0,
            phoneNumber: finalData['phone_number'],
            mpesaNumber: finalData['mpesa_number'],
            emolaNumber: finalData['emola_number'],
            mkeshNumber: finalData['mkesh_number'],
            nfcUid: finalData['nfc_uid'],
            businessType: finalData['business_type'] ?? 'AMBULANTE',
          );

          debugPrint('   📥 API Response: $response');
          final serverId = response['id'] as int?;
          final tempId = registration['temp_id'] as String;

          if (serverId != null) {
            idMapping[tempId] = serverId;

            // MARK MERGED UPDATES AS SYNCED
            if (updatesForMerchant.isNotEmpty) {
              for (final update in updatesForMerchant) {
                await _offlineMerchantQueue.markUpdateSynced(
                  update['update_id'],
                );
                debugPrint(
                  '   ✅ Marked update ${update['update_id']} as synced (merged into registration)',
                );
              }
            }

            // Update pending payments that reference this temp merchant
            await _updatePendingPaymentsMerchantId(tempId, serverId);

            // UPDATE LOCAL CACHE: Replace temp ID with real ID
            await _updateMerchantCacheWithRealId(tempId, serverId, response);
          }

          await _offlineMerchantQueue.markRegistrationSynced(tempId, serverId);
          syncedCount++;

          debugPrint('✅ Synced offline merchant: $tempId -> $serverId');
        } catch (e) {
          final errorMsg = e.toString();

          // IDEMPOTENCY HANDLER: If merchant already exists (Duplicate NFC), recover gracefully
          if (errorMsg.contains('Já existe') &&
              errorMsg.contains('NFC') &&
              finalData['nfc_uid'] != null) {
            debugPrint(
              '⚠️ Merchant already exists on server. Attempting recovery by NFC lookup...',
            );

            try {
              final existingMerchant = await _merchantService.getMerchantByNfc(
                finalData['nfc_uid'],
              );

              if (existingMerchant != null) {
                final serverId = existingMerchant['id'] as int;
                debugPrint(
                  '✅ Recovered ID: $serverId for duplicated merchant.',
                );

                // Treat as success: Map IDs and clear queue
                idMapping[tempId] = serverId;

                // IMPORTANT: We do NOT use local data to overwrite server in this case,
                // we assume server data is the source of truth for the existing merchant.
                // However, we MUST map the ID for payments to work.

                // Link pending payments to real ID
                await _updatePendingPaymentsMerchantId(tempId, serverId);

                // Update local cache to match server
                await _updateMerchantCacheWithRealId(
                  tempId,
                  serverId,
                  existingMerchant,
                );

                // Mark as synced
                await _offlineMerchantQueue.markRegistrationSynced(
                  tempId,
                  serverId,
                );
                syncedCount++;
                continue; // Skip the failedCount++ below
              }
            } catch (recoveryError) {
              debugPrint('❌ Recovery failed: $recoveryError');
            }
          }

          failedCount++;
          debugPrint(
            '❌ Failed to sync offline merchant ${registration['temp_id']}: $e',
          );
        }
      }

      await _offlineMerchantQueue.removeSyncedRegistrations();

      return SyncResult(
        success: syncedCount > 0 || failedCount == 0,
        message: failedCount > 0
            ? 'Sincronizado $syncedCount, falhou $failedCount comerciantes'
            : 'Sincronizado $syncedCount comerciantes offline',
        offlineMerchantCount: syncedCount,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        message: 'Erro: ${e.toString().replaceAll('Exception: ', '')}',
      );
    }
  }

  /// Update pending payments to use real merchant ID instead of temp ID.
  Future<void> _updatePendingPaymentsMerchantId(
    String tempMerchantId,
    int realMerchantId,
  ) async {
    final pendingPayments = await _offlineQueue.getPendingPayments();

    bool hasUpdates = false;
    for (int i = 0; i < pendingPayments.length; i++) {
      final payment = pendingPayments[i];

      // Check if this payment references the temp merchant ID
      // Could be stored as merchant_id (if 0) or merchant_temp_id
      final paymentMerchantId = payment['merchant_id'];
      final paymentMerchantTempId = payment['merchant_temp_id'];

      // Log for debugging
      debugPrint(
        '   🔎 Checking payment ${payment['temp_id']}: '
        'merchant_id=$paymentMerchantId, '
        'merchant_temp_id=$paymentMerchantTempId, '
        'target_temp_id=$tempMerchantId',
      );

      if (paymentMerchantTempId == tempMerchantId ||
          (paymentMerchantId == 0 && paymentMerchantTempId == null) ||
          (paymentMerchantId != 0 &&
              paymentMerchantId.toString() == tempMerchantId)) {
        pendingPayments[i]['merchant_id'] = realMerchantId;
        pendingPayments[i]['merchant_id_resolved'] = true;
        hasUpdates = true;
        debugPrint(
          '   📝 MATCH! Updated payment ${payment['temp_id']} merchant: $tempMerchantId -> $realMerchantId',
        );
      }
    }

    if (hasUpdates) {
      // Save updated payments back to queue
      await _offlineQueue.updateQueue(pendingPayments);
      debugPrint(
        '   💾 Saved updated payment queue with ${pendingPayments.length} items',
      );
    } else {
      debugPrint(
        '   ℹ️ No payments needed update for merchant $tempMerchantId',
      );
    }
  }

  /// Update local merchant cache: replace temp ID with real server ID and mark as synced.
  Future<void> _updateMerchantCacheWithRealId(
    String tempId,
    int realId,
    Map<String, dynamic> serverResponse,
  ) async {
    try {
      final merchants = await _merchantCache.getAllCachedMerchants();

      bool updated = false;
      for (int i = 0; i < merchants.length; i++) {
        final merchantId = merchants[i]['id'];

        // Find merchant with temp ID
        if (merchantId.toString() == tempId) {
          // Replace with real server data
          merchants[i] = {
            ...serverResponse,
            'is_offline_updated': false, // No longer offline
            'synced': true,
            'synced_at': DateTime.now().toIso8601String(),
          };
          updated = true;
          debugPrint('📝 Updated cache: $tempId -> real ID $realId');
          break;
        }
      }

      if (updated) {
        // Persist updated cache - use saveMerchantsList which doesn't require marketId
        await _merchantCache.saveMerchantsList(merchants);
      }
    } catch (e) {
      debugPrint('⚠️ Error updating merchant cache: $e');
    }
  }

  /// Sync markets from agent's jurisdiction to local cache.
  Future<SyncResult> syncMarkets() async {
    try {
      // Fetch approved markets from API
      final markets = await _marketService.getApprovedMarkets();

      // Cache them locally
      await _marketCache.cacheMarkets(markets);

      return SyncResult(
        success: true,
        message: 'Sincronizado ${markets.length} mercados',
        marketCount: markets.length,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        message:
            'Erro ao sincronizar mercados: ${e.toString().replaceAll('Exception: ', '')}',
      );
    }
  }

  /// Sync queued offline cash payments to the backend.
  Future<SyncResult> syncOfflinePayments() async {
    debugPrint('========== SYNC OFFLINE PAYMENTS START ==========');

    try {
      // Get pending payments
      final pendingPayments = await _offlineQueue.getPendingPayments();

      debugPrint('📋 Found ${pendingPayments.length} pending payments');
      for (int i = 0; i < pendingPayments.length; i++) {
        final p = pendingPayments[i];
        debugPrint(
          '  [$i] temp_id: ${p['temp_id']}, merchant_id: ${p['merchant_id']}, amount: ${p['amount']}',
        );
      }

      if (pendingPayments.isEmpty) {
        debugPrint('✅ No pending payments to sync');
        return SyncResult(
          success: true,
          message: 'Nenhum pagamento offline pendente',
          offlinePaymentCount: 0,
        );
      }

      int syncedCount = 0;
      int failedCount = 0;

      for (final payment in pendingPayments) {
        debugPrint(
          '🔄 Syncing payment: ${payment['temp_id']} (Merchant ID: ${payment['merchant_id']})',
        );

        // Critical check: Ensure merchant_id is valid (not 0 and not temp string)
        final merchantId = payment['merchant_id'];
        if (merchantId == 0 ||
            (merchantId is String && merchantId.startsWith('OFFLINE'))) {
          debugPrint(
            '❌ SKIPPING: Invalid merchant ID $merchantId. Need to sync merchant first.',
          );
          failedCount++;
          continue;
        }

        try {
          // Build transaction request with original offline date
          final txData = {
            'merchant_id': payment['merchant_id'],
            'pos_id': payment['pos_id'],
            'amount': payment['amount'],
            'payment_method': 'DINHEIRO',
            'mpesa_number': '820000000', // Placeholder for cash
            'observation':
                'Pagamento offline sincronizado - ${payment['temp_id']}',
            // Preserve original transaction date from offline payment
            'offline_created_at': payment['created_at'],
          };

          debugPrint('   📤 Sending transaction: $txData');

          // Send to backend
          final response = await _transactionService.createTransaction(txData);
          debugPrint('   📥 API Response: $response');

          // Mark as synced with server transaction ID
          final serverTxId =
              response['id']?.toString() ??
              response['transaction_uuid']?.toString();
          await _offlineQueue.markAsSynced(payment['temp_id'], serverTxId);

          // ADD TO TRANSACTION CACHE: Update local cache with synced transaction
          final syncedTx = {
            ...response,
            'synced': true,
            'synced_from_offline': true,
            'original_offline_id': payment['temp_id'],
          };
          await _transactionCache.addTransaction(syncedTx);

          syncedCount++;
          debugPrint(
            '✅ Synced offline payment: ${payment['temp_id']} -> $serverTxId',
          );
        } catch (e) {
          failedCount++;
          debugPrint(
            'Failed to sync offline payment ${payment['temp_id']}: $e',
          );
        }
      }

      // Clean up synced payments
      await _offlineQueue.removeSyncedPayments();

      if (failedCount > 0) {
        return SyncResult(
          success: syncedCount > 0,
          message:
              'Sincronizado $syncedCount, falhou $failedCount pagamentos offline',
          offlinePaymentCount: syncedCount,
        );
      }

      return SyncResult(
        success: true,
        message: 'Sincronizado $syncedCount pagamentos offline',
        offlinePaymentCount: syncedCount,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        message:
            'Erro ao sincronizar pagamentos offline: ${e.toString().replaceAll('Exception: ', '')}',
      );
    }
  }

  /// Sync queued offline merchant registrations to the backend.
  Future<SyncResult> syncOfflineMerchants() async {
    try {
      // Get pending registrations
      final pendingRegistrations = await _offlineMerchantQueue
          .getPendingRegistrations();

      if (pendingRegistrations.isEmpty) {
        return SyncResult(
          success: true,
          message: 'Nenhum comerciante offline pendente',
          offlineMerchantCount: 0,
        );
      }

      int syncedCount = 0;
      int failedCount = 0;

      for (final registration in pendingRegistrations) {
        try {
          // Send to backend using named parameters
          final response = await _merchantService.createMerchant(
            fullName: registration['full_name'] ?? 'Comerciante',
            marketId: registration['market_id'] ?? 0,
            phoneNumber: registration['phone_number'],
            mpesaNumber: registration['mpesa_number'],
            emolaNumber: registration['emola_number'],
            mkeshNumber: registration['mkesh_number'],
            nfcUid: registration['nfc_uid'],
          );

          // Mark as synced with server ID
          final serverId = response['id'] as int?;
          await _offlineMerchantQueue.markRegistrationSynced(
            registration['temp_id'],
            serverId,
          );

          syncedCount++;
          debugPrint(
            'Synced offline merchant: ${registration['temp_id']} -> $serverId',
          );
        } catch (e) {
          failedCount++;
          debugPrint(
            'Failed to sync offline merchant ${registration['temp_id']}: $e',
          );
        }
      }

      // Clean up synced registrations
      await _offlineMerchantQueue.removeSyncedRegistrations();

      if (failedCount > 0) {
        return SyncResult(
          success: syncedCount > 0,
          message:
              'Sincronizado $syncedCount, falhou $failedCount comerciantes offline',
          offlineMerchantCount: syncedCount,
        );
      }

      return SyncResult(
        success: true,
        message: 'Sincronizado $syncedCount comerciantes offline',
        offlineMerchantCount: syncedCount,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        message:
            'Erro ao sincronizar comerciantes offline: ${e.toString().replaceAll('Exception: ', '')}',
      );
    }
  }

  /// Get sync status information.
  Future<SyncStatus> getSyncStatus() async {
    final lastSync = await _merchantCache.getLastSyncTime();
    final isValid = await _merchantCache.isCacheValid();
    final count = await _merchantCache.getCachedMerchantCount();
    final expiry = await _merchantCache.getCacheExpiryTime();
    final transactionCount = await _transactionCache
        .getCachedTransactionCount();

    return SyncStatus(
      lastSyncTime: lastSync,
      isValid: isValid,
      merchantCount: count,
      transactionCount: transactionCount,
      expiryTime: expiry,
    );
  }

  /// Check if sync is needed (cache expired or empty).
  Future<bool> isSyncNeeded() async {
    final hasMerchants = await _merchantCache.hasCachedMerchants();
    if (!hasMerchants) return true;

    final isValid = await _merchantCache.isCacheValid();
    return !isValid;
  }
}

/// Result of a sync operation.
class SyncResult {
  final bool success;
  final String message;
  final int? merchantCount;
  final int? marketCount;
  final int? transactionCount;
  final int? offlinePaymentCount;
  final int? offlineMerchantCount;

  SyncResult({
    required this.success,
    required this.message,
    this.merchantCount,
    this.marketCount,
    this.transactionCount,
    this.offlinePaymentCount,
    this.offlineMerchantCount,
  });
}

/// Current sync status.
class SyncStatus {
  final DateTime? lastSyncTime;
  final bool isValid;
  final int merchantCount;
  final int transactionCount;
  final DateTime? expiryTime;

  SyncStatus({
    this.lastSyncTime,
    required this.isValid,
    required this.merchantCount,
    this.transactionCount = 0,
    this.expiryTime,
  });
}
