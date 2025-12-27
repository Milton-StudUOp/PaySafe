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

  // Stream controller for broadcasting connectivity changes
  final _connectionInfoController = StreamController<bool>.broadcast();

  /// Stream of connectivity status (true = connected to server).
  Stream<bool> get connectionStream => _connectionInfoController.stream;

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
  /// Default interval is 5 seconds for near real-time updates.
  void startMonitoring({Duration interval = const Duration(seconds: 5)}) {
    _checkTimer?.cancel();
    _checkTimer = Timer.periodic(interval, (_) => checkConnectivity());
    // Initial check
    checkConnectivity();
  }

  /// Stop connectivity monitoring.
  void stopMonitoring() {
    _checkTimer?.cancel();
    _checkTimer = null;
    _connectionInfoController.close();
  }

  /// Manually check connectivity.
  Future<bool> checkConnectivity() async {
    _lastCheck = DateTime.now();
    final bool previousStatus = isConnected;

    // Check internet connectivity (DNS)
    bool hasInternet = false;
    try {
      final result = await InternetAddress.lookup(
        'google.com',
      ).timeout(const Duration(seconds: 5));
      hasInternet = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (_) {
      hasInternet = false;
    }
    _isOnline = hasInternet;

    // Check server reachability (Health Check)
    if (_isOnline) {
      _isServerReachable = await _checkServerReachability();
    } else {
      _isServerReachable = false;
    }

    // Notify listeners if status changed
    if (isConnected != previousStatus) {
      notifyListeners();
      _connectionInfoController.add(isConnected);
      debugPrint(
        '🌐 Connectivity changed: ${isConnected ? "ONLINE" : "OFFLINE"}',
      );
    }

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
      return 'Sem internet';
    } else if (!_isServerReachable) {
      return 'Servidor indisponível';
    } else {
      return 'Conectado';
    }
  }

  @override
  void dispose() {
    _checkTimer?.cancel();
    // Do not close stream here if it's a singleton used heavily,
    // or ensure meaningful re-init. But standard pattern is ok.
    super.dispose();
  }
}
