import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';

/// Service for haptic feedback and audio feedback.
/// Provides consistent feedback across the app.
class FeedbackService {
  static final FeedbackService _instance = FeedbackService._internal();
  factory FeedbackService() => _instance;
  FeedbackService._internal();

  // Settings
  bool _hapticEnabled = true;
  bool _soundEnabled = true;

  /// Whether haptic feedback is enabled.
  bool get hapticEnabled => _hapticEnabled;
  set hapticEnabled(bool value) => _hapticEnabled = value;

  /// Whether sound feedback is enabled.
  bool get soundEnabled => _soundEnabled;
  set soundEnabled(bool value) => _soundEnabled = value;

  // ==========================================
  // HAPTIC FEEDBACK
  // ==========================================

  /// Light haptic feedback for subtle interactions.
  Future<void> lightHaptic() async {
    if (!_hapticEnabled) return;
    try {
      await HapticFeedback.lightImpact();
    } catch (e) {
      debugPrint('Haptic feedback error: $e');
    }
  }

  /// Medium haptic feedback for standard interactions.
  Future<void> mediumHaptic() async {
    if (!_hapticEnabled) return;
    try {
      await HapticFeedback.mediumImpact();
    } catch (e) {
      debugPrint('Haptic feedback error: $e');
    }
  }

  /// Heavy haptic feedback for important actions.
  Future<void> heavyHaptic() async {
    if (!_hapticEnabled) return;
    try {
      await HapticFeedback.heavyImpact();
    } catch (e) {
      debugPrint('Haptic feedback error: $e');
    }
  }

  /// Selection click haptic.
  Future<void> selectionClick() async {
    if (!_hapticEnabled) return;
    try {
      await HapticFeedback.selectionClick();
    } catch (e) {
      debugPrint('Haptic feedback error: $e');
    }
  }

  /// Vibrate for success actions.
  Future<void> successVibration() async {
    if (!_hapticEnabled) return;
    try {
      // Double vibration pattern for success
      await HapticFeedback.mediumImpact();
      await Future.delayed(const Duration(milliseconds: 100));
      await HapticFeedback.lightImpact();
    } catch (e) {
      debugPrint('Haptic feedback error: $e');
    }
  }

  /// Vibrate for error actions.
  Future<void> errorVibration() async {
    if (!_hapticEnabled) return;
    try {
      // Triple short vibration for error
      await HapticFeedback.heavyImpact();
      await Future.delayed(const Duration(milliseconds: 100));
      await HapticFeedback.heavyImpact();
      await Future.delayed(const Duration(milliseconds: 100));
      await HapticFeedback.heavyImpact();
    } catch (e) {
      debugPrint('Haptic feedback error: $e');
    }
  }

  /// Vibrate for warning.
  Future<void> warningVibration() async {
    if (!_hapticEnabled) return;
    try {
      // Long single vibration for warning
      await HapticFeedback.heavyImpact();
      await Future.delayed(const Duration(milliseconds: 200));
      await HapticFeedback.mediumImpact();
    } catch (e) {
      debugPrint('Haptic feedback error: $e');
    }
  }

  // ==========================================
  // SOUND FEEDBACK
  // ==========================================

  /// Play success sound (system sound).
  Future<void> playSuccessSound() async {
    if (!_soundEnabled) return;
    try {
      // Use system sounds - works on Android
      await SystemSound.play(SystemSoundType.click);
    } catch (e) {
      debugPrint('Sound feedback error: $e');
    }
  }

  /// Play error sound (system sound).
  Future<void> playErrorSound() async {
    if (!_soundEnabled) return;
    try {
      // Alert is a longer sound suitable for errors
      await SystemSound.play(SystemSoundType.alert);
    } catch (e) {
      debugPrint('Sound feedback error: $e');
    }
  }

  /// Play click sound.
  Future<void> playClickSound() async {
    if (!_soundEnabled) return;
    try {
      await SystemSound.play(SystemSoundType.click);
    } catch (e) {
      debugPrint('Sound feedback error: $e');
    }
  }

  // ==========================================
  // COMBINED FEEDBACK
  // ==========================================

  /// Success feedback - haptic + sound.
  Future<void> successFeedback() async {
    await Future.wait([successVibration(), playSuccessSound()]);
  }

  /// Error feedback - haptic + sound.
  Future<void> errorFeedback() async {
    await Future.wait([errorVibration(), playErrorSound()]);
  }

  /// Button tap feedback - light haptic + click sound.
  Future<void> buttonTapFeedback() async {
    await Future.wait([lightHaptic(), playClickSound()]);
  }

  /// Payment success feedback - medium haptic + sound.
  Future<void> paymentSuccessFeedback() async {
    await Future.wait([successVibration(), playSuccessSound()]);
  }

  /// NFC tap feedback - medium haptic.
  Future<void> nfcTapFeedback() async {
    await mediumHaptic();
  }
}
