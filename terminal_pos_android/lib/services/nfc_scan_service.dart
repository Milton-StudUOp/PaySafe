import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'feedback_service.dart';

/// Service for scanning NFC tags and retrieving UIDs.
/// Provides a modern, user-friendly dialog experience.
class NfcScanService {
  /// Starts an NFC session and shows a modern dialog.
  /// Returns the scanned UID as a String, or null if cancelled/error.
  static Future<String?> scanNfcUid(BuildContext context) async {
    // Check NFC Availability
    final isAvailable = await NfcManager.instance.isAvailable();
    if (!isAvailable) {
      _showErrorSnackBar(context, "NFC não está disponível neste dispositivo.");
      return null;
    }

    String? scannedUid;
    bool sessionActive = true;

    // Start NFC Session
    NfcManager.instance.startSession(
      alertMessage: "Aproxime o cartão NFC",
      onDiscovered: (NfcTag tag) async {
        try {
          // Extract UID from tag
          final tagId =
              tag.data['nfca']?['identifier'] ??
              tag.data['nfcb']?['identifier'] ??
              tag.data['nfcf']?['identifier'] ??
              tag.data['nfcv']?['identifier'] ??
              tag.data['isodep']?['identifier'];

          if (tagId != null && tagId is List<int>) {
            scannedUid = tagId
                .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
                .join('')
                .toUpperCase();

            // Haptic feedback on success
            FeedbackService().successFeedback();
          }

          await NfcManager.instance.stopSession();
          sessionActive = false;

          // Close dialog if context is still valid
          if (context.mounted) {
            Navigator.of(context).pop();
          }
        } catch (e) {
          await NfcManager.instance.stopSession();
          sessionActive = false;
          if (context.mounted) {
            Navigator.of(context).pop();
            _showErrorSnackBar(context, "Erro ao ler NFC: $e");
          }
        }
      },
      onError: (error) async {
        sessionActive = false;
        if (context.mounted) {
          Navigator.of(context).pop();
          _showErrorSnackBar(context, "Erro NFC: ${error.message}");
        }
        return;
      },
    );

    // Show dialog and wait for result
    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => _NfcScanDialog(
        onCancel: () async {
          if (sessionActive) {
            await NfcManager.instance.stopSession();
            sessionActive = false;
          }
          Navigator.of(dialogContext).pop();
        },
      ),
    );

    // Ensure session is stopped if dialog was dismissed externally
    if (sessionActive) {
      await NfcManager.instance.stopSession();
    }

    return scannedUid;
  }

  static void _showErrorSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(LucideIcons.alertCircle, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }
}

/// Modern NFC Scan Dialog with pulsing animation.
class _NfcScanDialog extends StatelessWidget {
  final VoidCallback onCancel;

  const _NfcScanDialog({required this.onCancel});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Pulsing NFC Icon
            Stack(
              alignment: Alignment.center,
              children: [
                // Outer pulse ring
                Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF10B981).withOpacity(0.1),
                      ),
                    )
                    .animate(onPlay: (c) => c.repeat())
                    .scale(
                      begin: const Offset(1, 1),
                      end: const Offset(1.3, 1.3),
                      duration: 1200.ms,
                      curve: Curves.easeOut,
                    )
                    .fadeOut(duration: 1200.ms),
                // Inner icon container
                Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF10B981).withOpacity(0.15),
                        border: Border.all(
                          color: const Color(0xFF10B981).withOpacity(0.3),
                          width: 2,
                        ),
                      ),
                      child: const Icon(
                        LucideIcons.nfc,
                        size: 40,
                        color: Color(0xFF10B981),
                      ),
                    )
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .scale(
                      begin: const Offset(1, 1),
                      end: const Offset(1.08, 1.08),
                      duration: 800.ms,
                      curve: Curves.easeInOut,
                    ),
              ],
            ),

            const SizedBox(height: 24),

            // Title
            Text(
              "Aproxime o Cartão NFC",
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0F172A),
              ),
            ),

            const SizedBox(height: 8),

            // Subtitle
            Text(
              "Posicione o cartão na parte traseira do dispositivo para ler o UID.",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 14,
                color: const Color(0xFF64748B),
                height: 1.5,
              ),
            ),

            const SizedBox(height: 32),

            // Cancel Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onCancel,
                icon: const Icon(LucideIcons.x, size: 18),
                label: const Text("Cancelar"),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF64748B),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
