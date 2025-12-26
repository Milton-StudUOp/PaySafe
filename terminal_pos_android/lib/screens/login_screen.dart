import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/auth_service.dart';
import '../services/device_service.dart';
import '../services/inactivity_service.dart';
import '../utils/ui_utils.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _authService = AuthService();
  final _deviceService = DeviceService();

  final _agentCodeController = TextEditingController();
  final _pinController = TextEditingController();

  bool _isLoading = false;
  String _error = '';
  bool _success = false;
  String _deviceUuid = '';
  bool _showDeviceInfo = false;
  bool _agentCodeLocked = false; // Lock agent code after first login

  // Colors from the design
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate900 = Color(0xFF0F172A);
  static const Color emerald500 = Color(0xFF10B981);
  static const Color emerald600 = Color(0xFF059669);
  static const Color red500 = Color(0xFFEF4444);
  static const Color red50 = Color(0xFFFEF2F2);
  static const Color amber500 = Color(0xFFF59E0B);
  static const Color amber50 = Color(0xFFFFFBEB);

  @override
  void initState() {
    super.initState();
    // Stop inactivity monitoring when on login screen
    InactivityService.stopMonitoring();
    _loadDeviceUuid();
    _checkLastAgent();
  }

  Future<void> _loadDeviceUuid() async {
    final uuid = await _deviceService.getDeviceUuid();
    final isFirstRun = await _deviceService.isFirstRun();
    setState(() {
      _deviceUuid = uuid;
      _showDeviceInfo = isFirstRun; // Show on first run
    });
  }

  Future<void> _checkLastAgent() async {
    final agentCode = await _authService.getLastAgentCode();
    if (agentCode != null && agentCode.isNotEmpty && mounted) {
      setState(() {
        _agentCodeController.text = agentCode;
        _agentCodeLocked = true; // Lock the field - show "Trocar" option
      });
    }
  }

  void _unlockAgentCode() {
    setState(() {
      _agentCodeLocked = false;
      _agentCodeController.clear();
      _pinController.clear();
      _error = '';
    });
  }

  Future<void> _copyDeviceUuid() async {
    await Clipboard.setData(ClipboardData(text: _deviceUuid));
    if (mounted) {
      UIUtils.showSuccessSnackBar(
        context,
        'ID do dispositivo copiado: $_deviceUuid',
      );
    }
  }

  void _dismissDeviceInfo() async {
    await _deviceService.markFirstRunCompleted();
    setState(() {
      _showDeviceInfo = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo or Header
                Text(
                  "PAYSAFE",
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: slate900,
                  ),
                  textAlign: TextAlign.center,
                ).animate().fade().slideY(begin: -0.2, end: 0),

                const SizedBox(height: 8),
                Text(
                  "Terminal de Agente",
                  style: GoogleFonts.inter(fontSize: 14, color: slate500),
                  textAlign: TextAlign.center,
                ).animate().fade().slideY(begin: -0.2, end: 0, delay: 100.ms),

                const SizedBox(height: 24),

                // Device UUID Card - Always Visible but Compact
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _showDeviceInfo ? amber50 : slate50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _showDeviceInfo ? amber500 : slate200,
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(
                            _showDeviceInfo
                                ? LucideIcons.alertTriangle
                                : LucideIcons.smartphone,
                            size: 18,
                            color: _showDeviceInfo ? amber500 : slate500,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _showDeviceInfo
                                  ? "PRIMEIRO USO - Registre este dispositivo"
                                  : "ID do Dispositivo",
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _showDeviceInfo ? amber500 : slate500,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(LucideIcons.copy, size: 18),
                            color: slate500,
                            onPressed: _copyDeviceUuid,
                            tooltip: "Copiar ID",
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: slate200),
                        ),
                        child: SelectableText(
                          _deviceUuid,
                          style: GoogleFonts.robotoMono(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: slate900,
                            letterSpacing: 1,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      if (_showDeviceInfo) ...[
                        const SizedBox(height: 12),
                        Text(
                          "Copie este ID e registre-o no painel web antes de fazer login.",
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: slate500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _dismissDeviceInfo,
                            icon: const Icon(LucideIcons.check, size: 16),
                            label: const Text("Já registrei o dispositivo"),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: emerald600,
                              side: BorderSide(color: emerald600),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ).animate().fade().slideY(begin: 0.1, end: 0, delay: 150.ms),

                const SizedBox(height: 24),

                // Error Message
                if (_error.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: red50,
                      border: Border.all(color: red500.withValues(alpha: 0.3)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          LucideIcons.alertCircle,
                          color: red500,
                          size: 18,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _error,
                            style: GoogleFonts.inter(
                              color: red500,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fade().shake(),

                // Form
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Código de Agente',
                          style: GoogleFonts.inter(
                            color: slate900,
                            fontWeight: FontWeight.w500,
                            fontSize: 14,
                          ),
                        ),
                        if (_agentCodeLocked)
                          TextButton.icon(
                            onPressed: _unlockAgentCode,
                            icon: const Icon(LucideIcons.refreshCw, size: 14),
                            label: const Text('Trocar'),
                            style: TextButton.styleFrom(
                              foregroundColor: slate500,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                              ),
                              textStyle: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Locked agent code display
                    if (_agentCodeLocked)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: slate50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: emerald500.withOpacity(0.3),
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: emerald500.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                LucideIcons.userCheck,
                                color: emerald500,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _agentCodeController.text,
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: slate900,
                                      letterSpacing: 1,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Agente registado neste terminal',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: slate500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              LucideIcons.lock,
                              color: emerald500,
                              size: 18,
                            ),
                          ],
                        ),
                      )
                    else
                      // Unlocked - normal text field
                      TextField(
                        controller: _agentCodeController,
                        enabled: !_isLoading && !_success,
                        textCapitalization: TextCapitalization.characters,
                        decoration: _inputDecoration(hint: 'AG123456'),
                        style: GoogleFonts.inter(color: slate900),
                      ),
                    const SizedBox(height: 16),
                    Text(
                      'PIN (6 dígitos)',
                      style: GoogleFonts.inter(
                        color: slate900,
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _pinController,
                      obscureText: true,
                      enabled: !_isLoading && !_success,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: _inputDecoration(
                        hint: '••••••',
                      ).copyWith(counterText: ""),
                      style: GoogleFonts.inter(color: slate900),
                    ),
                  ],
                ).animate().fade().slideY(begin: 0.1, end: 0, delay: 200.ms),

                const SizedBox(height: 32),

                // Submit Button
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: (_isLoading || _success) ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _success ? emerald500 : emerald600,
                      foregroundColor: Colors.white,
                      elevation: _success ? 0 : 4,
                      shadowColor: emerald500.withValues(alpha: 0.4),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      disabledBackgroundColor: emerald600.withValues(
                        alpha: 0.7,
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : _success
                        ? Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(LucideIcons.checkCircle2, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                "Login realizado!",
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ).animate().fade().scale()
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Entrar",
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(LucideIcons.arrowRight, size: 18),
                            ],
                          ),
                  ),
                ).animate().fade().slideY(begin: 0.2, end: 0, delay: 250.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({required String hint}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: slate500),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: slate200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: emerald500, width: 2),
      ),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
    );
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final agentCode = _agentCodeController.text.trim().toUpperCase();
      final pin = _pinController.text;

      if (agentCode.isEmpty || pin.isEmpty) {
        throw Exception("Preencha todos os campos.");
      }

      if (pin.length != 6) {
        throw Exception("PIN deve ter 6 dígitos.");
      }

      // Use posLogin with device UUID
      final data = await _authService.posLogin(agentCode, pin, _deviceUuid);

      // Role Check Logic: ONLY AGENTE ALLOWED on POS terminal
      final role = data['user']['role'];
      if (role != 'AGENTE' && role != 'FUNCIONARIO' && role != 'AGENT') {
        throw Exception("Acesso restrito a Agentes.");
      }

      // Mark first run as completed if successful
      await _deviceService.markFirstRunCompleted();

      setState(() {
        _success = true;
      });

      // Navigate to Home after delay
      Future.delayed(const Duration(milliseconds: 800), () {
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        }
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _success = false;
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}
