import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'offline_merchant_queue_service.dart';
import 'transaction_cache_service.dart';
import 'offline_payment_queue_service.dart';

/// Service for caching merchants locally for offline access.
///
/// Caches merchants from the agent's market after successful online login.
/// Allows NFC and name lookups when backend is unavailable.
class MerchantCacheService {
  static const String _cacheKeyPrefix = 'merchant_cache_';
  static const String _merchantListKey = 'cached_merchants_list';
  static const String _lastSyncKey = 'merchants_last_sync';
  static const String _marketIdKey = 'cached_market_id';
  static const int _cacheValidityHours = 48;

  /// Cache a list of merchants from a market.
  Future<void> cacheMerchants({
    required int marketId,
    required List<Map<String, dynamic>> merchants,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    // Store individual merchants by NFC UID for fast lookup (normalized to uppercase)
    for (final merchant in merchants) {
      final nfcUid = merchant['nfc_uid']?.toString();
      if (nfcUid != null && nfcUid.isNotEmpty) {
        // Normalize to uppercase for consistent lookups
        final normalizedUid = nfcUid.toUpperCase().trim();
        await prefs.setString(
          '$_cacheKeyPrefix$normalizedUid',
          jsonEncode(merchant),
        );
      }
    }

    // Store full list for search functionality
    await prefs.setString(_merchantListKey, jsonEncode(merchants));
    await prefs.setInt(_marketIdKey, marketId);
    await prefs.setString(_lastSyncKey, DateTime.now().toIso8601String());
  }

  /// Save merchants list directly without requiring marketId.
  /// Used for sync updates where we just need to update the list.
  Future<void> saveMerchantsList(List<Map<String, dynamic>> merchants) async {
    final prefs = await SharedPreferences.getInstance();

    // Update NFC lookups
    for (final merchant in merchants) {
      final nfcUid = merchant['nfc_uid']?.toString();
      if (nfcUid != null && nfcUid.isNotEmpty) {
        final normalizedUid = nfcUid.toUpperCase().trim();
        await prefs.setString(
          '$_cacheKeyPrefix$normalizedUid',
          jsonEncode(merchant),
        );
      }
    }

    // Save the list
    await prefs.setString(_merchantListKey, jsonEncode(merchants));
  }

  /// Get merchant by NFC UID from cache (case-insensitive).
  Future<Map<String, dynamic>?> getMerchantByNfc(String nfcUid) async {
    final prefs = await SharedPreferences.getInstance();
    final normalizedUid = nfcUid.toUpperCase().trim();

    // Try direct key lookup first (fast path)
    final merchantStr = prefs.getString('$_cacheKeyPrefix$normalizedUid');
    if (merchantStr != null) {
      try {
        return jsonDecode(merchantStr) as Map<String, dynamic>;
      } catch (e) {
        debugPrint('Error decoding cached merchant: $e');
      }
    }

    // Fallback: search in full list (case-insensitive) for old cached data
    final merchants = await getAllCachedMerchants();
    final searchUid = nfcUid.toLowerCase().trim();

    try {
      return merchants.firstWhere((m) {
        final mNfc = (m['nfc_uid'] ?? '').toString().toLowerCase().trim();
        return mNfc == searchUid;
      });
    } catch (e) {
      // Not found
      return null;
    }
  }

  /// Get all cached merchants.
  Future<List<Map<String, dynamic>>> getAllCachedMerchants() async {
    final prefs = await SharedPreferences.getInstance();
    // Reload to ensure we read the latest persisted data (fixes stale read after write)
    await prefs.reload();
    final listStr = prefs.getString(_merchantListKey);
    if (listStr == null) return [];

    try {
      final List<dynamic> list = jsonDecode(listStr);
      // Properly convert each item to Map<String, dynamic>
      return list
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (e) {
      debugPrint('Error loading cached merchants: $e');
      return [];
    }
  }

  /// Search merchants by name (case-insensitive).
  Future<List<Map<String, dynamic>>> searchMerchantsByName(String query) async {
    if (query.isEmpty) return [];

    final merchants = await getAllCachedMerchants();
    final normalizedQuery = query.toLowerCase();

    return merchants.where((m) {
      final name = (m['full_name'] ?? '').toString().toLowerCase();
      final phone = (m['phone_number'] ?? '').toString();
      return name.contains(normalizedQuery) || phone.contains(query);
    }).toList();
  }

  /// Search merchants by phone number.
  Future<Map<String, dynamic>?> getMerchantByPhone(String phone) async {
    final merchants = await getAllCachedMerchants();
    final normalizedPhone = phone.replaceAll(RegExp(r'\D'), '');

    try {
      return merchants.firstWhere((m) {
        final merchantPhone = (m['phone_number'] ?? '').toString().replaceAll(
          RegExp(r'\D'),
          '',
        );
        return merchantPhone == normalizedPhone;
      });
    } catch (e) {
      return null;
    }
  }

  /// Check if cache exists and is valid.
  Future<bool> isCacheValid() async {
    final prefs = await SharedPreferences.getInstance();
    final lastSyncStr = prefs.getString(_lastSyncKey);
    if (lastSyncStr == null) return false;

    final lastSync = DateTime.tryParse(lastSyncStr);
    if (lastSync == null) return false;

    final expiresAt = lastSync.add(const Duration(hours: _cacheValidityHours));
    return DateTime.now().isBefore(expiresAt);
  }

  /// Get last sync timestamp.
  Future<DateTime?> getLastSyncTime() async {
    final prefs = await SharedPreferences.getInstance();
    final lastSyncStr = prefs.getString(_lastSyncKey);
    if (lastSyncStr == null) return null;
    return DateTime.tryParse(lastSyncStr);
  }

  /// Get cache expiry time.
  Future<DateTime?> getCacheExpiryTime() async {
    final lastSync = await getLastSyncTime();
    if (lastSync == null) return null;
    return lastSync.add(const Duration(hours: _cacheValidityHours));
  }

  /// Get cached merchant count.
  Future<int> getCachedMerchantCount() async {
    final merchants = await getAllCachedMerchants();
    return merchants.length;
  }

  /// Get cached market ID.
  Future<int?> getCachedMarketId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_marketIdKey);
  }

  /// Clear all cached merchants.
  Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();

    // Remove all merchant entries
    final keys = prefs.getKeys().where((k) => k.startsWith(_cacheKeyPrefix));
    for (final key in keys) {
      await prefs.remove(key);
    }

    await prefs.remove(_merchantListKey);
    await prefs.remove(_lastSyncKey);
    await prefs.remove(_marketIdKey);
  }

  /// Check if any merchants are cached.
  Future<bool> hasCachedMerchants() async {
    final count = await getCachedMerchantCount();
    return count > 0;
  }

  // ==================== DUPLICATE CHECKING ====================

  /// Check if a phone number already exists in cached merchants.
  Future<bool> isPhoneDuplicate(String phoneNumber) async {
    if (phoneNumber.isEmpty) return false;
    final existing = await getMerchantByPhone(phoneNumber);
    return existing != null;
  }

  /// Check if an NFC UID already exists in cached merchants.
  Future<bool> isNfcDuplicate(String nfcUid) async {
    if (nfcUid.isEmpty) return false;
    final existing = await getMerchantByNfc(nfcUid);
    return existing != null;
  }

  /// Check for duplicates and return error message if found.
  /// Returns null if no duplicates, otherwise returns the error message.
  /// Note: Only NFC UID is checked - it's the only truly unique identifier.
  /// Names, phone, mobile money can repeat for multiple shops.
  /// Checks BOTH cached merchants AND pending offline registrations.
  Future<String?> checkDuplicates({String? nfcUid}) async {
    // Get cached merchants
    final cachedMerchants = await getAllCachedMerchants();

    // Get pending offline registrations (not yet synced)
    final offlineQueue = OfflineMerchantQueueService();
    final pendingRegistrations = await offlineQueue.getPendingRegistrations();

    // Combine both lists for duplicate checking
    final allMerchants = <Map<String, dynamic>>[
      ...cachedMerchants,
      ...pendingRegistrations,
    ];

    debugPrint(
      'Checking NFC duplicates against ${cachedMerchants.length} cached + ${pendingRegistrations.length} pending = ${allMerchants.length} total',
    );

    for (final m in allMerchants) {
      // Check NFC UID (case-insensitive) - the only unique identifier
      if (nfcUid != null && nfcUid.trim().isNotEmpty) {
        final existingNfc = (m['nfc_uid'] ?? '')
            .toString()
            .toUpperCase()
            .trim();
        final inputNfc = nfcUid.toUpperCase().trim();
        if (existingNfc.isNotEmpty && existingNfc == inputNfc) {
          debugPrint(
            'Duplicate found: nfc_uid "$nfcUid" matches existing "$existingNfc"',
          );
          return 'Este cartão NFC já está em uso';
        }
      }
    }

    debugPrint('No duplicates found');
    return null; // No duplicates
  }

  // ==================== OFFLINE MERCHANT REGISTRATION ====================

  /// Add an offline-registered merchant immediately to the cache.
  /// Makes the merchant available for search and payments instantly.
  Future<void> addOfflineMerchant(Map<String, dynamic> merchant) async {
    final prefs = await SharedPreferences.getInstance();

    // Get existing merchants
    final merchants = await getAllCachedMerchants();

    // Add new merchant to list
    merchants.insert(0, merchant); // Add at beginning for visibility

    // Update full list
    await prefs.setString(_merchantListKey, jsonEncode(merchants));

    // Also add NFC lookup if available
    final nfcUid = merchant['nfc_uid']?.toString();
    if (nfcUid != null && nfcUid.isNotEmpty) {
      final normalizedUid = nfcUid.toUpperCase().trim();
      await prefs.setString(
        '$_cacheKeyPrefix$normalizedUid',
        jsonEncode(merchant),
      );
    }

    debugPrint('Added offline merchant to cache: ${merchant['full_name']}');
  }

  /// Update an existing merchant in the cache with new data.
  /// Used to immediately reflect offline updates before sync.
  /// Handles both int and String merchant IDs.
  Future<void> updateCachedMerchant(
    dynamic merchantId,
    Map<String, dynamic> updates,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final merchants = await getAllCachedMerchants();

    debugPrint(
      'updateCachedMerchant called with ID: $merchantId (type: ${merchantId.runtimeType})',
    );
    debugPrint('Updates to apply: $updates');
    debugPrint('Current merchants count: ${merchants.length}');

    bool found = false;
    for (int i = 0; i < merchants.length; i++) {
      final cachedId = merchants[i]['id'];

      // Compare IDs - handle both int and String
      bool idsMatch = false;
      if (cachedId == merchantId) {
        idsMatch = true;
      } else if (cachedId.toString() == merchantId.toString()) {
        idsMatch = true;
      }

      if (idsMatch) {
        debugPrint('Found merchant at index $i with ID $cachedId');

        // Merge updates into existing merchant
        merchants[i] = {
          ...merchants[i],
          ...updates,
          'is_offline_updated': true, // Flag for UI indication
          'offline_updated_at': DateTime.now().toIso8601String(),
        };
        found = true;

        // ALWAYS update NFC lookup cache if merchant has NFC (new or existing)
        // This ensures searches by NFC return the latest data, not stale cache
        final merchantNfc = merchants[i]['nfc_uid']?.toString();
        if (merchantNfc != null && merchantNfc.isNotEmpty) {
          final normalizedUid = merchantNfc.toUpperCase().trim();
          await prefs.setString(
            '$_cacheKeyPrefix$normalizedUid',
            jsonEncode(merchants[i]),
          );
          debugPrint('✅ Updated NFC lookup cache for: $normalizedUid');
        }
        break;
      }
    }

    if (found) {
      await prefs.setString(_merchantListKey, jsonEncode(merchants));
      debugPrint(
        '✅ Updated cached merchant ID $merchantId with offline changes',
      );
    } else {
      // NOT FOUND: Add as new entry with updates applied
      debugPrint('⚠️ Merchant ID $merchantId not in cache - adding new entry');

      final newMerchant = {
        'id': merchantId,
        ...updates,
        'is_offline_updated': true,
        'offline_updated_at': DateTime.now().toIso8601String(),
      };

      merchants.insert(0, newMerchant);
      await prefs.setString(_merchantListKey, jsonEncode(merchants));

      // Add NFC lookup if available
      final nfcUid = updates['nfc_uid']?.toString();
      if (nfcUid != null && nfcUid.isNotEmpty) {
        final normalizedUid = nfcUid.toUpperCase().trim();
        await prefs.setString(
          '$_cacheKeyPrefix$normalizedUid',
          jsonEncode(newMerchant),
        );
      }

      debugPrint('✅ Added new merchant ID $merchantId to cache with updates');
    }

    // PROPAGATE TO TRANSACTIONS: Update merchant name in all related transactions
    final newName = updates['full_name']?.toString();
    if (newName != null) {
      final txCache = TransactionCacheService();
      final txUpdated = await txCache.updateMerchantInTransactions(
        merchantId: merchantId,
        newName: newName,
        merchantUpdates: updates,
      );
      if (txUpdated > 0) {
        debugPrint('✅ Also updated merchant name in $txUpdated transactions');
      }
    }

    // ALSO UPDATE OFFLINE QUEUED PAYMENTS (Pending Sync)
    // This handles transactions that haven't been synced yet
    if (newName != null) {
      final offlinePaymentQueue = OfflinePaymentQueueService();
      final paymentsUpdated = await offlinePaymentQueue.updateMerchantData(
        merchantId: merchantId,
        newName: newName,
      );
      if (paymentsUpdated > 0) {
        debugPrint(
          '✅ Also updated merchant name in $paymentsUpdated pending offline payments',
        );
      }
    }
  }

  /// Get a merchant with any pending offline updates applied.
  /// Merges cached data with pending updates from queue.
  Future<Map<String, dynamic>?> getMerchantWithPendingUpdates(
    int merchantId,
  ) async {
    // Get base merchant from cache
    final merchants = await getAllCachedMerchants();
    Map<String, dynamic>? merchant;

    try {
      merchant = merchants.firstWhere((m) => m['id'] == merchantId);
    } catch (e) {
      return null;
    }

    // Get pending updates from queue
    final offlineQueue = OfflineMerchantQueueService();
    final pendingUpdates = await offlineQueue.getPendingUpdates();

    // Apply any pending updates for this merchant
    for (final update in pendingUpdates) {
      if (update['merchant_id'] == merchantId) {
        final updates = update['updates'] as Map<String, dynamic>?;
        if (updates != null) {
          merchant = {...merchant!, ...updates, 'has_pending_updates': true};
        }
      }
    }

    return merchant;
  }
}
