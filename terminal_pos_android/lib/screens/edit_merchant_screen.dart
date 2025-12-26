import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/market_service.dart';
import '../services/merchant_service.dart';
import '../services/nfc_scan_service.dart';
import '../utils/ui_utils.dart';

class EditMerchantScreen extends StatefulWidget {
  final Map<String, dynamic> merchant;
  const EditMerchantScreen({super.key, required this.merchant});

  @override
  State<EditMerchantScreen> createState() => _EditMerchantScreenState();
}

class _EditMerchantScreenState extends State<EditMerchantScreen> {
  final _formKey = GlobalKey<FormState>();

  // Services
  final _marketService = MarketService();
  final _merchantService = MerchantService();

  // Controllers
  final _fullNameController = TextEditingController();
  final _businessNameController = TextEditingController();
  final _businessTypeController = TextEditingController();
  final _phoneController = TextEditingController();
  final _nfcController = TextEditingController();
  final _idNumberController = TextEditingController();
  final _idExpiryController = TextEditingController();
  final _mpesaController = TextEditingController();
  final _emolaController = TextEditingController();
  final _mkeshController = TextEditingController();
  final _notesController = TextEditingController();

  // State
  bool _isLoading = false;
  List<Map<String, dynamic>> _markets = [];
  Map<String, dynamic>? _selectedMarket;
  late String _merchantType;
  late String _idType;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    // Populate controllers from widget.merchant
    final m = widget.merchant;
    _fullNameController.text = m['full_name'] ?? '';
    _businessNameController.text = m['business_name'] ?? '';
    _businessTypeController.text = m['business_type'] ?? '';
    _phoneController.text = m['phone_number'] ?? '';
    _nfcController.text = m['nfc_uid'] ?? '';
    _idNumberController.text = m['id_document_number'] ?? '';
    _idExpiryController.text = m['id_document_expiry'] ?? '';

    _mpesaController.text = m['mpesa_number'] ?? '';
    _emolaController.text = m['emola_number'] ?? '';
    _mkeshController.text = m['mkesh_number'] ?? '';

    _merchantType = m['merchant_type'] ?? 'FIXO';
    _idType = m['id_document_type'] ?? 'BI';

    await _loadMarkets();

    // Set selected market after markets load
    if (m['market_id'] != null) {
      try {
        final found = _markets.firstWhere(
          (element) => element['id'] == m['market_id'],
        );
        setState(() {
          _selectedMarket = found;
        });
      } catch (e) {
        // Market might not be in list or ID changed
      }
    }
  }

  Future<void> _loadMarkets() async {
    try {
      final markets = await _marketService.getApprovedMarkets();
      setState(() {
        _markets = markets;
        if (markets.isEmpty && mounted) {
          UIUtils.showErrorSnackBar(
            context,
            "Nenhum mercado disponível na sua jurisdição.",
          );
        }
      });
    } catch (e) {
      if (mounted) {
        UIUtils.showErrorSnackBar(
          context,
          "Erro ao carregar locais: ${e.toString().replaceAll('Exception: ', '')}",
        );
      }
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    // Notes are mandatory for edits
    if (_notesController.text.trim().isEmpty) {
      UIUtils.showErrorSnackBar(
        context,
        "A observação é obrigatória para auditar a mudança.",
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final data = {
        "full_name": _fullNameController.text.trim(),
        "merchant_type": _merchantType,
        "business_type": _businessTypeController.text.trim(),
        "business_name": _businessNameController.text.trim(),
        "market_id": _selectedMarket?['id'],
        "requester_notes": _notesController.text.trim(),

        "mpesa_number": _mpesaController.text.trim().isEmpty
            ? null
            : _mpesaController.text.trim(),
        "emola_number": _emolaController.text.trim().isEmpty
            ? null
            : _emolaController.text.trim(),
        "mkesh_number": _mkeshController.text.trim().isEmpty
            ? null
            : _mkeshController.text.trim(),

        // KYC
        "phone_number": _phoneController.text.trim().isEmpty
            ? null
            : _phoneController.text.trim(),
        "nfc_uid": _nfcController.text.trim().isEmpty
            ? null
            : _nfcController.text.trim(),
        "id_document_type": _idType,
        "id_document_number": _idNumberController.text.trim().isEmpty
            ? null
            : _idNumberController.text.trim(),
        "id_document_expiry": _idExpiryController.text.trim().isEmpty
            ? null
            : _idExpiryController.text.trim(),
      };

      await _merchantService.updateMerchant(widget.merchant['id'], data);

      if (mounted) {
        UIUtils.showSuccessDialog(
          context,
          title: "Sucesso",
          message: "Dados atualizados (ou solicitação enviada).",
          onDismiss: () {
            Navigator.pop(context); // Screen
            // Ideally refresh search screen, but it will refresh on next search
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
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Editar Comerciante",
          style: TextStyle(color: Colors.black),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildTextField("Nome Completo", _fullNameController),
              const SizedBox(height: 16),

              // Market
              DropdownButtonFormField<Map<String, dynamic>>(
                value: _selectedMarket,
                isExpanded: true,
                decoration: _inputDecoration("Mercado"),
                items: _markets
                    .map(
                      (m) => DropdownMenuItem(
                        value: m,
                        child: Text(m['name'] ?? ''),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _selectedMarket = v),
              ),
              const SizedBox(height: 16),

              // Type
              Row(
                children: [
                  Expanded(
                    child: RadioListTile(
                      title: const Text("Fixo"),
                      value: "FIXO",
                      groupValue: _merchantType,
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (v) =>
                          setState(() => _merchantType = v.toString()),
                    ),
                  ),
                  Expanded(
                    child: RadioListTile(
                      title: const Text("Ambulante"),
                      value: "AMBULANTE",
                      groupValue: _merchantType,
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (v) =>
                          setState(() => _merchantType = v.toString()),
                    ),
                  ),
                ],
              ),

              if (_merchantType == 'FIXO') ...[
                const SizedBox(height: 16),
                _buildTextField("Telefone", _phoneController),
                const SizedBox(height: 16),
                // NFC UID Field with Scan Button
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _buildTextField("NFC UID", _nfcController)),
                    const SizedBox(width: 12),
                    SizedBox(
                      height: 56,
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final uid = await NfcScanService.scanNfcUid(context);
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
                          side: const BorderSide(color: Color(0xFF10B981)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildTextField("Documento ID", _idNumberController),
                const SizedBox(height: 16),
                _buildTextField(
                  "Validade ID (AAAA-MM-DD)",
                  _idExpiryController,
                  readOnly: true,
                  onTap: () => _selectDate(context),
                ),
              ],

              const SizedBox(height: 24),
              const Text(
                "Pagamentos Móveis",
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              _buildTextField("M-Pesa", _mpesaController, required: false),
              const SizedBox(height: 8),
              _buildTextField("e-Mola", _emolaController, required: false),
              const SizedBox(height: 8),
              _buildTextField("mKesh", _mkeshController, required: false),

              const SizedBox(height: 32),
              const Text(
                "Justificativa (Obrigatório)",
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.red,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _notesController,
                maxLines: 3,
                decoration: _inputDecoration("Motivo da alteração"),
              ),

              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 50),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text("SALVAR ALTERAÇÕES"),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller, {
    bool required = true,
    bool readOnly = false,
    VoidCallback? onTap,
  }) {
    return TextFormField(
      controller: controller,
      readOnly: readOnly,
      onTap: onTap,
      validator: required
          ? (v) => v == null || v.isEmpty ? "Campo obrigatório" : null
          : null,
      decoration: _inputDecoration(label),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: Colors.grey.shade50,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
    );
  }
}
