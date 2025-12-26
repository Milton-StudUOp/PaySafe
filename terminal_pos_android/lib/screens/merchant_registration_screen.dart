import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/market_service.dart';
import '../services/merchant_service.dart';
import '../utils/ui_utils.dart';

class MerchantRegistrationScreen extends StatefulWidget {
  const MerchantRegistrationScreen({super.key});

  @override
  State<MerchantRegistrationScreen> createState() =>
      _MerchantRegistrationScreenState();
}

class _MerchantRegistrationScreenState
    extends State<MerchantRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();

  // Services
  final _marketService = MarketService();
  final _merchantService = MerchantService();

  // Controllers
  final _fullNameController = TextEditingController();
  final _businessNameController = TextEditingController(); // Nome Comercial
  final _businessTypeController = TextEditingController(); // Ramo de atividade

  // KYC (Fixo only)
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nfcController = TextEditingController(); // UID Card
  final _idNumberController = TextEditingController();
  final _idExpiryController = TextEditingController();

  // Mobile Money
  final _mpesaController = TextEditingController();
  final _emolaController = TextEditingController();
  final _mkeshController = TextEditingController();

  // Observation
  final _notesController = TextEditingController();

  // State Variables
  bool _isLoading = false;
  List<Map<String, dynamic>> _markets = [];
  Map<String, dynamic>? _selectedMarket;
  String _merchantType = "FIXO"; // Default
  String _idType = "BI"; // Default
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadMarkets();
  }

  Future<void> _loadMarkets() async {
    try {
      final markets = await _marketService.getApprovedMarkets();
      setState(() {
        _markets = markets;
        if (markets.isEmpty) {
          _errorMessage =
              "Nenhum mercado disponível na sua jurisdição. Contacte o administrador para verificar a sua atribuição.";
        }
      });
    } catch (e) {
      setState(
        () => _errorMessage =
            "Erro ao carregar mercados: ${e.toString().replaceAll('Exception: ', '')}",
      );
    }
  }

  bool _validatePrefix(String number, List<String> prefixes) {
    if (number.isEmpty)
      return true; // Empty is valid (optional) unless required
    for (var p in prefixes) {
      if (number.startsWith(p)) return true;
    }
    return false;
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedMarket == null) {
      UIUtils.showErrorSnackBar(context, "Selecione um mercado");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = {
        "full_name": _fullNameController.text.trim(),
        "merchant_type": _merchantType,
        "business_type": _businessTypeController.text.trim(),
        "business_name": _businessNameController.text.trim(),
        "market_id": _selectedMarket!['id'],
        "requester_notes": _notesController.text.trim(),

        // Mobile Money
        "mpesa_number": _mpesaController.text.trim().isNotEmpty
            ? _mpesaController.text.trim()
            : null,
        "emola_number": _emolaController.text.trim().isNotEmpty
            ? _emolaController.text.trim()
            : null,
        "mkesh_number": _mkeshController.text.trim().isNotEmpty
            ? _mkeshController.text.trim()
            : null,

        // KYC - Only sent if FIXO (backend ignores or treats as null usually, but good to clean)
        "phone_number":
            _merchantType == "FIXO" && _phoneController.text.isNotEmpty
            ? _phoneController.text.trim()
            : null,
        "password":
            _merchantType == "FIXO" && _passwordController.text.isNotEmpty
            ? _passwordController.text.trim()
            : null,
        "nfc_uid": _merchantType == "FIXO" && _nfcController.text.isNotEmpty
            ? _nfcController.text.trim()
            : null,
        "id_document_type": _merchantType == "FIXO" ? _idType : null,
        "id_document_number":
            _merchantType == "FIXO" && _idNumberController.text.isNotEmpty
            ? _idNumberController.text.trim()
            : null,
        // For date, assuming text input YYYY-MM-DD for simpler POS entry or add date picker
        "id_document_expiry":
            _merchantType == "FIXO" && _idExpiryController.text.isNotEmpty
            ? _idExpiryController.text.trim()
            : null,
      };

      await _merchantService.createMerchantFromData(data);

      if (mounted) {
        UIUtils.showSuccessDialog(
          context,
          title: "Sucesso",
          message: "Comerciante cadastrado com sucesso!",
          onDismiss: () {
            Navigator.of(context).pop(); // Close Screen
          },
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll("Exception: ", "");
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime(2101),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF10B981), // Emerald 500
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A), // Slate 900
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF10B981), // Button text color
              ),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      final formatted =
          "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
      setState(() {
        _idExpiryController.text = formatted;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const slate900 = Color(0xFF0F172A);
    const emerald500 = Color(0xFF10B981);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          "Novo Comerciante",
          style: GoogleFonts.inter(
            color: slate900,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: slate900),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _isLoading && _markets.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        color: Colors.red.shade50,
                        child: Text(
                          _errorMessage!,
                          style: GoogleFonts.inter(color: Colors.red),
                        ),
                      ),

                    _buildSectionHeader("Dados Gerais"),
                    _buildTextField(
                      "Nome Completo *",
                      _fullNameController,
                      icon: LucideIcons.user,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      "Ramo de Atividade *",
                      _businessTypeController,
                      icon: LucideIcons.shoppingBag,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      "Nome Comercial",
                      _businessNameController,
                      icon: LucideIcons.store,
                      required: false,
                    ),

                    const SizedBox(height: 16),
                    // Market Dropdown
                    DropdownButtonFormField<Map<String, dynamic>>(
                      value: _selectedMarket,
                      isExpanded: true,
                      decoration: _inputDecoration("Mercado / Local *"),
                      hint: const Text("Selecione o Mercado"),
                      items: _markets
                          .map(
                            (m) => DropdownMenuItem(
                              value: m,
                              child: Text("${m['name']} (${m['province']})"),
                            ),
                          )
                          .toList(),
                      onChanged: (v) => setState(() => _selectedMarket = v),
                      validator: (v) =>
                          v == null ? "Selecione o mercado" : null,
                    ),

                    const SizedBox(height: 24),
                    Text(
                      "Tipo de Comerciante *",
                      style: GoogleFonts.inter(fontWeight: FontWeight.w500),
                    ),
                    Row(
                      children: [
                        Expanded(
                          child: RadioListTile(
                            title: const Text("Fixo"),
                            value: "FIXO",
                            groupValue: _merchantType,
                            onChanged: (v) =>
                                setState(() => _merchantType = v.toString()),
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                        Expanded(
                          child: RadioListTile(
                            title: const Text("Ambulante"),
                            value: "AMBULANTE",
                            groupValue: _merchantType,
                            onChanged: (v) =>
                                setState(() => _merchantType = v.toString()),
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ],
                    ),

                    // KYC Fields (Conditionally Visible)
                    if (_merchantType == "FIXO") ...[
                      const SizedBox(height: 24),
                      _buildSectionHeader("Dados KYC (Fixo)"),

                      _buildTextField(
                        "Telefone *",
                        _phoneController,
                        icon: LucideIcons.phone,
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        "Senha de Acesso *",
                        _passwordController,
                        icon: LucideIcons.lock,
                        obscureText: true,
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        "NFC UID *",
                        _nfcController,
                        icon: LucideIcons.creditCard,
                      ),
                      const SizedBox(height: 16),

                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 1,
                            child: DropdownButtonFormField<String>(
                              value: _idType,
                              decoration: _inputDecoration("Tipo"),
                              items: ["BI", "PASSAPORTE", "DIRE", "OUTRO"]
                                  .map(
                                    (e) => DropdownMenuItem(
                                      value: e,
                                      child: Text(e),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (v) => setState(() => _idType = v!),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            flex: 2,
                            child: _buildTextField(
                              "Número do Doc *",
                              _idNumberController,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Helper for date - simple text field for now, ideally DatePicker
                      _buildTextField(
                        "Validade (AAAA-MM-DD) *",
                        _idExpiryController,
                        icon: LucideIcons.calendar,
                        readOnly: true,
                        onTap: () => _selectDate(context),
                      ),
                    ],

                    const SizedBox(height: 32),
                    _buildSectionHeader("Pagamentos Móveis"),

                    _buildTextField(
                      "M-Pesa (84/85...)",
                      _mpesaController,
                      required: false,
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v != null &&
                            v.isNotEmpty &&
                            !_validatePrefix(v, ['84', '85']))
                          return "Deve começar com 84 ou 85";
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      "e-Mola (86/87...)",
                      _emolaController,
                      required: false,
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v != null &&
                            v.isNotEmpty &&
                            !_validatePrefix(v, ['86', '87']))
                          return "Deve começar com 86 ou 87";
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      "mKesh (82/83...)",
                      _mkeshController,
                      required: false,
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v != null &&
                            v.isNotEmpty &&
                            !_validatePrefix(v, ['82', '83']))
                          return "Deve começar com 82 ou 83";
                        return null;
                      },
                    ),

                    const SizedBox(height: 32),
                    _buildSectionHeader("Observação"),

                    TextFormField(
                      controller: _notesController,
                      maxLines: 3,
                      validator: (v) => v == null || v.isEmpty
                          ? "Justificativa obrigatória"
                          : null,
                      decoration: _inputDecoration(
                        "Justificativa da Criação *",
                      ),
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
                        ),
                        child: _isLoading
                            ? const CircularProgressIndicator(
                                color: Colors.white,
                              )
                            : const Text(
                                "CADASTRAR COMERCIANTE",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title.toUpperCase(),
        style: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: const Color(0xFF94A3B8),
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller, {
    IconData? icon,
    bool required = true,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    bool readOnly = false,
    VoidCallback? onTap,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      readOnly: readOnly,
      onTap: onTap,
      validator:
          validator ??
          (required
              ? (v) => v == null || v.isEmpty ? "Campo obrigatório" : null
              : null),
      decoration: _inputDecoration(label, icon: icon),
    );
  }

  InputDecoration _inputDecoration(String label, {IconData? icon}) {
    return InputDecoration(
      labelText: label,
      prefixIcon: icon != null
          ? Icon(icon, size: 20, color: const Color(0xFF64748B))
          : null,
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }
}
