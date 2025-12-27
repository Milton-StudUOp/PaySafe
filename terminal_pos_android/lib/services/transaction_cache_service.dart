import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service for caching transaction history locally for offline access.
///
/// Caches transactions from the agent's history after successful online operations.
/// Allows viewing transaction history when backend is unavailable.
class TransactionCacheService {
  static const String _transactionListKey = 'cached_transactions_list';
  static const String _lastSyncKey = 'transactions_last_sync';
  static const String _agentIdKey = 'cached_agent_id';
  static const int _cacheValidityDays = 8;

  /// Cache a list of transactions.
  Future<void> cacheTransactions({
    required int agentId,
    required List<Map<String, dynamic>> transactions,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    // Store full list for display
    await prefs.setString(_transactionListKey, jsonEncode(transactions));
    await prefs.setInt(_agentIdKey, agentId);
    await prefs.setString(_lastSyncKey, DateTime.now().toIso8601String());
  }

  /// Add a new transaction to the cache (for newly created transactions).
  Future<void> addTransaction(Map<String, dynamic> transaction) async {
    final transactions = await getAllCachedTransactions();

    // Add to beginning of list (most recent first)
    transactions.insert(0, transaction);

    // Keep only transactions from the last 8 days
    final cutoffDate = DateTime.now().subtract(
      const Duration(days: _cacheValidityDays),
    );
    final filtered = transactions.where((t) {
      final createdAt = DateTime.tryParse(t['created_at']?.toString() ?? '');
      return createdAt != null && createdAt.isAfter(cutoffDate);
    }).toList();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_transactionListKey, jsonEncode(filtered));
    await prefs.setString(_lastSyncKey, DateTime.now().toIso8601String());
  }

  /// Get all cached transactions.
  Future<List<Map<String, dynamic>>> getAllCachedTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final listStr = prefs.getString(_transactionListKey);
    if (listStr == null) return [];

    try {
      final List<dynamic> list = jsonDecode(listStr);
      return list
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (e) {
      debugPrint('Error loading cached transactions: $e');
      return [];
    }
  }

  /// Get transactions filtered by date range.
  Future<List<Map<String, dynamic>>> getTransactionsByDateRange({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final transactions = await getAllCachedTransactions();

    return transactions.where((t) {
      final createdAt = DateTime.tryParse(t['created_at']?.toString() ?? '');
      if (createdAt == null) return false;
      return createdAt.isAfter(startDate) &&
          createdAt.isBefore(endDate.add(const Duration(days: 1)));
    }).toList();
  }

  /// Get transactions for today.
  Future<List<Map<String, dynamic>>> getTodayTransactions() async {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    return getTransactionsByDateRange(startDate: startOfDay, endDate: now);
  }

  /// Get transactions from last N days.
  Future<List<Map<String, dynamic>>> getTransactionsLastDays(int days) async {
    final now = DateTime.now();
    final startDate = now.subtract(Duration(days: days));
    return getTransactionsByDateRange(startDate: startDate, endDate: now);
  }

  /// Get transaction by ID.
  Future<Map<String, dynamic>?> getTransactionById(int transactionId) async {
    final transactions = await getAllCachedTransactions();

    try {
      return transactions.firstWhere((t) => t['id'] == transactionId);
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

    final expiresAt = lastSync.add(const Duration(days: _cacheValidityDays));
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
    return lastSync.add(const Duration(days: _cacheValidityDays));
  }

  /// Get cached transaction count.
  Future<int> getCachedTransactionCount() async {
    final transactions = await getAllCachedTransactions();
    return transactions.length;
  }

  /// Get total amount of cached transactions.
  Future<double> getTotalAmount() async {
    final transactions = await getAllCachedTransactions();
    double total = 0;
    for (final t in transactions) {
      total += (t['amount'] as num?)?.toDouble() ?? 0;
    }
    return total;
  }

  /// Get today's total amount.
  Future<double> getTodayTotalAmount() async {
    final transactions = await getTodayTransactions();
    double total = 0;
    for (final t in transactions) {
      total += (t['amount'] as num?)?.toDouble() ?? 0;
    }
    return total;
  }

  /// Clear all cached transactions.
  Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_transactionListKey);
    await prefs.remove(_lastSyncKey);
    await prefs.remove(_agentIdKey);
  }

  /// Check if any transactions are cached.
  Future<bool> hasCachedTransactions() async {
    final count = await getCachedTransactionCount();
    return count > 0;
  }

  /// Get statistics summary.
  Future<Map<String, dynamic>> getStatistics() async {
    final transactions = await getAllCachedTransactions();
    final todayTransactions = await getTodayTransactions();

    double totalAmount = 0;
    double todayAmount = 0;
    int successCount = 0;
    int failedCount = 0;

    for (final t in transactions) {
      totalAmount += (t['amount'] as num?)?.toDouble() ?? 0;
      if (t['status'] == 'SUCESSO') {
        successCount++;
      } else if (t['status'] == 'FALHOU') {
        failedCount++;
      }
    }

    for (final t in todayTransactions) {
      todayAmount += (t['amount'] as num?)?.toDouble() ?? 0;
    }

    return {
      'total_count': transactions.length,
      'today_count': todayTransactions.length,
      'total_amount': totalAmount,
      'today_amount': todayAmount,
      'success_count': successCount,
      'failed_count': failedCount,
    };
  }

  /// Update merchant data in all cached transactions for a specific merchant.
  /// Used to propagate merchant name/data changes to transaction history.
  /// Handles both 'merchant_name' direct field and nested 'merchant' object.
  Future<int> updateMerchantInTransactions({
    required dynamic merchantId,
    String? newName,
    Map<String, dynamic>? merchantUpdates,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final transactions = await getAllCachedTransactions();

    int updatedCount = 0;

    for (int i = 0; i < transactions.length; i++) {
      final tx = transactions[i];

      // Check for merchant_id match (direct field or nested)
      final txMerchantId = tx['merchant_id'] ?? tx['merchant']?['id'];

      bool idsMatch = false;
      if (txMerchantId == merchantId) {
        idsMatch = true;
      } else if (txMerchantId.toString() == merchantId.toString()) {
        idsMatch = true;
      }

      if (idsMatch) {
        // Update merchant_name direct field
        if (newName != null) {
          transactions[i]['merchant_name'] = newName;
        }

        // Update nested merchant object if exists
        if (tx['merchant'] != null && tx['merchant'] is Map) {
          if (newName != null) {
            (transactions[i]['merchant'] as Map<String, dynamic>)['full_name'] =
                newName;
          }
          if (merchantUpdates != null) {
            for (final key in merchantUpdates.keys) {
              (transactions[i]['merchant'] as Map<String, dynamic>)[key] =
                  merchantUpdates[key];
            }
          }
        }

        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await prefs.setString(_transactionListKey, jsonEncode(transactions));
      debugPrint(
        '✅ Updated $updatedCount transactions for merchant ID $merchantId',
      );
    }

    return updatedCount;
  }
}
