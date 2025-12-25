import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart';

/// Service for device identification and registration.
/// Generates and stores a persistent device UUID for POS terminal identification.
class DeviceService {
  static const String _deviceUuidKey = 'device_uuid';
  static const String _firstRunKey = 'first_run_completed';

  /// Get or generate the device UUID.
  /// This UUID is generated once and persisted forever.
  Future<String> getDeviceUuid() async {
    final prefs = await SharedPreferences.getInstance();
    String? uuid = prefs.getString(_deviceUuidKey);

    if (uuid == null || uuid.isEmpty) {
      // Generate a new UUID using timestamp and random
      uuid = _generateUuid();
      await prefs.setString(_deviceUuidKey, uuid);
    }

    return uuid;
  }

  /// Check if this is the first run of the app.
  Future<bool> isFirstRun() async {
    final prefs = await SharedPreferences.getInstance();
    return !prefs.containsKey(_firstRunKey);
  }

  /// Mark first run as completed.
  Future<void> markFirstRunCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_firstRunKey, true);
  }

  /// Generate a UUID-like string for device identification.
  String _generateUuid() {
    final now = DateTime.now();
    final timestamp = now.millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString().padLeft(4, '0');

    // Format: POS-YYYYMMDD-XXXX (e.g., POS-20241225-1234)
    final dateStr =
        '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
    return 'POS-$dateStr-$random';
  }

  /// Copy device UUID to clipboard for easy sharing.
  Future<void> copyUuidToClipboard() async {
    final uuid = await getDeviceUuid();
    await Clipboard.setData(ClipboardData(text: uuid));
  }
}
