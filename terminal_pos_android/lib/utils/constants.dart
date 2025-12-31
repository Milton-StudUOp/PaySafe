import 'package:shared_preferences/shared_preferences.dart';

/// Application constants and configuration.
/// Supports remote server configuration via settings.
class AppConstants {
  // Default server URL - can be overridden via settings
  // Using template placeholder {server}
  static const String _defaultBaseUrl = "http://{server}:8000/api/v1";

  // App version - displayed in splash screen
  static const String appVersion = "1.0.0";
  static const String appBuildNumber = "1";

  // Preference keys
  static const String _serverUrlKey = 'server_url';

  // Cached server URL
  static String? _cachedServerUrl;

  /// Get the current base URL.
  /// Returns custom URL if configured, otherwise default template.
  static String get baseUrl => _cachedServerUrl ?? _defaultBaseUrl;

  /// Get the URL template for configuration
  static String get urlTemplate => _defaultBaseUrl;

  /// Initialize constants - call this at app startup.
  static Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _cachedServerUrl = prefs.getString(_serverUrlKey);
  }

  /// Set a custom server URL.
  static Future<void> setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverUrlKey, url);
    _cachedServerUrl = url;
  }

  /// Reset to default server URL.
  static Future<void> resetServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_serverUrlKey);
    _cachedServerUrl = null;
  }

  /// Check if using custom server URL.
  static bool get isUsingCustomServer => _cachedServerUrl != null;

  /// Get custom server URL if set.
  static String? get customServerUrl => _cachedServerUrl;
}
