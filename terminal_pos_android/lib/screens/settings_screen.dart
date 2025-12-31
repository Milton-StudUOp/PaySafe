import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../utils/constants.dart';
import '../services/connectivity_service.dart';
import '../services/feedback_service.dart';
import '../utils/ui_utils.dart';

/// Settings screen for configuring server URL and app preferences.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _serverUrlController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _feedback = FeedbackService();

  bool _isTestingConnection = false;
  bool _connectionTestSuccess = false;
  String _connectionTestMessage = '';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  void _loadSettings() {
    final currentUrl = AppConstants.baseUrl;
    final template = AppConstants.urlTemplate;

    // If current URL is exactly the template, it means no custom server is set
    if (currentUrl == template) {
      _serverUrlController.text = '';
      return;
    }

    // Attempt to extract IP from the current URL based on the template structure
    // Template: http://{server}:8000/api/v1
    // We strip the known parts.
    // Note: This simple logic assumes the standard template modifications only.
    String ip = currentUrl;
    if (ip.startsWith('http://')) {
      ip = ip.substring(7);
    }
    final suffixIndex = ip.indexOf(':8000/api/v1');
    if (suffixIndex != -1) {
      ip = ip.substring(0, suffixIndex);
    }
    _serverUrlController.text = ip;
  }

  String _constructFullUrl(String ip) {
    ip = ip.trim();
    if (ip.isEmpty) return AppConstants.urlTemplate;

    // Inject IP into template
    return AppConstants.urlTemplate.replaceFirst('{server}', ip);
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isTestingConnection = true;
      _connectionTestMessage = '';
    });

    await _feedback.lightHaptic();

    try {
      // Construct full URL
      final ip = _serverUrlController.text.trim();
      final testUrl = _constructFullUrl(ip);

      final connectivity = ConnectivityService();

      // Save current URL
      final originalUrl = AppConstants.baseUrl;

      // Set test URL temporarily
      await AppConstants.setServerUrl(testUrl);

      // Test connection
      final isConnected = await connectivity.checkConnectivity();

      // Restore original URL
      if (originalUrl != testUrl) {
        // Revert to original text in field (which is IP)
        // But the underlying setting must be restored
        if (AppConstants.isUsingCustomServer) {
          await AppConstants.setServerUrl(originalUrl);
        } else {
          await AppConstants.resetServerUrl();
        }
      }

      setState(() {
        _isTestingConnection = false;
        _connectionTestSuccess = isConnected;
        _connectionTestMessage = isConnected
            ? 'Conexão bem sucedida!'
            : 'Não foi possível conectar a $ip';
      });

      if (isConnected) {
        await _feedback.successFeedback();
      } else {
        await _feedback.errorFeedback();
      }
    } catch (e) {
      setState(() {
        _isTestingConnection = false;
        _connectionTestSuccess = false;
        _connectionTestMessage = 'Erro: $e';
      });
      await _feedback.errorFeedback();
    }
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) return;

    final ip = _serverUrlController.text.trim();
    final fullUrl = _constructFullUrl(ip);

    // If matches default template, just reset
    if (fullUrl == AppConstants.urlTemplate) {
      await AppConstants.resetServerUrl();
    } else {
      await AppConstants.setServerUrl(fullUrl);
    }

    await _feedback.successFeedback();

    if (mounted) {
      UIUtils.showSuccessSnackBar(context, 'Configurações guardadas');
    }
  }

  Future<void> _resetToDefault() async {
    await AppConstants.resetServerUrl();
    _loadSettings(); // Reloads default IP into field
    await _feedback.lightHaptic();

    setState(() {
      _connectionTestMessage = '';
    });

    if (mounted) {
      UIUtils.showInfoSnackBar(context, 'Endereço restaurado para o padrão');
    }
  }

  String? _validateUrl(String? value) {
    if (value == null || value.isEmpty) {
      return 'Endereço IP é obrigatório';
    }
    // Basic IP/Host validation (loose)
    if (value.contains('http') || value.contains('/')) {
      return 'Insira apenas o IP ou Hostname (sem http://)';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF1E293B)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Configurações',
          style: GoogleFonts.outfit(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1E293B),
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Server Configuration Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            LucideIcons.server,
                            color: Color(0xFF10B981),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Servidor',
                          style: GoogleFonts.outfit(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF1E293B),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    Text(
                      'Endereço IP do Servidor',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 8),

                    TextFormField(
                      controller: _serverUrlController,
                      validator: _validateUrl,
                      style: GoogleFonts.robotoMono(fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Ex: 192.168.1.10',
                        hintStyle: GoogleFonts.robotoMono(
                          fontSize: 14,
                          color: const Color(0xFF94A3B8),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF1F5F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF10B981),
                            width: 2,
                          ),
                        ),
                        errorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Colors.red,
                            width: 1,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Connection test result
                    if (_connectionTestMessage.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _connectionTestSuccess
                              ? const Color(0xFF10B981).withOpacity(0.1)
                              : Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _connectionTestSuccess
                                  ? LucideIcons.checkCircle
                                  : LucideIcons.alertCircle,
                              size: 16,
                              color: _connectionTestSuccess
                                  ? const Color(0xFF10B981)
                                  : Colors.red,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _connectionTestMessage,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: _connectionTestSuccess
                                      ? const Color(0xFF10B981)
                                      : Colors.red,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 16),

                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _isTestingConnection
                                ? null
                                : _testConnection,
                            icon: _isTestingConnection
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(LucideIcons.wifi, size: 16),
                            label: Text(
                              _isTestingConnection ? 'A testar...' : 'Testar',
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF10B981),
                              side: const BorderSide(color: Color(0xFF10B981)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _saveSettings,
                            icon: const Icon(LucideIcons.save, size: 16),
                            label: const Text('Guardar'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Reset button
                    Center(
                      child: TextButton.icon(
                        onPressed: _resetToDefault,
                        icon: const Icon(LucideIcons.refreshCw, size: 14),
                        label: const Text('Restaurar padrão'),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // App Info Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            LucideIcons.info,
                            color: Color(0xFF3B82F6),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Informações',
                          style: GoogleFonts.outfit(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF1E293B),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    _buildInfoRow('Versão', AppConstants.appVersion),
                    _buildInfoRow('Build', AppConstants.appBuildNumber),
                    _buildInfoRow(
                      'Servidor',
                      AppConstants.isUsingCustomServer
                          ? 'Personalizado'
                          : 'Padrão',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: const Color(0xFF64748B),
            ),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }
}
