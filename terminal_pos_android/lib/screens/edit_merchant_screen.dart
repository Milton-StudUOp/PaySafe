import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/market_service.dart';
import '../services/merchant_service.dart';

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
  String? _errorMessage;

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
        if (markets.isEmpty) {
          _errorMessage = "Nenhum mercado disponível na sua jurisdição.";
        }
      });
    } catch (e) {
      setState(
        () => _errorMessage =
            "Erro ao carregar locais: ${e.toString().replaceAll('Exception: ', '')}",
      );
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    // Notes are mandatory for edits
    if (_notesController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("A observação é obrigatória para auditar a mudança."),
        ),
      );
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
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text("Sucesso"),
            content: const Text("Dados atualizados (ou solicitação enviada)."),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context); // Dialog
                  Navigator.pop(context); // Screen
                  // Ideally refresh search screen, but it will refresh on next search
                },
                child: const Text("OK"),
              ),
            ],
          ),
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
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),

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
                _buildTextField("NFC UID", _nfcController),
                const SizedBox(height: 16),
                _buildTextField("Documento ID", _idNumberController),
                const SizedBox(height: 16),
                _buildTextField(
                  "Validade ID (AAAA-MM-DD)",
                  _idExpiryController,
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
  }) {
    return TextFormField(
      controller: controller,
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
