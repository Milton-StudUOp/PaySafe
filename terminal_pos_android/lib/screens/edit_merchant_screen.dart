import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/market_service.dart';
import '../services/market_cache_service.dart';
import '../services/merchant_service.dart';
import '../services/merchant_cache_service.dart';
import '../services/nfc_scan_service.dart';
import '../services/auth_service.dart';
import '../services/offline_merchant_queue_service.dart';
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
  final _marketCache = MarketCacheService();
  final _merchantService = MerchantService();
  final _merchantCache = MerchantCacheService();
  final _authService = AuthService();
  final _offlineQueue = OfflineMerchantQueueService();

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
  // State
  bool _isLoading = true; // Start true to prevent LateInitializationError
  bool _isOffline = false;
  List<Map<String, dynamic>> _markets = [];
  Map<String, dynamic>? _selectedMarket;
  String _merchantType = 'FIXO'; // Default safe value
  String _idType = 'BI'; // Default safe value

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    // LAYER 1: FALLBACK DATA (From Navigation Args)
    // Used as fallback if cache doesn't have this merchant
    Map<String, dynamic> m = widget.merchant;
    debugPrint('🏷️ Layer 1: widget.merchant full_name = ${m['full_name']}');

    // LAYER 2: LOCAL CACHE (Full data + Pending Offline Edits)
    // This is the AUTHORITATIVE source - load from cache FIRST before showing form
    final merchantId = m['id'];
    debugPrint(
      '🔍 EditMerchant Layer 2: merchantId = $merchantId (type: ${merchantId.runtimeType})',
    );

    if (merchantId != null) {
      try {
        // This gets the cached version MERGED with any offline queue updates
        // Support both int and String IDs
        final cached = merchantId is int
            ? await _merchantCache.getMerchantWithPendingUpdates(merchantId)
            : await _getMerchantFromCacheById(merchantId);

        if (cached != null) {
          debugPrint(
            '📥 Layer 2: Loaded from cache - full_name: ${cached['full_name']}',
          );
          m = cached; // Use cache data as the source of truth
        } else {
          debugPrint(
            '⚠️ Layer 2: Merchant not found in cache, using navigation args',
          );
        }
      } catch (e) {
        debugPrint('⚠️ Cache load error: $e');
      }
    }

    // NOW populate controllers with the best available data (cache or fallback)
    _populateControllers(m);

    // Show the form NOW that we have the best data
    if (mounted) setState(() => _isLoading = false);

    // LAYER 3: API (Freshness)
    _isOffline = await _authService.isOfflineMode();
    if (!_isOffline && merchantId is int) {
      try {
        debugPrint('🌍 Fetching from API...');
        final freshData = await _merchantService.getMerchant(merchantId);

        // Update local cache with fresh server data
        await _merchantCache.updateCachedMerchant(merchantId, freshData);

        debugPrint('✅ Loaded fresh data from API');
        m = freshData;
        if (mounted) _populateControllers(m);
      } catch (e) {
        debugPrint('❌ API load failed (using cache/args): $e');
        // No action needed, we already have cache/args displayed
      }
    }

    // Load markets in background
    await _loadMarkets(m['market_id']);
  }

  void _populateControllers(Map<String, dynamic> m) {
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

    // Fix type detection and normalize logic
    String type = m['business_type'] ?? m['merchant_type'] ?? 'FIXO';
    if (type.toUpperCase() == 'AMBULANTE') {
      _merchantType = 'AMBULANTE';
    } else {
      _merchantType = 'FIXO'; // Default fallback
    }

    // Validate ID Type against known values if we had a dropdown (future proofing)
    _idType = m['id_document_type'] ?? 'BI';

    // Trigger rebuild to update UI state
    setState(() {});
  }

  Future<void> _loadMarkets(int? selectedId) async {
    // CACHE-FIRST: Load from cache immediately
    final cached = await _marketCache.getCachedMarkets();
    if (cached.isNotEmpty) {
      if (mounted) {
        setState(() {
          _markets = cached;
          _trySelectMarket(selectedId);
        });
      }
    }

    if (!_isOffline) {
      try {
        final markets = await _marketService.getMarkets();
        if (mounted) {
          setState(() {
            _markets = markets;
            _trySelectMarket(selectedId);
          });
          // Cache for next time
          await _marketCache.cacheMarkets(markets);
        }
      } catch (e) {
        debugPrint("Failed to load markets: $e");
      }
    }
  }

  void _trySelectMarket(int? id) {
    if (id == null) return;
    try {
      final found = _markets.firstWhere((m) => m['id'] == id);
      _selectedMarket = found;
    } catch (_) {
      // Market not found in list
    }
  }

  /// Helper to get merchant from cache by any ID type (int or String)
  Future<Map<String, dynamic>?> _getMerchantFromCacheById(dynamic id) async {
    final all = await _merchantCache.getAllCachedMerchants();
    try {
      return all.firstWhere((m) => m['id'].toString() == id.toString());
    } catch (_) {
      return null;
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
      // Map merchant_type to business_type for consistency
      final businessType = _merchantType == 'AMBULANTE'
          ? 'AMBULANTE'
          : (_businessTypeController.text.trim().isEmpty
                ? 'FIXO'
                : _businessTypeController.text.trim());

      final data = {
        "full_name": _fullNameController.text.trim(),
        "merchant_type": _merchantType,
        "business_type": businessType,
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

      // OFFLINE MODE: Queue update for later sync
      if (_isOffline) {
        final merchantId = widget.merchant['id'];
        final merchantName = widget.merchant['full_name'] ?? 'Comerciante';

        debugPrint(
          '💾 OFFLINE SAVE: merchantId=$merchantId, new_name=${data['full_name']}',
        );

        await _offlineQueue.queueMerchantUpdate(
          merchantId: merchantId, // Can be int or String (temp ID)
          merchantName: merchantName,
          updates: data,
          agentId: 0, // Will be resolved during sync
        );

        // IMMEDIATELY UPDATE CACHE: Changes reflect on next query
        debugPrint('💾 Calling updateCachedMerchant...');
        await _merchantCache.updateCachedMerchant(merchantId, data);
        debugPrint('💾 updateCachedMerchant completed');

        if (mounted) {
          UIUtils.showSuccessDialog(
            context,
            title: "Alteração Salva!",
            message:
                "Alterações salvas offline.\nSerão sincronizadas quando conectar ao servidor.",
            onDismiss: () {
              Navigator.pop(context, true); // Return true to indicate update
            },
          );
        }
        return;
      }

      // ONLINE MODE: Send to API
      await _merchantService.updateMerchant(widget.merchant['id'], data);

      // ALSO update local cache so changes reflect immediately
      await _merchantCache.updateCachedMerchant(widget.merchant['id'], data);

      if (mounted) {
        UIUtils.showSuccessDialog(
          context,
          title: "Sucesso",
          message: "Dados atualizados com sucesso.",
          onDismiss: () {
            Navigator.pop(context, true); // Return true to trigger refresh
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
                initialValue: _selectedMarket,
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
