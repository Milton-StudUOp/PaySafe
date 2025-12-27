import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/market_service.dart';
import '../services/market_cache_service.dart';
import '../services/merchant_service.dart';
import '../services/merchant_cache_service.dart';
import '../services/nfc_scan_service.dart';
import '../services/auth_service.dart';
import '../services/offline_merchant_queue_service.dart';
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
  final _marketCache = MarketCacheService();
  final _merchantService = MerchantService();
  final _merchantCache = MerchantCacheService();
  final _authService = AuthService();
  final _offlineQueue = OfflineMerchantQueueService();

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
  bool _isOffline = false;
  List<Map<String, dynamic>> _markets = [];
  Map<String, dynamic>? _selectedMarket;
  String _merchantType = "FIXO"; // Default
  String _idType = "BI"; // Default

  @override
  void initState() {
    super.initState();
    _checkOfflineMode();
    _loadMarkets();
  }

  Future<void> _checkOfflineMode() async {
    final isOffline = await _authService.isOfflineMode();
    if (mounted) {
      setState(() => _isOffline = isOffline);
    }
  }

  Future<void> _loadMarkets() async {
    // CACHE-FIRST: Always try to load from cache first for instant display
    final cachedMarkets = await _marketCache.getCachedMarkets();
    if (cachedMarkets.isNotEmpty) {
      setState(() {
        _markets = cachedMarkets;
      });
    }

    // If offline mode, don't try API
    if (_isOffline) return;

    // Try to refresh from API silently (no error shown if cache exists)
    try {
      final markets = await _marketService.getApprovedMarkets();
      if (mounted && markets.isNotEmpty) {
        setState(() {
          _markets = markets;
        });
        // Update cache for next time
        await _marketCache.cacheMarkets(markets);
      } else if (markets.isEmpty && _markets.isEmpty && mounted) {
        // Only show error if both API returned empty AND cache is empty
        UIUtils.showErrorSnackBar(
          context,
          "Nenhum mercado disponível na sua jurisdição. Contacte o administrador.",
        );
      }
    } catch (e) {
      // API failed - if we have cached markets, continue silently (no error)
      if (_markets.isEmpty && mounted) {
        // Only show error if we have NO cached data at all
        UIUtils.showErrorSnackBar(
          context,
          "Sem conexão. Conecte-se para carregar mercados.",
        );
      }
      // Mark as offline if API fails
      if (mounted) {
        setState(() => _isOffline = true);
      }
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
    });

    try {
      // Get agent data for offline queue
      final userData = await _authService.getUserData();

      // DUPLICATE CHECK: Only NFC - other fields can repeat for multiple shops
      final duplicateError = await _merchantCache.checkDuplicates(
        nfcUid: _nfcController.text.trim(),
      );

      if (duplicateError != null) {
        if (mounted) {
          UIUtils.showErrorSnackBar(context, duplicateError);
        }
        return;
      }

      // OFFLINE MODE: Queue registration locally
      if (_isOffline) {
        final tempId = await _offlineQueue.queueMerchantRegistration(
          fullName: _fullNameController.text.trim(),
          phoneNumber: _phoneController.text.trim(),
          marketId: _selectedMarket!['id'],
          nfcUid: _nfcController.text.trim().isNotEmpty
              ? _nfcController.text.trim()
              : null,
          mpesaNumber: _mpesaController.text.trim().isNotEmpty
              ? _mpesaController.text.trim()
              : null,
          emolaNumber: _emolaController.text.trim().isNotEmpty
              ? _emolaController.text.trim()
              : null,
          mkeshNumber: _mkeshController.text.trim().isNotEmpty
              ? _mkeshController.text.trim()
              : null,
          agentId: userData?['id'] ?? 0,
          agentName: userData?['name'] ?? 'Agente',
        );

        // ADD TO CACHE IMMEDIATELY: Make merchant available for search and payments
        await _merchantCache.addOfflineMerchant({
          'id': tempId, // Temporary ID
          'full_name': _fullNameController.text.trim(),
          'phone_number': _phoneController.text.trim(),
          'market_id': _selectedMarket!['id'],
          'nfc_uid': _nfcController.text.trim().isNotEmpty
              ? _nfcController.text.trim()
              : null,
          'mpesa_number': _mpesaController.text.trim().isNotEmpty
              ? _mpesaController.text.trim()
              : null,
          'emola_number': _emolaController.text.trim().isNotEmpty
              ? _emolaController.text.trim()
              : null,
          'mkesh_number': _mkeshController.text.trim().isNotEmpty
              ? _mkeshController.text.trim()
              : null,
          'is_offline_pending': true, // Flag for UI indication
        });

        if (mounted) {
          UIUtils.showSuccessDialog(
            context,
            title: "Comerciante Registrado!",
            message:
                "Registro salvo offline.\nSerá sincronizado quando conectar ao servidor.",
            onDismiss: () {
              Navigator.of(context).pop();
            },
          );
        }
        return;
      }

      // ONLINE MODE: Send to API directly
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

        // KYC - Only sent if FIXO
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
            Navigator.of(context).pop();
          },
        );
      }
    } catch (e) {
      if (mounted) {
        UIUtils.showErrorSnackBar(
          context,
          e.toString().replaceAll("Exception: ", ""),
        );
      }
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
                    DropdownButtonFormField<int>(
                      value: _selectedMarket?['id'],
                      isExpanded: true,
                      decoration: _inputDecoration("Mercado / Local *"),
                      hint: const Text("Selecione o Mercado"),
                      items: _markets
                          .map(
                            (m) => DropdownMenuItem<int>(
                              value: m['id'],
                              child: Text(
                                m['province'] != null
                                    ? "${m['name']} (${m['province']})"
                                    : m['name'] ?? 'Mercado',
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (id) {
                        if (id != null) {
                          final market = _markets.firstWhere(
                            (m) => m['id'] == id,
                            orElse: () => {'id': id, 'name': 'Mercado'},
                          );
                          setState(() => _selectedMarket = market);
                        }
                      },
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
                      // NFC UID Field with Scan Button
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: _buildTextField(
                              "NFC UID *",
                              _nfcController,
                              icon: LucideIcons.creditCard,
                            ),
                          ),
                          const SizedBox(width: 12),
                          SizedBox(
                            height: 56,
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final uid = await NfcScanService.scanNfcUid(
                                  context,
                                );
                                if (uid != null) {
                                  setState(() {
                                    _nfcController.text = uid;
                                  });
                                }
                              },
                              icon: const Icon(LucideIcons.nfc, size: 20),
                              label: const Text("Ler"),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF10B981),
                                side: const BorderSide(
                                  color: Color(0xFF10B981),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                ),
                              ),
                            ),
                          ),
                        ],
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
