import 'package:flutter/foundation.dart';
import 'sync_service.dart';
import 'connectivity_service.dart';

/// Background sync manager that triggers sync after online operations.
/// Runs silently in background without interrupting user flow.
class BackgroundSyncManager {
  static final BackgroundSyncManager _instance =
      BackgroundSyncManager._internal();
  factory BackgroundSyncManager() => _instance;
  BackgroundSyncManager._internal();

  final SyncService _syncService = SyncService();
  final ConnectivityService _connectivityService = ConnectivityService();

  bool _isSyncingMerchants = false;
  bool _isSyncingTransactions = false;

  /// Sync merchants in background after registration or edit.
  /// Non-blocking - runs silently.
  Future<void> syncMerchantsInBackground() async {
    // Avoid duplicate concurrent syncs
    if (_isSyncingMerchants) {
      debugPrint('🔄 Background sync merchants: already in progress, skipping');
      return;
    }

    // Only sync if online
    final isOnline = await _connectivityService.checkConnectivity();
    if (!isOnline) {
      debugPrint('🔄 Background sync merchants: offline, skipping');
      return;
    }

    _isSyncingMerchants = true;
    debugPrint('🔄 Background sync merchants: starting...');

    try {
      final result = await _syncService.syncMerchants();
      if (result.success) {
        debugPrint('✅ Background sync merchants: completed');
      } else {
        debugPrint('⚠️ Background sync merchants: ${result.message}');
      }
    } catch (e) {
      debugPrint('❌ Background sync merchants error: $e');
    } finally {
      _isSyncingMerchants = false;
    }
  }

  /// Sync transactions in background after payment.
  /// Non-blocking - runs silently.
  Future<void> syncTransactionsInBackground() async {
    // Avoid duplicate concurrent syncs
    if (_isSyncingTransactions) {
      debugPrint(
        '🔄 Background sync transactions: already in progress, skipping',
      );
      return;
    }

    // Only sync if online
    final isOnline = await _connectivityService.checkConnectivity();
    if (!isOnline) {
      debugPrint('🔄 Background sync transactions: offline, skipping');
      return;
    }

    _isSyncingTransactions = true;
    debugPrint('🔄 Background sync transactions: starting...');

    try {
      final result = await _syncService.syncTransactions();
      if (result.success) {
        debugPrint('✅ Background sync transactions: completed');
      } else {
        debugPrint('⚠️ Background sync transactions: ${result.message}');
      }
    } catch (e) {
      debugPrint('❌ Background sync transactions error: $e');
    } finally {
      _isSyncingTransactions = false;
    }
  }

  /// Sync both merchants and transactions after a payment.
  /// Called after successful online payment.
  Future<void> syncAfterPayment() async {
    debugPrint('🔄 Background sync after payment: starting...');

    // Run both syncs concurrently
    await Future.wait([
      syncTransactionsInBackground(),
      syncMerchantsInBackground(),
    ]);

    debugPrint('✅ Background sync after payment: completed');
  }

  /// Sync merchants after registration or edit.
  /// Called after successful merchant registration or edit.
  Future<void> syncAfterMerchantChange() async {
    debugPrint('🔄 Background sync after merchant change: starting...');
    await syncMerchantsInBackground();
    debugPrint('✅ Background sync after merchant change: completed');
  }
}
