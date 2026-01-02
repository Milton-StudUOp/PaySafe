import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../utils/constants.dart';
import '../services/feedback_service.dart';
import '../services/connectivity_service.dart';
import '../services/qr_verification_service.dart';

/// Receipt Verification Screen with animated results
class ReceiptVerificationScreen extends StatefulWidget {
  final String qrToken;

  const ReceiptVerificationScreen({super.key, required this.qrToken});

  @override
  State<ReceiptVerificationScreen> createState() =>
      _ReceiptVerificationScreenState();
}

class _ReceiptVerificationScreenState extends State<ReceiptVerificationScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _result;
  String? _error;
  String _debugInfo = '';
  bool _isOfflineVerification = false;

  final ConnectivityService _connectivity = ConnectivityService();
  final QRVerificationService _qrVerification = QRVerificationService();

  @override
  void initState() {
    super.initState();
    _verifyReceipt();
  }

  Future<void> _verifyReceipt() async {
    final isOnline = _connectivity.isConnected;

    debugPrint('\\n══════════════════════════════════════════');
    debugPrint('VERIFY: QR Token = ${widget.qrToken}');
    debugPrint('VERIFY: isOnline = $isOnline');
    debugPrint('══════════════════════════════════════════');

    _debugInfo =
        '''
=== DEBUG INFO ===
QR Token: ${widget.qrToken}
Mode: ${isOnline ? 'ONLINE' : 'OFFLINE'}
''';

    // Try online verification first if connected
    if (isOnline) {
      final success = await _tryOnlineVerification();
      if (success) return;

      // If online verification failed, try offline as fallback
      debugPrint('VERIFY: Online failed, trying offline fallback');
      _debugInfo += 'Online failed, trying offline...\n';
    }

    // Offline verification
    await _verifyOffline();
  }

  /// Try to verify via backend API
  Future<bool> _tryOnlineVerification() async {
    final baseUrl = AppConstants.baseUrl;
    final url =
        '$baseUrl/receipts/verify/${Uri.encodeComponent(widget.qrToken)}';

    _debugInfo += 'API URL: $url\n';

    try {
      final response = await http
          .get(Uri.parse(url), headers: {'Content-Type': 'application/json'})
          .timeout(const Duration(seconds: 10));

      _debugInfo += 'Response: ${response.statusCode}\n';
      debugPrint('VERIFY: Status = ${response.statusCode}');
      debugPrint('VERIFY: Body = ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _result = data;
          _isLoading = false;
          _isOfflineVerification = false;
        });

        if (data['is_valid'] == true) {
          FeedbackService().successFeedback();
        } else {
          FeedbackService().errorFeedback();
        }
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('VERIFY: Exception = $e');
      _debugInfo += 'Exception: $e\n';
      return false;
    }
  }

  /// Verify using local cache and HMAC
  Future<void> _verifyOffline() async {
    debugPrint('VERIFY: Using offline verification');
    _debugInfo += 'Using OFFLINE verification\n';

    final result = await _qrVerification.verifyOffline(widget.qrToken);

    if (result != null) {
      setState(() {
        _result = result.toJson();
        _isLoading = false;
        _isOfflineVerification = true;
      });

      if (result.isValid) {
        FeedbackService().successFeedback();
      } else {
        FeedbackService().errorFeedback();
      }
    } else {
      setState(() {
        _error = 'Não foi possível verificar offline';
        _isLoading = false;
        _isOfflineVerification = true;
      });
      FeedbackService().errorFeedback();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _getBackgroundColor(),
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: IconButton(
                      icon: const Icon(LucideIcons.x, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const Spacer(),
                  Column(
                    children: [
                      Text(
                        "Verificação de Recibo",
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (_isOfflineVerification && !_isLoading)
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.orange.withOpacity(0.8),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                LucideIcons.wifiOff,
                                size: 10,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'OFFLINE',
                                style: GoogleFonts.inter(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const Spacer(),
                  const SizedBox(width: 48),
                ],
              ),
            ),

            // Main Content
            Expanded(
              child: _isLoading
                  ? _buildLoadingState()
                  : _error != null
                  ? _buildErrorState()
                  : _buildResultState(),
            ),

            // Bottom Button
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(LucideIcons.arrowLeft),
                  label: const Text("VOLTAR"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: _getBackgroundColor(),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    textStyle: GoogleFonts.inter(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getBackgroundColor() {
    if (_isLoading) return const Color(0xFF1E293B);
    if (_error != null) return const Color(0xFFDC2626);
    if (_result?['is_valid'] == true) {
      return _result?['status'] == 'SUSPICIOUS'
          ? const Color(0xFFF59E0B) // Amber for suspicious
          : const Color(0xFF059669); // Green for valid
    }
    return const Color(0xFFDC2626); // Red for invalid
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 3,
                  ),
                ),
              )
              .animate(onPlay: (c) => c.repeat())
              .shimmer(duration: 1500.ms, color: Colors.white.withOpacity(0.3)),
          const SizedBox(height: 32),
          Text(
            "Verificando...",
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Aguarde enquanto validamos o recibo",
            style: GoogleFonts.inter(
              color: Colors.white.withOpacity(0.7),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  LucideIcons.alertTriangle,
                  color: Colors.white,
                  size: 40,
                ),
              )
              .animate()
              .fadeIn(duration: 300.ms)
              .scale(begin: const Offset(0.5, 0.5)),
          const SizedBox(height: 24),
          Text(
            "Erro na Verificação",
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _error ?? "Não foi possível verificar o recibo",
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              color: Colors.white.withOpacity(0.8),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          // DEBUG INFO BOX - Always show for troubleshooting
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "🔍 DEBUG INFO:",
                  style: GoogleFonts.robotoMono(
                    color: Colors.yellow,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                SelectableText(
                  _debugInfo,
                  style: GoogleFonts.robotoMono(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultState() {
    final isValid = _result?['is_valid'] == true;
    final isSuspicious = _result?['status'] == 'SUSPICIOUS';
    final currencyFormat = NumberFormat.currency(
      locale: 'pt_MZ',
      symbol: 'MZN ',
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 20),

          // Status Icon
          Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isValid
                      ? (isSuspicious
                            ? LucideIcons.alertTriangle
                            : LucideIcons.checkCircle2)
                      : LucideIcons.xCircle,
                  color: Colors.white,
                  size: 56,
                ),
              )
              .animate()
              .fadeIn(duration: 400.ms)
              .scale(
                begin: const Offset(0.3, 0.3),
                curve: Curves.elasticOut,
                duration: 600.ms,
              ),

          const SizedBox(height: 24),

          // Status Message
          Text(
            _result?['message'] ?? '',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(delay: 200.ms),

          // Warning if exists
          if (_result?['warning'] != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _result!['warning'],
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ).animate().fadeIn(delay: 400.ms),
          ],

          const SizedBox(height: 32),

          // Details Card (only if valid)
          if (isValid) ...[
            Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow(
                        LucideIcons.receipt,
                        "Código",
                        _result?['receipt_code'] ?? '-',
                      ),
                      const Divider(height: 24),
                      _buildDetailRow(
                        LucideIcons.banknote,
                        "Valor",
                        currencyFormat.format(
                          double.tryParse(
                                _result?['amount']?.toString() ?? '0',
                              ) ??
                              0,
                        ),
                        valueColor: const Color(0xFF059669),
                        isBold: true,
                      ),
                      const Divider(height: 24),
                      _buildDetailRow(
                        LucideIcons.user,
                        "Comerciante",
                        _result?['merchant_name'] ?? '-',
                      ),
                      const Divider(height: 24),
                      _buildDetailRow(
                        LucideIcons.users,
                        "Agente",
                        _result?['agent_name'] ?? '-',
                      ),
                      const Divider(height: 24),
                      _buildDetailRow(
                        LucideIcons.store,
                        "Mercado",
                        _result?['market_name'] ?? '-',
                      ),
                      const Divider(height: 24),
                      _buildDetailRow(
                        LucideIcons.calendar,
                        "Data",
                        _formatDate(_result?['issued_at']),
                      ),
                      const Divider(height: 24),
                      _buildDetailRow(
                        LucideIcons.printer,
                        "Impressões",
                        '${_result?['reprint_count'] ?? 0}x',
                        valueColor: (_result?['reprint_count'] ?? 0) > 2
                            ? Colors.orange
                            : Colors.grey,
                      ),
                    ],
                  ),
                )
                .animate()
                .fadeIn(delay: 300.ms, duration: 400.ms)
                .slideY(begin: 0.1, end: 0, duration: 400.ms),
          ],

          // DEBUG INFO BOX - Show when invalid for troubleshooting
          if (!isValid) ...[
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "🔍 DEBUG INFO:",
                    style: GoogleFonts.robotoMono(
                      color: Colors.yellow,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SelectableText(
                    _debugInfo,
                    style: GoogleFonts.robotoMono(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Status: ${_result?['status'] ?? 'N/A'}",
                    style: GoogleFonts.robotoMono(
                      color: Colors.orange,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildDetailRow(
    IconData icon,
    String label,
    String value, {
    Color? valueColor,
    bool isBold = false,
  }) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 18, color: const Color(0xFF64748B)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: valueColor ?? Colors.black87,
                  fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd/MM/yyyy HH:mm').format(date);
    } catch (e) {
      return dateStr;
    }
  }
}
