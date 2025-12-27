import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service for caching markets locally for offline access.
/// Markets are synced on login and used for offline merchant operations.
class MarketCacheService {
  static const String _marketsKey = 'cached_markets';
  static const String _syncTimeKey = 'markets_sync_time';
  static const int _cacheValidityHours = 9999999; // DAYS

  /// Cache markets for offline use.
  Future<void> cacheMarkets(List<Map<String, dynamic>> markets) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(_marketsKey, jsonEncode(markets));
    await prefs.setString(_syncTimeKey, DateTime.now().toIso8601String());

    debugPrint('Cached ${markets.length} markets for offline use');
  }

  /// Get all cached markets.
  Future<List<Map<String, dynamic>>> getCachedMarkets() async {
    final prefs = await SharedPreferences.getInstance();
    final marketsStr = prefs.getString(_marketsKey);
    if (marketsStr == null) return [];

    try {
      final List<dynamic> list = jsonDecode(marketsStr);
      return list
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (e) {
      debugPrint('Error loading cached markets: $e');
      return [];
    }
  }

  /// Get a market by ID from cache.
  Future<Map<String, dynamic>?> getMarketById(int marketId) async {
    final markets = await getCachedMarkets();
    try {
      return markets.firstWhere((m) => m['id'] == marketId);
    } catch (e) {
      return null;
    }
  }

  /// Check if cache is valid (not expired).
  Future<bool> isCacheValid() async {
    final prefs = await SharedPreferences.getInstance();
    final syncTimeStr = prefs.getString(_syncTimeKey);
    if (syncTimeStr == null) return false;

    try {
      final syncTime = DateTime.parse(syncTimeStr);
      final expiryTime = syncTime.add(
        const Duration(hours: _cacheValidityHours),
      );
      return DateTime.now().isBefore(expiryTime);
    } catch (e) {
      return false;
    }
  }

  /// Get last sync time.
  Future<DateTime?> getLastSyncTime() async {
    final prefs = await SharedPreferences.getInstance();
    final syncTimeStr = prefs.getString(_syncTimeKey);
    if (syncTimeStr == null) return null;
    return DateTime.tryParse(syncTimeStr);
  }

  /// Get cached market count.
  Future<int> getCachedMarketCount() async {
    final markets = await getCachedMarkets();
    return markets.length;
  }

  /// Check if there are cached markets.
  Future<bool> hasCachedMarkets() async {
    final count = await getCachedMarketCount();
    return count > 0;
  }

  /// Clear the cache.
  Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_marketsKey);
    await prefs.remove(_syncTimeKey);
  }
}
