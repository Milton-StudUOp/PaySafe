import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/auth_service.dart';
import '../services/agent_service.dart';

class PinResetScreen extends StatefulWidget {
  const PinResetScreen({super.key});

  @override
  State<PinResetScreen> createState() => _PinResetScreenState();
}

class _PinResetScreenState extends State<PinResetScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPinController = TextEditingController();
  final _newPinController = TextEditingController();
  final _confirmPinController = TextEditingController();

  final _authService = AuthService();
  final _agentService = AgentService();

  bool _isLoading = false;
  String? _errorMessage;
  bool _success = false;

  // User Data
  String? _agentCode;
  int? _agentId;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    if (userDataString != null) {
      final userData = json.decode(userDataString);
      setState(() {
        // Agent data from posLogin has agent_code, not email
        _agentCode = userData['agent_code'];
        _agentId = userData['id'];
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_agentCode == null || _agentId == null) {
      setState(
        () =>
            _errorMessage = "Erro ao identificar agente. Faça login novamente.",
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // 1. Verify Current PIN by attempting a background login
      // This ensures the user really knows the current PIN
      await _authService.login(_agentCode!, _currentPinController.text);

      // 2. Update to New PIN
      await _agentService.updatePin(_agentId!, _newPinController.text);

      setState(() {
        _success = true;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("PIN atualizado com sucesso!"),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        // Go back after short delay
        Future.delayed(const Duration(seconds: 2), () {
          Navigator.of(context).pop();
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage =
            e.toString().contains("Falha") || e.toString().contains("401")
            ? "PIN atual incorreto."
            : e.toString().replaceAll("Exception: ", "");
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Colors
    const slate900 = Color(0xFF0F172A);
    const slate500 = Color(0xFF64748B);
    const emerald500 = Color(0xFF10B981);
    const red500 = Color(0xFFEF4444);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: slate900),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          "Redefinir PIN",
          style: GoogleFonts.inter(
            color: slate900,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: _success
            ? _buildSuccessView()
            : _buildFormView(slate900, slate500, red500, emerald500),
      ),
    );
  }

  Widget _buildSuccessView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 48),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.check,
              size: 48,
              color: Color(0xFF10B981),
            ),
          ).animate().scale(curve: Curves.elasticOut),
          const SizedBox(height: 24),
          Text(
            "PIN Atualizado!",
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF0F172A),
            ),
          ).animate().fade().slideY(delay: 200.ms),
          const SizedBox(height: 8),
          Text(
            "Você já pode usar seu novo PIN.",
            style: GoogleFonts.inter(
              color: const Color(0xFF64748B),
              fontSize: 16,
            ),
          ).animate().fade().slideY(delay: 300.ms),
        ],
      ),
    );
  }

  Widget _buildFormView(
    Color slate900,
    Color slate500,
    Color red500,
    Color emerald500,
  ) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Segurança",
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: slate500,
            ),
          ),
          const SizedBox(height: 24),

          // Error Display
          if (_errorMessage != null)
            Container(
              margin: const EdgeInsets.only(bottom: 24),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                border: Border.all(color: red500.withOpacity(0.2)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(LucideIcons.alertCircle, color: red500, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: GoogleFonts.inter(color: red500, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ).animate().fade().slideX(),

          // Current PIN
          _buildPinField(
            controller: _currentPinController,
            label: "PIN Atual",
            validator: (value) {
              if (value == null || value.length < 6)
                return "Digite seu PIN atual de 6 dígitos";
              return null;
            },
          ),

          const SizedBox(height: 24),
          const Divider(height: 1),
          const SizedBox(height: 24),

          // New PIN
          _buildPinField(
            controller: _newPinController,
            label: "Novo PIN",
            validator: (value) {
              if (value == null || value.length < 6)
                return "O PIN deve ter 6 dígitos";
              if (value == _currentPinController.text)
                return "O novo PIN deve ser diferente do atual";
              return null;
            },
          ),

          const SizedBox(height: 16),

          // Confirm New PIN
          _buildPinField(
            controller: _confirmPinController,
            label: "Confirmar Novo PIN",
            validator: (value) {
              if (value != _newPinController.text)
                return "Os PINs não coincidem";
              return null;
            },
          ),

          const SizedBox(height: 48),

          SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: emerald500,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      "Atualizar PIN",
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPinField({
    required TextEditingController controller,
    required String label,
    required String? Function(String?) validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          enabled: !_isLoading,
          validator: validator,
          style: GoogleFonts.inter(
            fontSize: 18,
            letterSpacing: 4, // Spacing for PIN look
            fontWeight: FontWeight.w600,
          ),
          decoration: InputDecoration(
            counterText: "",
            filled: true,
            fillColor: Colors.white,
            hintText: "••••••",
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF10B981), width: 2),
            ),
            errorStyle: GoogleFonts.inter(color: const Color(0xFFEF4444)),
          ),
        ),
      ],
    );
  }
}
