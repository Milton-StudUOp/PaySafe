import 'package:shared_preferences/shared_preferences.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Application constants and configuration.
/// Supports remote server configuration via settings.
class AppConstants {
  // Default server URL - can be overridden via settings
  // Using template placeholder {server}
  static const String _defaultBaseUrl = "http://{server}:8000/api/v1";

  // App version - loaded dynamically from pubspec.yaml
  static String _appVersion = "1.0.0";
  static String _appBuildNumber = "1";

  /// Get the current app version (from pubspec.yaml)
  static String get appVersion => _appVersion;

  /// Get the current build number (from pubspec.yaml)
  static String get appBuildNumber => _appBuildNumber;

  /// Get full version string (e.g., "1.0.36+7")
  static String get fullVersion => "$_appVersion+$_appBuildNumber";

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

    // Load version from package info
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _appVersion = packageInfo.version;
      _appBuildNumber = packageInfo.buildNumber;
    } catch (e) {
      // Keep defaults if fails
    }
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
