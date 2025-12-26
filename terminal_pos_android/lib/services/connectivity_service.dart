import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

/// Service to monitor network connectivity status.
/// Provides real-time connection state for the app.
class ConnectivityService extends ChangeNotifier {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  bool _isOnline = true;
  bool _isServerReachable = true;
  Timer? _checkTimer;
  DateTime? _lastCheck;

  /// Current online status.
  bool get isOnline => _isOnline;

  /// Whether the server is reachable.
  bool get isServerReachable => _isServerReachable;

  /// Combined connectivity status.
  bool get isConnected => _isOnline && _isServerReachable;

  /// Last connectivity check time.
  DateTime? get lastCheck => _lastCheck;

  /// Start periodic connectivity checks.
  void startMonitoring({Duration interval = const Duration(seconds: 30)}) {
    _checkTimer?.cancel();
    _checkTimer = Timer.periodic(interval, (_) => checkConnectivity());
    // Initial check
    checkConnectivity();
  }

  /// Stop connectivity monitoring.
  void stopMonitoring() {
    _checkTimer?.cancel();
    _checkTimer = null;
  }

  /// Manually check connectivity.
  Future<bool> checkConnectivity() async {
    _lastCheck = DateTime.now();

    // Check internet connectivity
    try {
      final result = await InternetAddress.lookup(
        'google.com',
      ).timeout(const Duration(seconds: 5));
      _isOnline = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      _isOnline = false;
    } on TimeoutException catch (_) {
      _isOnline = false;
    }

    // Check server reachability
    if (_isOnline) {
      _isServerReachable = await _checkServerReachability();
    } else {
      _isServerReachable = false;
    }

    notifyListeners();
    return isConnected;
  }

  /// Check if the PaySafe server is reachable.
  Future<bool> _checkServerReachability() async {
    try {
      // Extract host from base URL
      final uri = Uri.parse(AppConstants.baseUrl);
      final healthUrl = Uri.parse(
        '${uri.scheme}://${uri.host}:${uri.port}/health',
      );

      final response = await http
          .get(healthUrl)
          .timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Get a human-readable status message.
  String get statusMessage {
    if (!_isOnline) {
      return 'Sem conexão à internet';
    } else if (!_isServerReachable) {
      return 'Servidor indisponível';
    } else {
      return 'Conectado';
    }
  }

  @override
  void dispose() {
    stopMonitoring();
    super.dispose();
  }
}
