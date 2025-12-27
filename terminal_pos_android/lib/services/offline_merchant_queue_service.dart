import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service for queuing offline merchant operations.
/// Queued operations remain until successfully synced.
class OfflineMerchantQueueService {
  static const String _registrationQueueKey = 'offline_merchant_registrations';
  static const String _updateQueueKey = 'offline_merchant_updates';

  // ==================== REGISTRATIONS ====================

  /// Queue a new merchant registration for later sync.
  /// Returns a temporary ID for local display.
  Future<String> queueMerchantRegistration({
    required String fullName,
    String? phoneNumber, // Optional for ambulantes
    required int marketId,
    String? nfcUid,
    String? mpesaNumber,
    String? emolaNumber,
    String? mkeshNumber,
    String? birthDate,
    String? gender,
    required int agentId,
    required String agentName,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    // Generate temporary ID
    final tempId = 'OFFLINE_MERCHANT_${DateTime.now().millisecondsSinceEpoch}';

    // Create queued registration
    final registration = {
      'temp_id': tempId,
      'full_name': fullName,
      'phone_number': phoneNumber,
      'market_id': marketId,
      'nfc_uid': nfcUid,
      'mpesa_number': mpesaNumber,
      'emola_number': emolaNumber,
      'mkesh_number': mkeshNumber,
      'birth_date': birthDate,
      'gender': gender,
      'business_type': 'AMBULANTE', // Required by backend
      'agent_id': agentId,
      'agent_name': agentName,
      'status': 'PENDENTE_SYNC',
      'created_at': DateTime.now().toIso8601String(),
      'synced': false,
    };

    // Get existing queue
    final queue = await getQueuedRegistrations();
    queue.add(registration);

    // Save
    await prefs.setString(_registrationQueueKey, jsonEncode(queue));

    debugPrint('Queued offline merchant registration: $tempId');
    return tempId;
  }

  /// Get all queued registrations.
  Future<List<Map<String, dynamic>>> getQueuedRegistrations() async {
    final prefs = await SharedPreferences.getInstance();
    final queueStr = prefs.getString(_registrationQueueKey);
    if (queueStr == null) return [];

    try {
      final List<dynamic> list = jsonDecode(queueStr);
      return list
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (e) {
      debugPrint('Error loading queued registrations: $e');
      return [];
    }
  }

  /// Get only pending (unsynced) registrations.
  Future<List<Map<String, dynamic>>> getPendingRegistrations() async {
    final queue = await getQueuedRegistrations();
    return queue.where((r) => r['synced'] != true).toList();
  }

  /// Mark a registration as synced.
  Future<void> markRegistrationSynced(String tempId, int? serverId) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getQueuedRegistrations();

    for (int i = 0; i < queue.length; i++) {
      if (queue[i]['temp_id'] == tempId) {
        queue[i]['synced'] = true;
        queue[i]['server_id'] = serverId;
        queue[i]['synced_at'] = DateTime.now().toIso8601String();
        break;
      }
    }

    await prefs.setString(_registrationQueueKey, jsonEncode(queue));
  }

  /// Remove synced registrations.
  Future<void> removeSyncedRegistrations() async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getQueuedRegistrations();
    final pendingQueue = queue.where((r) => r['synced'] != true).toList();
    await prefs.setString(_registrationQueueKey, jsonEncode(pendingQueue));
  }

  // ==================== UPDATES ====================

  /// Queue a merchant update for later sync.
  /// If there's already a pending update for this merchant, it will be REPLACED.
  Future<String> queueMerchantUpdate({
    required dynamic merchantId, // int (server ID) or String (temp ID)
    required String merchantName,
    required Map<String, dynamic> updates,
    required int agentId,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    final updateId = 'OFFLINE_UPDATE_${DateTime.now().millisecondsSinceEpoch}';

    final update = {
      'update_id': updateId,
      'merchant_id': merchantId,
      'merchant_name': merchantName,
      'updates': updates,
      'agent_id': agentId,
      'created_at': DateTime.now().toIso8601String(),
      'synced': false,
    };

    // Get existing queue and REMOVE previous pending updates for this merchant
    final queue = await getQueuedUpdates();
    final merchantIdStr = merchantId.toString();

    // Remove any existing PENDING updates for the same merchant
    final filteredQueue = queue.where((u) {
      if (u['synced'] == true) return true; // Keep synced ones
      final existingId = u['merchant_id'].toString();
      if (existingId == merchantIdStr) {
        debugPrint(
          '🗑️ Removing previous pending update for merchant $merchantId: ${u['update_id']}',
        );
        return false; // Remove this one
      }
      return true; // Keep others
    }).toList();

    // Add the new update
    filteredQueue.add(update);

    await prefs.setString(_updateQueueKey, jsonEncode(filteredQueue));

    debugPrint(
      '✅ Queued offline merchant update: $updateId (replaced previous if any)',
    );
    return updateId;
  }

  /// Get all queued updates.
  Future<List<Map<String, dynamic>>> getQueuedUpdates() async {
    final prefs = await SharedPreferences.getInstance();
    final queueStr = prefs.getString(_updateQueueKey);
    if (queueStr == null) return [];

    try {
      final List<dynamic> list = jsonDecode(queueStr);
      return list
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (e) {
      debugPrint('Error loading queued updates: $e');
      return [];
    }
  }

  /// Get only pending (unsynced) updates.
  Future<List<Map<String, dynamic>>> getPendingUpdates() async {
    final queue = await getQueuedUpdates();
    return queue.where((u) => u['synced'] != true).toList();
  }

  /// Mark an update as synced.
  Future<void> markUpdateSynced(String updateId) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getQueuedUpdates();

    for (int i = 0; i < queue.length; i++) {
      if (queue[i]['update_id'] == updateId) {
        queue[i]['synced'] = true;
        queue[i]['synced_at'] = DateTime.now().toIso8601String();
        break;
      }
    }

    await prefs.setString(_updateQueueKey, jsonEncode(queue));
  }

  /// Remove synced updates.
  Future<void> removeSyncedUpdates() async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getQueuedUpdates();
    final pendingQueue = queue.where((u) => u['synced'] != true).toList();
    await prefs.setString(_updateQueueKey, jsonEncode(pendingQueue));
  }

  // ==================== UTILITY ====================

  /// Get total pending operations count.
  Future<int> getPendingCount() async {
    final regs = await getPendingRegistrations();
    final updates = await getPendingUpdates();
    return regs.length + updates.length;
  }

  /// Check if there are pending operations.
  Future<bool> hasPendingOperations() async {
    return (await getPendingCount()) > 0;
  }

  /// Clear all queues.
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_registrationQueueKey);
    await prefs.remove(_updateQueueKey);
  }
}
