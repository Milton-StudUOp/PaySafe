import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'receipt_screen.dart';
import '../services/transaction_service.dart';
import '../services/merchant_service.dart';
import '../services/market_service.dart';
import '../services/market_cache_service.dart';
import '../services/merchant_cache_service.dart';
import '../services/auth_service.dart';
import '../services/offline_payment_queue_service.dart';
import '../services/offline_merchant_queue_service.dart';
import '../services/transaction_cache_service.dart'; // Added for caching online payments
import '../services/connectivity_service.dart';
import '../utils/ui_utils.dart';
import 'dart:async'; // For StreamSubscription

class PaymentScreen extends StatefulWidget {
  final Map<String, dynamic>? preSelectedMerchant;
  const PaymentScreen({super.key, this.preSelectedMerchant});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _transactionService = TransactionService();
  final _transactionCache = TransactionCacheService(); // Added
  final _authService = AuthService();
  final _offlineQueue = OfflinePaymentQueueService();
  final _connectivityService = ConnectivityService(); // Added

  // Controllers
  final _merchantIdController = TextEditingController();
  final _amountController = TextEditingController();
  final _customerNumberController = TextEditingController();

  // State
  String _currentStep = 'MERCHANT';
  Map<String, dynamic>? _selectedMerchant;
  bool _isLoading = false;
  bool _isOffline = false;
  String? _errorMessage;
  String _selectedMethod = "DINHEIRO";

  // Network monitoring
  StreamSubscription<bool>? _connectivitySubscription;

  @override
  void initState() {
    super.initState();
    _checkOfflineMode();

    // Listen to real-time connectivity changes
    _connectivitySubscription = _connectivityService.connectionStream.listen((
      isConnected,
    ) {
      if (mounted) {
        setState(() {
          _isOffline = !isConnected;
          // Force cash only in offline mode
          if (_isOffline) {
            _selectedMethod = 'DINHEIRO';
          }
        });
      }
    });

    if (widget.preSelectedMerchant != null) {
      _selectedMerchant = widget.preSelectedMerchant;
      _currentStep = 'AMOUNT';
      // No NFC needed if pre-selected
    } else {
      _startNfcSession();
    }
  }

  Future<void> _checkOfflineMode() async {
    // Check initial mode from auth
    final isOfflineLogin = await _authService.isOfflineMode();
    // Also check current network state
    final isConnected = await _connectivityService.checkConnectivity();

    if (mounted) {
      setState(() {
        _isOffline = isOfflineLogin || !isConnected;
        // Force cash only in offline mode
        if (_isOffline) {
          _selectedMethod = 'DINHEIRO';
        }
      });
    }
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel(); // Cleanup network listener
    NfcManager.instance.stopSession();
    super.dispose();
  }

  void _startNfcSession() async {
    bool isAvailable = await NfcManager.instance.isAvailable();
    if (!isAvailable) {
      // Optional: Notify user NFC is not available
      return;
    }

    NfcManager.instance.startSession(
      onDiscovered: (NfcTag tag) async {
        try {
          final data = tag.data;
          String? uid;

          // Extract UID based on platform/tech (Mifare, NTAG, etc often in 'nfca', 'mifare', 'isodep')
          // Helper to convert bytes to hex string
          String toHex(List<int> bytes) {
            return bytes
                .map((e) => e.toRadixString(16).padLeft(2, '0'))
                .join()
                .toUpperCase();
          }

          if (data.containsKey('nfca')) {
            uid = toHex(data['nfca']['identifier']);
          } else if (data.containsKey('mifare')) {
            uid = toHex(data['mifare']['identifier']);
          } else if (data.containsKey('isodep')) {
            uid = toHex(data['isodep']['identifier']);
          }

          if (uid != null) {
            // Update UI on Main Thread
            // Stop session momentarily or keep specific to use case
            // Often good to stop after read for simple "Tap to Identify"
            // await NfcManager.instance.stopSession();

            if (mounted) {
              setState(() {
                _merchantIdController.text = uid!;
                _isLoading = true;
              });
              await _findMerchant(); // Auto-trigger search
            }
          }
        } catch (e) {
          debugPrint('Error reading NFC: $e');
        }
      },
    );
  }

  Future<void> _findMerchant() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final input = _merchantIdController.text.trim();
    if (input.isEmpty) {
      setState(() {
        _isLoading = false;
        _errorMessage = "Aproxime o Cartão NFC";
      });
      return;
    }

    try {
      final merchantService = MerchantService();
      final marketService = MarketService();
      final merchantCache = MerchantCacheService();

      Map<String, dynamic>? merchant;

      // Try cache first for faster lookup and offline support
      merchant = await merchantCache.getMerchantByNfc(input);

      // If not in cache, try API
      if (merchant == null) {
        try {
          merchant = await merchantService.getMerchantByNfc(input);
        } catch (e) {
          // API failed, cache might be available
          debugPrint('API lookup failed: $e');
        }
      }

      if (merchant == null) {
        throw Exception('Comerciante não encontrado');
      }

      // ============ STATUS VALIDATION ============
      // Block payments to suspended or blocked merchants
      final rawStatus = merchant['status'];
      final merchantStatus = rawStatus?.toString().toUpperCase() ?? 'ATIVO';

      debugPrint('🔍 MERCHANT STATUS CHECK:');
      debugPrint('   - Merchant: ${merchant['full_name']}');
      debugPrint('   - Raw status value: $rawStatus');
      debugPrint('   - Normalized status: $merchantStatus');

      if (merchantStatus == 'SUSPENSO') {
        debugPrint('   ❌ BLOCKED: Merchant is SUSPENSO');
        setState(() {
          _errorMessage =
              "⚠️ Comerciante SUSPENSO\nNão pode receber pagamentos.";
          _isLoading = false;
        });
        return;
      }

      if (merchantStatus == 'BLOQUEADO') {
        debugPrint('   ❌ BLOCKED: Merchant is BLOQUEADO');
        setState(() {
          _errorMessage =
              "🚫 Comerciante BLOQUEADO\nNão pode receber pagamentos.";
          _isLoading = false;
        });
        return;
      }

      debugPrint('   ✅ ALLOWED: Merchant status is OK ($merchantStatus)');
      // ============================================

      // Fetch market to enrich merchant data (skip if market info already cached)
      final marketId = merchant['market_id'];
      if (marketId != null && merchant['market_name'] == null) {
        try {
          final market = await marketService.getMarketById(marketId);
          if (market != null) {
            merchant['market_name'] = market['name'];
            merchant['market_province'] = market['province'];
            merchant['market_district'] = market['district'];
          }
        } catch (e) {
          // Market fetch failed, continue without enrichment
          debugPrint('Market lookup failed: $e');
        }
      }

      setState(() {
        _selectedMerchant = merchant;
        _currentStep = 'AMOUNT';
        _isLoading = false;
      });

      // Stop session if we moved past Merchant step to save battery/conflict
      // NfcManager.instance.stopSession();
    } catch (e) {
      setState(() {
        _errorMessage = "Cartão não identificado";
        _isLoading = false;
      });
    }
  }

  void _onKeypadTap(String value) {
    setState(() {
      if (value == 'C') {
        _amountController.text = '';
      } else if (value == 'BACK') {
        if (_amountController.text.isNotEmpty) {
          _amountController.text = _amountController.text.substring(
            0,
            _amountController.text.length - 1,
          );
        }
      } else {
        if (_amountController.text.length < 8) {
          _amountController.text += value;
        }
      }
    });
  }

  void _goToMethodSelection() {
    if (_amountController.text.isEmpty ||
        double.tryParse(_amountController.text) == 0)
      return;
    setState(() => _currentStep = 'METHOD');
  }

  bool _validateCustomerNumber() {
    final number = _customerNumberController.text.trim();
    if (_selectedMethod == 'MPESA') {
      return RegExp(r'^8[45]').hasMatch(number) && number.length == 9;
    } else if (_selectedMethod == 'EMOLA') {
      return RegExp(r'^8[67]').hasMatch(number) && number.length == 9;
    } else if (_selectedMethod == 'MKESH') {
      return RegExp(r'^8[23]').hasMatch(number) && number.length == 9;
    }
    return true; // Dinheiro
  }

  /// Format phone number - strips leading 0 if present, keeps 9 digits
  String _formatMsisdn(String phone) {
    phone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (phone.startsWith('258')) {
      phone = phone.substring(3);
    }
    if (phone.startsWith('0')) {
      phone = phone.substring(1);
    }
    return phone;
  }

  Future<void> _processPayment() async {
    // ═══════════════════════════════════════════════════════════════════
    // THIS IS THE LATEST CODE - IF YOU DON'T SEE THIS LOG, REBUILD APP!
    // ═══════════════════════════════════════════════════════════════════
    debugPrint('');
    debugPrint(
      '╔════════════════════════════════════════════════════════════╗',
    );
    debugPrint(
      '║  🚀 _processPayment STARTED (LATEST CODE v2)               ║',
    );
    debugPrint(
      '╚════════════════════════════════════════════════════════════╝',
    );

    // ============ FINAL SAFETY CHECK: MERCHANT STATUS ============
    // Block payments to suspended/blocked merchants regardless of flow path
    final merchantStatus =
        _selectedMerchant?['status']?.toString().toUpperCase() ?? 'ATIVO';
    debugPrint('🛡️ MERCHANT STATUS CHECK:');
    debugPrint('   - Merchant: ${_selectedMerchant?['full_name']}');
    debugPrint('   - Status from data: ${_selectedMerchant?['status']}');
    debugPrint('   - Normalized: $merchantStatus');

    if (merchantStatus == 'SUSPENSO') {
      debugPrint('   ❌ BLOCKING: Merchant is SUSPENSO!');
      UIUtils.showErrorSnackBar(
        context,
        "⚠️ Comerciante SUSPENSO - Não pode receber pagamentos!",
      );
      return;
    }

    if (merchantStatus == 'BLOQUEADO') {
      debugPrint('   ❌ BLOCKING: Merchant is BLOQUEADO!');
      UIUtils.showErrorSnackBar(
        context,
        "🚫 Comerciante BLOQUEADO - Não pode receber pagamentos!",
      );
      return;
    }

    debugPrint('   ✅ Status OK - proceeding with payment');
    // =============================================================

    if (_selectedMethod != 'DINHEIRO' && !_validateCustomerNumber()) {
      String helpText = "";
      if (_selectedMethod == 'MPESA') {
        helpText = "O número deve começar com 84 ou 85 e ter 9 dígitos.";
      } else if (_selectedMethod == 'EMOLA') {
        helpText = "O número deve começar com 86 ou 87 e ter 9 dígitos.";
      } else if (_selectedMethod == 'MKESH') {
        helpText = "O número deve começar com 82 ou 83 e ter 9 dígitos.";
      }
      UIUtils.showErrorSnackBar(
        context,
        "Número inválido para $_selectedMethod. $helpText",
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final amount = double.tryParse(_amountController.text) ?? 0.0;

      // Handle merchant ID - can be int or String (for offline-registered merchants)
      final rawMerchantId = _selectedMerchant?['id'];
      final merchantId = rawMerchantId is int
          ? rawMerchantId
          : (rawMerchantId is String && !rawMerchantId.startsWith('OFFLINE'))
          ? int.tryParse(rawMerchantId) ?? 0
          : 0; // Offline merchant with temp ID

      // Get logged-in agent and device data
      final prefs = await SharedPreferences.getInstance();
      final userDataString = prefs.getString('user_data');
      final deviceDataString = prefs.getString('device_data');

      Map<String, dynamic>? agentData;
      Map<String, dynamic>? deviceData;

      if (userDataString != null) {
        agentData = json.decode(userDataString);
      }
      if (deviceDataString != null) {
        deviceData = json.decode(deviceDataString);
      }

      // OFFLINE MODE: Queue cash payment locally
      if (_isOffline && _selectedMethod == 'DINHEIRO') {
        // Check if merchant is an offline-registered one (has temp ID)
        final rawMerchantId = _selectedMerchant?['id'];
        final merchantTempId =
            (rawMerchantId is String && rawMerchantId.startsWith('OFFLINE'))
            ? rawMerchantId
            : null;

        final tempId = await _offlineQueue.queueCashPayment(
          merchantId: merchantId,
          merchantName: _selectedMerchant?['full_name'] ?? 'Comerciante',
          amount: amount,
          agentId: agentData?['id'] ?? 0,
          agentName: agentData?['name'] ?? 'Agente',
          posId: deviceData?['id'],
          merchantTempId: merchantTempId, // For sync ID resolution
        );

        // Generate offline receipt
        final receiptData = _offlineQueue.generateOfflineReceipt(
          tempId: tempId,
          merchantName: _selectedMerchant?['full_name'] ?? 'Comerciante',
          amount: amount,
          agentName: agentData?['name'] ?? 'Agente',
        );
        receiptData['merchant'] = _selectedMerchant;
        receiptData['agent'] = agentData;

        if (mounted) {
          setState(() => _isLoading = false);

          // Show offline success dialog
          UIUtils.showSuccessDialog(
            context,
            title: "Pagamento Registrado!",
            message:
                "Pagamento em dinheiro registrado offline.\nSerá sincronizado quando conectar ao servidor.",
            onDismiss: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => ReceiptScreen(transactionData: receiptData),
                ),
              );
            },
          );
        }
        return;
      }

      // ONLINE MODE: Process normally via API
      final txData = {
        "merchant_id": merchantId,
        "pos_id": deviceData?['id'],
        "amount": amount,
        "payment_method": _selectedMethod,
        "mpesa_number": _selectedMethod == 'DINHEIRO'
            ? "820000000" // Placeholder for cash - backend handles this
            : _formatMsisdn(_customerNumberController.text.trim()),
        "observation": "Pagamento POS - $_selectedMethod",
        "nfc_uid": _merchantIdController.text.trim(),
      };

      final response = await _transactionService.createTransaction(txData);

      // Enrich receipt with all necessary data
      final receiptData = Map<String, dynamic>.from(response);
      receiptData['merchant_name'] = _selectedMerchant?['full_name'];
      receiptData['merchant'] = _selectedMerchant; // Full merchant object
      receiptData['agent'] = agentData; // Logged-in agent

      if (mounted) {
        setState(() => _isLoading = false);

        // Check backend status field to determine success/failure
        final txStatus = response['status']?.toString().toUpperCase() ?? '';
        final isSuccess = txStatus == 'SUCESSO';

        if (isSuccess) {
          // Success: Cache transaction immediately for offline history consistency
          await _transactionCache.addTransaction(receiptData);

          // Success: Show dialog THEN navigate to receipt
          UIUtils.showSuccessDialog(
            context,
            title: "Pagamento Realizado!",
            message: "O pagamento foi processado com sucesso.",
            onDismiss: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => ReceiptScreen(transactionData: receiptData),
                ),
              );
            },
          );
        } else {
          // Backend returned failure status (FALHOU, PENDENTE, etc.)
          final errorMsg =
              response['error_message'] ??
              response['response_payload']?['error'] ??
              "O pagamento não foi concluído. Status: $txStatus";
          UIUtils.showErrorDialog(
            context,
            title: "Falha no Pagamento",
            message: errorMsg.toString(),
            onExit: () => Navigator.pop(context),
          );
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      // Network/exception error: Show dialog and stay on page for retry
      if (mounted) {
        UIUtils.showErrorDialog(
          context,
          title: "Erro no Pagamento",
          message: e.toString().replaceAll('Exception: ', ''),
          onExit: () => Navigator.pop(context),
        );
      }
    }
  }

  /// Builds quick-select chip for merchant's registered mobile money number
  /// Only shows the relevant number for the selected payment method
  Widget _buildRegisteredNumbersChips() {
    final merchant = _selectedMerchant;
    if (merchant == null) return const SizedBox.shrink();

    // Get the specific number for the selected payment method
    String? specificNumber;
    String? methodLabel;
    Color methodColor = const Color(0xFF10B981);
    IconData methodIcon = LucideIcons.smartphone;

    switch (_selectedMethod) {
      case 'MPESA':
        specificNumber = merchant['mpesa_number']?.toString();
        methodLabel = 'M-Pesa';
        methodColor = const Color(0xFFE11400);
        methodIcon = LucideIcons.smartphone;
        break;
      case 'EMOLA':
        specificNumber = merchant['emola_number']?.toString();
        methodLabel = 'e-Mola';
        methodColor = const Color(0xFFF7941D);
        methodIcon = LucideIcons.wallet;
        break;
      case 'MKESH':
        specificNumber = merchant['mkesh_number']?.toString();
        methodLabel = 'mKesh';
        methodColor = const Color(0xFF0071CE);
        methodIcon = LucideIcons.creditCard;
        break;
      default:
        return const SizedBox.shrink();
    }

    // Check if number exists and is not empty
    if (specificNumber == null || specificNumber.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.orange.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange.shade200),
        ),
        child: Row(
          children: [
            Icon(
              LucideIcons.alertCircle,
              color: Colors.orange.shade700,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Número $methodLabel não cadastrado. Digite manualmente.',
                style: TextStyle(color: Colors.orange.shade800, fontSize: 13),
              ),
            ),
          ],
        ),
      ).animate().fadeIn(duration: 200.ms).slideY(begin: -0.1, end: 0);
    }

    final isSelected = _customerNumberController.text == specificNumber;

    return GestureDetector(
          onTap: () {
            setState(() {
              _customerNumberController.text = specificNumber!;
            });
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              gradient: isSelected
                  ? LinearGradient(
                      colors: [methodColor, methodColor.withOpacity(0.8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              color: isSelected ? null : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? methodColor : Colors.grey.shade300,
                width: isSelected ? 2 : 1,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: methodColor.withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Colors.white.withOpacity(0.2)
                        : methodColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    methodIcon,
                    color: isSelected ? Colors.white : methodColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        methodLabel!,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: isSelected
                              ? Colors.white.withOpacity(0.8)
                              : Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        specificNumber,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                          color: isSelected
                              ? Colors.white
                              : Colors.grey.shade800,
                        ),
                      ),
                    ],
                  ),
                ),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white : Colors.transparent,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isSelected ? LucideIcons.check : LucideIcons.plus,
                    color: isSelected ? methodColor : Colors.grey.shade400,
                    size: 18,
                  ),
                ),
              ],
            ),
          ),
        )
        .animate(key: ValueKey(_selectedMethod))
        .fadeIn(duration: 200.ms)
        .slideX(begin: 0.05, end: 0);
  }

  @override
  Widget build(BuildContext context) {
    const emerald500 = Color(0xFF10B981);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          "Receber Pagamento",
          style: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        elevation: 0,
      ),
      body: Column(
        children: [
          LinearProgressIndicator(
            value: _currentStep == 'MERCHANT'
                ? 0.25
                : _currentStep == 'AMOUNT'
                ? 0.50
                : _currentStep == 'METHOD'
                ? 0.75
                : 1.0,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(emerald500),
          ),
          Expanded(child: _buildCurrentStep()),
        ],
      ),
    );
  }

  Widget _buildCurrentStep() {
    if (_currentStep == 'MERCHANT') {
      return _buildMerchantStep();
    } else if (_currentStep == 'AMOUNT') {
      return _buildAmountStep();
    } else if (_currentStep == 'METHOD') {
      return _buildMethodStep();
    } else if (_currentStep == 'SUCCESS') {
      return _buildSuccessStep();
    }
    return Container();
  }

  // Refactored Steps
  Widget _buildMerchantStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 24),
          Icon(LucideIcons.nfc, size: 64, color: const Color(0xFF10B981)),
          const SizedBox(height: 24),
          Text(
            "Aproxime o Cartão",
            style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            "Localize o comerciante pelo NFC",
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(color: Colors.grey),
          ),
          const SizedBox(height: 32),
          TextField(
            controller: _merchantIdController,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
            decoration: InputDecoration(
              hintText: "UID do Cartão",
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              prefixIcon: const Icon(LucideIcons.creditCard),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _findMerchant,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text("VALIDAR CARTÃO"),
            ),
          ),
          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
            ),

          // Divider with OR
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Row(
              children: [
                Expanded(child: Divider(color: Colors.grey.shade300)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    "OU",
                    style: GoogleFonts.inter(
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(child: Divider(color: Colors.grey.shade300)),
              ],
            ),
          ),

          // Ambulante Button
          SizedBox(
            width: double.infinity,
            height: 72,
            child: OutlinedButton.icon(
              onPressed: _showAmbulanteModal,
              icon: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  LucideIcons.userPlus,
                  color: Colors.orange.shade700,
                  size: 24,
                ),
              ),
              label: Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Vendedor Ambulante",
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade800,
                      ),
                    ),
                    Text(
                      "Sem cartão NFC • Registro rápido",
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
              style: OutlinedButton.styleFrom(
                alignment: Alignment.centerLeft,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                side: BorderSide(color: Colors.orange.shade300, width: 2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1, end: 0),
        ],
      ),
    );
  }

  /// Shows modal to register ambulante details quickly
  void _showAmbulanteModal() async {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();

    // Load markets - cache-first pattern (same as merchant registration)
    final marketService = MarketService();
    final marketCache = MarketCacheService();
    List<Map<String, dynamic>> markets = [];
    Map<String, dynamic>? selectedMarket;
    bool loadingMarkets = true;
    String? errorMessage; // For inline error display

    // Try cache first for instant display
    final cachedMarkets = await marketCache.getCachedMarkets();
    if (cachedMarkets.isNotEmpty) {
      markets = cachedMarkets;
    }

    // Try API if online (updates cache silently)
    if (!_isOffline) {
      try {
        final apiMarkets = await marketService.getApprovedMarkets();
        if (apiMarkets.isNotEmpty) {
          markets = apiMarkets;
          await marketCache.cacheMarkets(apiMarkets);
        }
      } catch (e) {
        debugPrint('Error loading markets from API: $e');
        // Continue with cached markets if API fails
      }
    }
    loadingMarkets = false;

    if (!mounted) return;

    UIUtils.showCustomBottomSheet(
      context,
      isScrollControlled: true,
      child: StatefulBuilder(
        builder: (context, setModalState) => SizedBox(
          // Changed to SizedBox to allow child to determine height
          child: Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              left: 24,
              right: 24,
              top: 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Handle bar handled by UIUtils
                const SizedBox(height: 8),

                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.orange.shade400,
                            Colors.orange.shade600,
                          ],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        LucideIcons.userPlus,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Vendedor Ambulante",
                            style: GoogleFonts.inter(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            "Preencha os dados para cobrança",
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Form Fields
                // Name (Required)
                TextField(
                  controller: nameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(
                    labelText: "Nome Completo *",
                    hintText: "Ex: João Silva",
                    prefixIcon: const Icon(LucideIcons.user),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: Colors.orange.shade400,
                        width: 2,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Phone (Optional)
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  maxLength: 9,
                  decoration: InputDecoration(
                    labelText: "Número de Telefone (Opcional)",
                    hintText: "84/85/86/87...",
                    prefixIcon: const Icon(LucideIcons.phone),
                    counterText: "",
                    filled: true,
                    fillColor: Colors.grey.shade50,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: Colors.orange.shade400,
                        width: 2,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Market Dropdown (from agent jurisdiction)
                DropdownButtonFormField<Map<String, dynamic>>(
                  value: selectedMarket,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: "Mercado / Local *",
                    prefixIcon: const Icon(LucideIcons.mapPin),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: Colors.orange.shade400,
                        width: 2,
                      ),
                    ),
                  ),
                  hint: loadingMarkets
                      ? const Text("Carregando...")
                      : const Text("Selecione o mercado"),
                  items: markets.map((market) {
                    return DropdownMenuItem<Map<String, dynamic>>(
                      value: market,
                      child: Text(
                        market['name'] ?? '',
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setModalState(() {
                      selectedMarket = value;
                    });
                  },
                ),
                const SizedBox(height: 24),

                // Info Card
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue.shade100),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        LucideIcons.info,
                        color: Colors.blue.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          "Esta cobrança será registrada como vendedor ambulante. Telefone é opcional.",
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.blue.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Inline Error Message (shows above button)
                if (errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.alertCircle,
                          color: Colors.red.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            errorMessage!,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: Colors.red.shade800,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () => setModalState(() => errorMessage = null),
                          child: Icon(
                            LucideIcons.x,
                            color: Colors.red.shade400,
                            size: 18,
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 200.ms).shake(),

                // Submit Button
                SizedBox(
                  height: 56,
                  child: ElevatedButton.icon(
                    onPressed: loadingMarkets
                        ? null
                        : () async {
                            // Clear previous error
                            setModalState(() => errorMessage = null);

                            // Validate name
                            if (nameController.text.trim().isEmpty) {
                              setModalState(
                                () => errorMessage = "Nome é obrigatório",
                              );
                              return;
                            }

                            // Validate market selection
                            if (selectedMarket == null) {
                              setModalState(
                                () => errorMessage = "Selecione o mercado",
                              );
                              return;
                            }

                            // Show loading
                            setModalState(() {
                              loadingMarkets = true;
                              errorMessage = null;
                            });

                            try {
                              // Import offline queue service
                              final offlineQueue =
                                  OfflineMerchantQueueService();
                              final merchantCache = MerchantCacheService();

                              // OFFLINE MODE: Queue registration and create temp merchant
                              if (_isOffline) {
                                final tempId = await offlineQueue
                                    .queueMerchantRegistration(
                                      fullName: nameController.text.trim(),
                                      phoneNumber:
                                          phoneController.text.trim().isNotEmpty
                                          ? phoneController.text.trim()
                                          : null,
                                      marketId: selectedMarket!['id'],
                                      nfcUid: null,
                                      mpesaNumber:
                                          phoneController.text.trim().isNotEmpty
                                          ? phoneController.text.trim()
                                          : null,
                                      emolaNumber: null,
                                      mkeshNumber: null,
                                      agentId: 0, // Will be set during sync
                                      agentName: 'Agente',
                                    );

                                // Create temp merchant object for payment flow
                                final tempMerchant = {
                                  'id': tempId,
                                  'full_name': nameController.text.trim(),
                                  'phone_number':
                                      phoneController.text.trim().isNotEmpty
                                      ? phoneController.text.trim()
                                      : null,
                                  'market_id': selectedMarket!['id'],
                                  'mpesa_number':
                                      phoneController.text.trim().isNotEmpty
                                      ? phoneController.text.trim()
                                      : null,
                                  'merchant_type': 'AMBULANTE',
                                  'status':
                                      'ATIVO', // New ambulantes are always active
                                  'is_offline_pending': true,
                                };

                                // Add to cache for immediate availability
                                await merchantCache.addOfflineMerchant(
                                  tempMerchant,
                                );

                                // Close modal
                                Navigator.of(context).pop();

                                // Update parent state with temp merchant
                                setState(() {
                                  _selectedMerchant = tempMerchant;
                                  if (phoneController.text.trim().isNotEmpty) {
                                    _customerNumberController.text =
                                        phoneController.text.trim();
                                  }
                                  _currentStep = 'AMOUNT';
                                });
                                return;
                              }

                              // ONLINE MODE: Call API to create ambulante
                              final merchantService = MerchantService();
                              final createdMerchant = await merchantService
                                  .createAmbulante(
                                    fullName: nameController.text.trim(),
                                    marketId: selectedMarket!['id'],
                                    phoneNumber:
                                        phoneController.text.trim().isNotEmpty
                                        ? phoneController.text.trim()
                                        : null,
                                    mpesaNumber:
                                        phoneController.text.trim().isNotEmpty
                                        ? phoneController.text.trim()
                                        : null,
                                  );

                              // Close modal
                              Navigator.of(context).pop();

                              // Update parent state with real merchant data
                              setState(() {
                                _selectedMerchant = createdMerchant;
                                if (phoneController.text.trim().isNotEmpty) {
                                  _customerNumberController.text =
                                      phoneController.text.trim();
                                }
                                _currentStep = 'AMOUNT';
                              });
                            } catch (e) {
                              setModalState(() {
                                loadingMarkets = false;
                                errorMessage = e.toString().replaceAll(
                                  'Exception: ',
                                  '',
                                );
                              });
                            }
                          },
                    icon: loadingMarkets
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(LucideIcons.arrowRight),
                    label: Text(
                      loadingMarkets
                          ? "REGISTRANDO..."
                          : "CONTINUAR PARA PAGAMENTO",
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange.shade600,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Builds payment status badge for merchant (REGULAR/IRREGULAR)
  Widget _buildPaymentStatusBadge() {
    final merchant = _selectedMerchant;
    if (merchant == null) return const SizedBox.shrink();

    final paymentStatus =
        merchant['payment_status']?.toString().toUpperCase() ?? 'REGULAR';
    final daysOverdue = merchant['days_overdue'] ?? 0;

    if (paymentStatus == 'IRREGULAR') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red.shade200),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              LucideIcons.alertTriangle,
              size: 14,
              color: Colors.red.shade700,
            ),
            const SizedBox(width: 4),
            Text(
              'Irregular',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.red.shade700,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              // Calculate debt: Prefer overdue_balance if available, else days * 10
              '(${UIUtils.formatCurrency((merchant['overdue_balance'] != null && (merchant['overdue_balance'] as num) > 0) ? (merchant['overdue_balance'] as num).toDouble() : (daysOverdue * 10.0))} em atraso)',
              style: GoogleFonts.inter(
                fontSize: 10,
                color: Colors.red.shade500,
              ),
            ),
          ],
        ),
      );
    }

    // REGULAR status - green badge
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.checkCircle, size: 14, color: Colors.green.shade700),
          const SizedBox(width: 4),
          Text(
            // Show Regular + Credit if applicable
            (merchant['credit_balance'] != null &&
                    (merchant['credit_balance'] as num) > 0)
                ? 'Regular (+${UIUtils.formatCurrency((merchant['credit_balance'] as num).toDouble())})'
                : 'Regular',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.green.shade700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountStep() {
    return Column(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(24),
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _selectedMerchant?['full_name'] ?? "Comerciante",
                  style: GoogleFonts.inter(color: Colors.grey),
                ),
                const SizedBox(height: 8),
                // Payment Status Badge
                _buildPaymentStatusBadge(),
                const SizedBox(height: 16),
                Text(
                  _amountController.text.isEmpty
                      ? "0.00 MT"
                      : "${_amountController.text} MT",
                  style: GoogleFonts.inter(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
        ),
        Container(
          color: Colors.white,
          child: GridView.count(
            shrinkWrap: true,
            crossAxisCount: 3,
            childAspectRatio: 1.5,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              for (var k in [
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                'C',
                '0',
                'BACK',
              ])
                TextButton(
                  onPressed: () => _onKeypadTap(k),
                  child: k == 'BACK'
                      ? const Icon(LucideIcons.delete, color: Colors.black)
                      : Text(
                          k,
                          style: GoogleFonts.inter(
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                            color: Colors.black,
                          ),
                        ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _amountController.text.isEmpty
                  ? null
                  : _goToMethodSelection,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text("CONTINUAR"),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMethodStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Total a Pagar",
            style: GoogleFonts.inter(color: Colors.grey, fontSize: 14),
          ),
          Text(
            "${_amountController.text} MT",
            style: GoogleFonts.inter(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 32),

          // Method Selection Grid
          Text(
            "Selecione o Método",
            style: GoogleFonts.inter(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 2.5,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _methodButton("M-Pesa", "MPESA", const Color(0xFFE11400)),
              _methodButton("e-Mola", "EMOLA", const Color(0xFFF7941D)),
              _methodButton("mKesh", "MKESH", const Color(0xFF0071CE)),
              _methodButton("Dinheiro", "DINHEIRO", const Color(0xFF10B981)),
            ],
          ),

          const SizedBox(height: 32),

          // Conditional Input for Mobile
          if (_selectedMethod != 'DINHEIRO') ...[
            Text(
              "Número do Cliente (Pagador)",
              style: GoogleFonts.inter(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),

            // Quick-select registered numbers from merchant (VLOOKUP)
            _buildRegisteredNumbersChips(),
            const SizedBox(height: 12),

            TextFormField(
              controller: _customerNumberController,
              keyboardType: TextInputType.phone,
              maxLength: 9,
              decoration: InputDecoration(
                hintText: _selectedMethod == 'MPESA'
                    ? "84/85..."
                    : _selectedMethod == 'EMOLA'
                    ? "86/87..."
                    : "82/83...",
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: Icon(LucideIcons.smartphone),
                counterText: "",
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "O cliente receberá um prompt no celular para confirmar.",
              style: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
            ),
          ] else ...[
            Text(
              "Pagamento em Espécie",
              style: GoogleFonts.inter(
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            Text(
              "Receba o valor e confirme a transação.",
              style: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
            ),
          ],

          const SizedBox(height: 32),

          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
            ),

          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _processPayment,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text(
                      _selectedMethod == 'DINHEIRO'
                          ? "RECEBER DINHEIRO"
                          : "ENVIAR PROMPT",
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _methodButton(String label, String value, Color color) {
    final isSelected = _selectedMethod == value;
    final isMobileMoney = value != 'DINHEIRO';
    final isDisabled = _isOffline && isMobileMoney;

    return Tooltip(
      message: isDisabled ? 'Indisponível no modo offline' : '',
      child: InkWell(
        onTap: isDisabled
            ? () => UIUtils.showErrorSnackBar(
                context,
                'Pagamentos móveis requerem conexão com o servidor',
              )
            : () => setState(() {
                _selectedMethod = value;
                // Reset customer number and error when switching methods
                _customerNumberController.clear();
                _errorMessage = null;
              }),
        child: Stack(
          children: [
            Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isDisabled
                    ? Colors.grey.shade100
                    : isSelected
                    ? color.withOpacity(0.1)
                    : Colors.white,
                border: Border.all(
                  color: isDisabled
                      ? Colors.grey.shade300
                      : isSelected
                      ? color
                      : Colors.grey.shade200,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.inter(
                      fontWeight: FontWeight.bold,
                      color: isDisabled
                          ? Colors.grey.shade400
                          : isSelected
                          ? color
                          : Colors.grey.shade600,
                    ),
                  ),
                  if (isDisabled)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Offline',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Lock icon overlay for disabled buttons
            if (isDisabled)
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    LucideIcons.lock,
                    size: 10,
                    color: Colors.grey.shade500,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessStep() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: Color(0xFFDCFCE7),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.check,
              size: 48,
              color: Color(0xFF10B981),
            ),
          ).animate().scale(),
          const SizedBox(height: 24),
          Text(
            "Sucesso!",
            style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            "${_amountController.text} MT",
            style: GoogleFonts.inter(fontSize: 18, color: Colors.grey),
          ),
          const SizedBox(height: 8),
          Text(
            _selectedMethod,
            style: GoogleFonts.inter(
              fontWeight: FontWeight.bold,
              color: Colors.blue,
            ),
          ),
          const SizedBox(height: 48),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("VOLTAR AO INÍCIO"),
          ),
        ],
      ),
    );
  }
}
