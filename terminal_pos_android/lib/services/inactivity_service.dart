import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service to track user inactivity and trigger logout.
/// After 5 minutes (300 seconds) of inactivity, the user is logged out.
class InactivityService {
  static const int _timeoutSeconds = 300; // 5 minutes
  static Timer? _inactivityTimer;
  static bool _isMonitoring = false;

  // Global navigator key for reliable navigation after timeout
  static GlobalKey<NavigatorState>? _navigatorKey;

  /// Initialize with the navigator key from MaterialApp.
  /// Call this once in main.dart.
  static void initialize(GlobalKey<NavigatorState> navigatorKey) {
    _navigatorKey = navigatorKey;
    debugPrint('⏱️ InactivityService initialized');
  }

  /// Start monitoring user activity.
  /// Call this after successful login.
  static void startMonitoring() {
    if (_isMonitoring) return;
    _isMonitoring = true;
    _resetTimer();
    debugPrint(
      '⏱️ Inactivity monitoring STARTED (${_timeoutSeconds}s timeout)',
    );
  }

  /// Stop monitoring (call on logout or when on login screen).
  static void stopMonitoring() {
    _inactivityTimer?.cancel();
    _inactivityTimer = null;
    _isMonitoring = false;
    debugPrint('⏱️ Inactivity monitoring STOPPED');
  }

  /// Reset the inactivity timer.
  /// Call this on any user interaction.
  static void resetTimer() {
    if (!_isMonitoring) return;
    _resetTimer();
  }

  /// Internal method to reset timer
  static void _resetTimer() {
    _inactivityTimer?.cancel();
    _inactivityTimer = Timer(Duration(seconds: _timeoutSeconds), () {
      debugPrint(
        '⏱️ INACTIVITY TIMEOUT TRIGGERED after $_timeoutSeconds seconds',
      );
      _handleTimeout();
    });
  }

  /// Handle timeout - log out and redirect to login
  static Future<void> _handleTimeout() async {
    stopMonitoring();

    // Clear session but keep agent code for convenience
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.setBool('is_offline_mode', false);
    // Keep user_data for agent code display
    // Keep device_data for device identification

    // Navigate to login screen using global navigator key
    if (_navigatorKey?.currentState != null) {
      _navigatorKey!.currentState!.pushNamedAndRemoveUntil(
        '/login',
        (route) => false,
      );

      // Show informative snackbar after navigation
      Future.delayed(const Duration(milliseconds: 500), () {
        final context = _navigatorKey!.currentContext;
        if (context != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Sessão expirada por inatividade. Por favor, insira sua senha.',
              ),
              backgroundColor: Color(0xFFEA580C),
              duration: Duration(seconds: 4),
            ),
          );
        }
      });
    } else {
      debugPrint('⚠️ Navigator key not available for inactivity logout');
    }
  }
}

/// Wrapper widget that detects user activity and resets inactivity timer.
/// Wrap your main app or screens with this widget.
class InactivityDetector extends StatelessWidget {
  final Widget child;

  const InactivityDetector({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => InactivityService.resetTimer(),
      onPointerMove: (_) => InactivityService.resetTimer(),
      child: child,
    );
  }
}
