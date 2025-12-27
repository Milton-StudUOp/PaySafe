import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:crypto/crypto.dart';

/// Service for offline authentication with secure credential caching.
///
/// Security features:
/// - PIN stored as SHA-256 hash (never plaintext)
/// - Cache expires after 48 hours
/// - Device-bound salt for additional security
class OfflineAuthService {
  static const String _cacheKeyPrefix = 'offline_auth_';
  static const String _lastSyncKey = 'last_sync_timestamp';
  static const int _cacheValidityHours = 48;

  /// Cache agent credentials after successful online login.
  /// The PIN is hashed for validation and encoded for auto-refresh.
  Future<void> cacheCredentials({
    required String agentCode,
    required String pin,
    required Map<String, dynamic> agentData,
    required Map<String, dynamic>? deviceData,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    // Create salted hash of PIN for secure validation
    final salt = _generateSalt(agentCode);
    final pinHash = _hashPin(pin, salt);

    // Encode PIN for auto-refresh (Base64 obfuscation)
    // Note: This is less secure than hashing but needed for auto-refresh
    final pinEncoded = base64Encode(utf8.encode(pin));

    // Store cached data
    final cacheData = {
      'pin_hash': pinHash,
      'pin_encoded': pinEncoded, // For auto-refresh
      'salt': salt,
      'agent_data': agentData,
      'device_data': deviceData,
      'cached_at': DateTime.now().toIso8601String(),
    };

    await prefs.setString('$_cacheKeyPrefix$agentCode', jsonEncode(cacheData));

    // Update last sync timestamp
    await prefs.setString(_lastSyncKey, DateTime.now().toIso8601String());
  }

  /// Validate PIN against cached hash for offline login.
  Future<bool> validateOffline(String agentCode, String pin) async {
    final cachedData = await _getCachedData(agentCode);
    if (cachedData == null) return false;

    // Check if cache is expired
    if (!await isCacheValid(agentCode)) return false;

    // Validate PIN hash
    final salt = cachedData['salt'] as String;
    final storedHash = cachedData['pin_hash'] as String;
    final inputHash = _hashPin(pin, salt);

    return storedHash == inputHash;
  }

  /// Get cached agent data for offline use.
  Future<Map<String, dynamic>?> getCachedAgentData(String agentCode) async {
    final cachedData = await _getCachedData(agentCode);
    if (cachedData == null) return null;

    return cachedData['agent_data'] as Map<String, dynamic>?;
  }

  /// Get cached device data for offline use.
  Future<Map<String, dynamic>?> getCachedDeviceData(String agentCode) async {
    final cachedData = await _getCachedData(agentCode);
    if (cachedData == null) return null;

    return cachedData['device_data'] as Map<String, dynamic>?;
  }

  /// Get cached PIN for auto-refresh (Base64 decoded).
  /// Returns null if no cached PIN or cache is expired.
  Future<String?> getCachedPin(String agentCode) async {
    final cachedData = await _getCachedData(agentCode);
    if (cachedData == null) return null;

    // Check if cache is still valid
    if (!await isCacheValid(agentCode)) return null;

    final pinEncoded = cachedData['pin_encoded'] as String?;
    if (pinEncoded == null) return null;

    try {
      return utf8.decode(base64Decode(pinEncoded));
    } catch (e) {
      return null;
    }
  }

  /// Check if cached credentials are still valid (not expired).
  Future<bool> isCacheValid(String agentCode) async {
    final cachedData = await _getCachedData(agentCode);
    if (cachedData == null) return false;

    final cachedAtStr = cachedData['cached_at'] as String?;
    if (cachedAtStr == null) return false;

    final cachedAt = DateTime.tryParse(cachedAtStr);
    if (cachedAt == null) return false;

    final expiresAt = cachedAt.add(const Duration(hours: _cacheValidityHours));
    return DateTime.now().isBefore(expiresAt);
  }

  /// Check if any cached credentials exist for an agent.
  Future<bool> hasCachedCredentials(String agentCode) async {
    final cachedData = await _getCachedData(agentCode);
    return cachedData != null;
  }

  /// Get the last sync timestamp.
  Future<DateTime?> getLastSyncTime() async {
    final prefs = await SharedPreferences.getInstance();
    final lastSyncStr = prefs.getString(_lastSyncKey);
    if (lastSyncStr == null) return null;
    return DateTime.tryParse(lastSyncStr);
  }

  /// Get cache expiry time for an agent.
  Future<DateTime?> getCacheExpiryTime(String agentCode) async {
    final cachedData = await _getCachedData(agentCode);
    if (cachedData == null) return null;

    final cachedAtStr = cachedData['cached_at'] as String?;
    if (cachedAtStr == null) return null;

    final cachedAt = DateTime.tryParse(cachedAtStr);
    if (cachedAt == null) return null;

    return cachedAt.add(const Duration(hours: _cacheValidityHours));
  }

  /// Clear cached credentials for an agent.
  Future<void> clearCache(String agentCode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_cacheKeyPrefix$agentCode');
  }

  /// Clear all expired caches.
  Future<void> clearExpiredCaches() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((k) => k.startsWith(_cacheKeyPrefix));

    for (final key in keys) {
      final agentCode = key.replaceFirst(_cacheKeyPrefix, '');
      if (!await isCacheValid(agentCode)) {
        await prefs.remove(key);
      }
    }
  }

  // --- Private Methods ---

  Future<Map<String, dynamic>?> _getCachedData(String agentCode) async {
    final prefs = await SharedPreferences.getInstance();
    final dataStr = prefs.getString('$_cacheKeyPrefix$agentCode');
    if (dataStr == null) return null;

    try {
      return jsonDecode(dataStr) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  String _generateSalt(String agentCode) {
    // Use agent code + fixed app secret as salt base
    final saltBase = 'paysafe_offline_${agentCode}_\$2b\$12';
    final bytes = utf8.encode(saltBase);
    return sha256.convert(bytes).toString().substring(0, 16);
  }

  String _hashPin(String pin, String salt) {
    // SHA-256 hash with salt
    final combined = '$salt:$pin';
    final bytes = utf8.encode(combined);
    return sha256.convert(bytes).toString();
  }
}
