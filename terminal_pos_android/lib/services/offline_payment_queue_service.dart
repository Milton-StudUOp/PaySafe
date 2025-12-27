import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service for queuing offline payments that will be synced when online.
/// Only supports DINHEIRO (cash) payments in offline mode.
/// Payments remain in queue until successfully synced.
class OfflinePaymentQueueService {
  static const String _queueKey = 'offline_payment_queue';
  static const String _pendingCountKey = 'offline_pending_count';

  /// Add a cash payment to the offline queue.
  /// Returns a temporary receipt ID for display.
  /// merchantTempId: If merchant was registered offline, store their temp ID for later resolution.
  Future<String> queueCashPayment({
    required int merchantId,
    required String merchantName,
    required double amount,
    required int agentId,
    required String agentName,
    int? posId,
    String? merchantTempId, // For offline-registered merchants
  }) async {
    final prefs = await SharedPreferences.getInstance();

    // Generate temporary ID
    final tempId = 'OFFLINE_${DateTime.now().millisecondsSinceEpoch}';

    // Create queued payment
    final payment = {
      'temp_id': tempId,
      'merchant_id': merchantId,
      'merchant_name': merchantName,
      'merchant_temp_id':
          merchantTempId, // Store temp ID for resolution during sync
      'amount': amount,
      'payment_method': 'DINHEIRO',
      'agent_id': agentId,
      'agent_name': agentName,
      'pos_id': posId,
      'status': 'PENDENTE_SYNC',
      'created_at': DateTime.now().toIso8601String(),
      'synced': false,
    };

    // Get existing queue
    final queue = await getQueuedPayments();
    queue.add(payment);

    // Save updated queue
    await prefs.setString(_queueKey, jsonEncode(queue));
    await prefs.setInt(_pendingCountKey, queue.length);

    return tempId;
  }

  /// Get all queued payments waiting for sync.
  Future<List<Map<String, dynamic>>> getQueuedPayments() async {
    final prefs = await SharedPreferences.getInstance();
    final queueStr = prefs.getString(_queueKey);
    if (queueStr == null) return [];

    try {
      final List<dynamic> list = jsonDecode(queueStr);
      return list
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (e) {
      debugPrint('Error loading queued payments: $e');
      return [];
    }
  }

  /// Get count of pending payments.
  Future<int> getPendingCount() async {
    final queue = await getQueuedPayments();
    return queue.where((p) => p['synced'] != true).length;
  }

  /// Mark a payment as synced.
  Future<void> markAsSynced(String tempId, String? serverTransactionId) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getQueuedPayments();

    for (int i = 0; i < queue.length; i++) {
      if (queue[i]['temp_id'] == tempId) {
        queue[i]['synced'] = true;
        queue[i]['server_transaction_id'] = serverTransactionId;
        queue[i]['synced_at'] = DateTime.now().toIso8601String();
        break;
      }
    }

    await prefs.setString(_queueKey, jsonEncode(queue));
    await prefs.setInt(_pendingCountKey, await getPendingCount());
  }

  /// Remove synced payments from queue (cleanup).
  Future<void> removeSyncedPayments() async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getQueuedPayments();

    final pendingQueue = queue.where((p) => p['synced'] != true).toList();

    await prefs.setString(_queueKey, jsonEncode(pendingQueue));
    await prefs.setInt(_pendingCountKey, pendingQueue.length);
  }

  /// Clear all queued payments.
  Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_queueKey);
    await prefs.setInt(_pendingCountKey, 0);
  }

  /// Update merchant data in queued payments (e.g. name change).
  /// Returns number of payments updated.
  Future<int> updateMerchantData({
    required dynamic merchantId, // ID int or String tempID
    String? newName,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getQueuedPayments();

    int updatedCount = 0;

    for (int i = 0; i < queue.length; i++) {
      final payment = queue[i];
      final pMerchantId = payment['merchant_id'];
      final pMerchantTempId = payment['merchant_temp_id'];

      // Match logic:
      bool match = false;
      if (pMerchantId.toString() == merchantId.toString()) {
        match = true;
      } else if (pMerchantTempId != null &&
          pMerchantTempId.toString() == merchantId.toString()) {
        match = true;
      }

      if (match) {
        if (newName != null) {
          queue[i]['merchant_name'] = newName;
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      // Save using current list to preserve queue order
      await prefs.setString(_queueKey, jsonEncode(queue));
      debugPrint('Updated merchant data in $updatedCount queued payments');
    }

    return updatedCount;
  }

  /// Check if there are pending payments to sync.
  Future<bool> hasPendingPayments() async {
    final count = await getPendingCount();
    return count > 0;
  }

  /// Get only pending (unsynced) payments.
  Future<List<Map<String, dynamic>>> getPendingPayments() async {
    final queue = await getQueuedPayments();
    return queue.where((p) => p['synced'] != true).toList();
  }

  /// Get receipt data for an offline payment.
  /// Shows as SUCESSO because the agent already received the cash.
  Map<String, dynamic> generateOfflineReceipt({
    required String tempId,
    required String merchantName,
    required double amount,
    required String agentName,
  }) {
    return {
      'transaction_uuid': tempId,
      'merchant_name': merchantName,
      'amount': amount,
      'payment_method': 'DINHEIRO',
      'status': 'SUCESSO',
      'agent_name': agentName,
      'created_at': DateTime.now().toIso8601String(),
      'is_offline': true,
      'offline_pending_sync': true,
    };
  }

  /// Update the entire queue (used when resolving merchant IDs after sync).
  Future<void> updateQueue(List<Map<String, dynamic>> payments) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_queueKey, jsonEncode(payments));
    final pendingCount = payments.where((p) => p['synced'] != true).length;
    await prefs.setInt(_pendingCountKey, pendingCount);
    debugPrint('Updated payment queue with ${payments.length} items');
  }
}
