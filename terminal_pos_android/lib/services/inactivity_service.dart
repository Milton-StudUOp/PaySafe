import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service to track user inactivity and trigger logout.
/// After 5 minutes (300 seconds) of inactivity, the user is logged out.
class InactivityService {
  static const int _timeoutSeconds = 300; // 5 minutes
  static Timer? _inactivityTimer;
  static bool _isMonitoring = false;

  /// Start monitoring user activity.
  /// Call this after successful login.
  static void startMonitoring(BuildContext context) {
    if (_isMonitoring) return;
    _isMonitoring = true;
    _resetTimer(context);
  }

  /// Stop monitoring (call on logout or when on login screen).
  static void stopMonitoring() {
    _inactivityTimer?.cancel();
    _inactivityTimer = null;
    _isMonitoring = false;
  }

  /// Reset the inactivity timer.
  /// Call this on any user interaction.
  static void resetTimer(BuildContext context) {
    if (!_isMonitoring) return;
    _resetTimer(context);
  }

  /// Internal method to reset timer
  static void _resetTimer(BuildContext context) {
    _inactivityTimer?.cancel();
    _inactivityTimer = Timer(const Duration(seconds: _timeoutSeconds), () {
      _handleTimeout(context);
    });
  }

  /// Handle timeout - log out and redirect to login
  static Future<void> _handleTimeout(BuildContext context) async {
    stopMonitoring();

    // Clear session but keep agent code
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    // Keep user_data for agent code display
    // Keep device_data for device identification

    // Navigate to login screen
    if (context.mounted) {
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);

      // Show informative snackbar
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
  }
}

/// Wrapper widget that detects user activity and resets inactivity timer.
/// Wrap your main app or screens with this widget.
class InactivityDetector extends StatelessWidget {
  final Widget child;

  const InactivityDetector({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () => InactivityService.resetTimer(context),
      onPanDown: (_) => InactivityService.resetTimer(context),
      onScaleStart: (_) => InactivityService.resetTimer(context),
      child: child,
    );
  }
}
