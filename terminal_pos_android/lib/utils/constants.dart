class AppConstants {
  // Using the IP detected earlier.
  // Ideally this should be configurable in the App Settings.
  static const String _defaultBaseUrl = "http://10.103.128.109:8000/api/v1";

  static String get baseUrl => _defaultBaseUrl;
}
