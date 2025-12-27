import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'dart:async';
import '../services/merchant_service.dart';
import '../services/merchant_cache_service.dart';
import '../services/connectivity_service.dart';
import '../utils/ui_utils.dart';
import 'payment_screen.dart';
import 'edit_merchant_screen.dart'; // Will create this next

class MerchantSearchScreen extends StatefulWidget {
  const MerchantSearchScreen({super.key});

  @override
  State<MerchantSearchScreen> createState() => _MerchantSearchScreenState();
}

class _MerchantSearchScreenState extends State<MerchantSearchScreen> {
  final _searchController = TextEditingController();
  final _merchantService = MerchantService();
  final _merchantCache = MerchantCacheService();
  final _connectivityService = ConnectivityService();

  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  bool _isOnline = true;
  String? _errorMessage;
  StreamSubscription<bool>? _connectivitySubscription;

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
    _connectivitySubscription = _connectivityService.connectionStream.listen((
      isConnected,
    ) {
      if (mounted) setState(() => _isOnline = isConnected);
    });
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  Future<void> _checkConnectivity() async {
    final isConnected = await _connectivityService.checkConnectivity();
    if (mounted) setState(() => _isOnline = isConnected);
  }

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _searchResults = [];
    });

    try {
      List<Map<String, dynamic>> results = [];

      // Detect query type
      final isHexUid = RegExp(r'^[0-9A-Fa-f]{8,}$').hasMatch(query);
      final isPhoneNumber = RegExp(
        r'^8[2-7][0-9]{7}$',
      ).hasMatch(query.replaceAll(RegExp(r'\D'), ''));

      if (isHexUid) {
        // Looks like NFC UID - search by NFC (cache first)
        final merchant = await _merchantCache.getMerchantByNfc(
          query.toUpperCase(),
        );
        if (merchant != null) {
          results = [merchant];
        } else if (_isOnline) {
          // Try API only if online
          try {
            final apiMerchant = await _merchantService.getMerchantByNfc(
              query.toUpperCase(),
            );
            if (apiMerchant != null) results = [apiMerchant];
          } catch (e) {
            debugPrint('API NFC lookup failed: $e');
          }
        }
      } else if (isPhoneNumber) {
        // Looks like phone number - search by phone
        final normalizedPhone = query.replaceAll(RegExp(r'\D'), '');
        final merchant = await _merchantCache.getMerchantByPhone(
          normalizedPhone,
        );
        if (merchant != null) {
          results = [merchant];
        } else if (_isOnline) {
          // Try API search only if online
          try {
            results = await _merchantService.searchMerchants(query);
          } catch (e) {
            debugPrint('API phone search failed: $e');
          }
        }
      } else {
        // General search - try cache first
        results = await _merchantCache.searchMerchantsByName(query);

        // If not found by name, try as NFC UID (case-insensitive)
        if (results.isEmpty) {
          final merchant = await _merchantCache.getMerchantByNfc(query);
          if (merchant != null) {
            results = [merchant];
          }
        }

        // Still empty? Try API only if online
        if (results.isEmpty && _isOnline) {
          try {
            results = await _merchantService.searchMerchants(query);
          } catch (e) {
            debugPrint('API search failed: $e');
          }
        }
      }

      if (results.isEmpty) {
        setState(() {
          _errorMessage = 'Nenhum comerciante encontrado';
        });
      }

      setState(() {
        _searchResults = results;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _scanNfc() async {
    bool isAvailable = await NfcManager.instance.isAvailable();
    if (!isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('NFC não disponível neste dispositivo')),
      );
      return;
    }

    _showNfcDialog();

    NfcManager.instance.startSession(
      onDiscovered: (NfcTag tag) async {
        try {
          final data = tag.data;
          String? uid;

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
            // Found UID, close dialog and look up merchant by NFC
            await NfcManager.instance.stopSession();
            if (mounted) {
              Navigator.pop(context); // Close dialog
              _searchController.text = uid;

              // Look up merchant by NFC UID (cache first, then API)
              await _findMerchantByNfc(uid);
            }
          }
        } catch (e) {
          await NfcManager.instance.stopSession();
          if (mounted) Navigator.pop(context);
        }
      },
    );
  }

  /// Find merchant by NFC UID using cache-first approach.
  Future<void> _findMerchantByNfc(String nfcUid) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _searchResults = [];
    });

    try {
      final merchantCache = MerchantCacheService();

      // Try cache first
      Map<String, dynamic>? merchant = await merchantCache.getMerchantByNfc(
        nfcUid,
      );

      // If not in cache, try API
      if (merchant == null) {
        try {
          merchant = await _merchantService.getMerchantByNfc(nfcUid);
        } catch (e) {
          debugPrint('API NFC lookup failed: $e');
        }
      }

      if (merchant != null) {
        // Found merchant - show in results and open action dialog
        setState(() {
          _searchResults = [merchant!];
        });
        _onMerchantSelected(merchant);
      } else {
        setState(() {
          _errorMessage = 'Cartão não identificado';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showNfcDialog() {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  LucideIcons.nfc,
                  size: 40,
                  color: Color(0xFF10B981),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                "Aproxime o Cartão",
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "Aproxime o cartão NFC na parte traseira do dispositivo",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    NfcManager.instance.stopSession();
                  },
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey.shade600,
                  ),
                  child: const Text("Cancelar"),
                ),
              ),
            ],
          ),
        ),
      ),
    ).then((_) => NfcManager.instance.stopSession());
  }

  void _onMerchantSelected(Map<String, dynamic> merchant) {
    UIUtils.showCustomBottomSheet(
      context,
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 32,
              backgroundColor: merchant['merchant_type'] == 'FIXO'
                  ? Colors.blue.shade50
                  : Colors.amber.shade50,
              child: Icon(
                merchant['merchant_type'] == 'FIXO'
                    ? LucideIcons.store
                    : LucideIcons.footprints,
                color: merchant['merchant_type'] == 'FIXO'
                    ? Colors.blue
                    : Colors.amber,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              merchant['full_name'],
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.nfc, size: 14, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text(
                    "NFC: ${merchant['nfc_uid'] ?? 'N/A'}",
                    style: GoogleFonts.inter(
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context); // Close sheet
                      _goToPayment(merchant);
                    },
                    icon: const Icon(LucideIcons.banknote),
                    label: const Text("PAGAR"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _goToEdit(merchant);
                    },
                    icon: const Icon(LucideIcons.edit),
                    label: const Text("EDITAR"),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16), // Safety spacing
          ],
        ),
      ),
    );
  }

  Future<void> _goToPayment(Map<String, dynamic> merchant) async {
    // We need to enrich if market info is missing, but PaymentScreen handles basic info.
    // Ideally we pass full merchant. PaymentScreen will be modified to accept it.
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentScreen(preSelectedMerchant: merchant),
      ),
    );
  }

  Future<void> _goToEdit(Map<String, dynamic> merchant) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => EditMerchantScreen(merchant: merchant)),
    );

    // If update occurred, refresh current search results
    if (result == true && mounted) {
      if (_searchController.text.isNotEmpty) {
        _performSearch();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          "Localizar Comerciante",
          style: GoogleFonts.inter(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: "Nome, Telefone ou NFC",
                      prefixIcon: const Icon(LucideIcons.search),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onSubmitted: (_) => _performSearch(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  icon: const Icon(LucideIcons.nfc),
                  onPressed: _scanNfc,
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    foregroundColor: Colors.white,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  icon: const Icon(LucideIcons.search),
                  onPressed: _performSearch,
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_isLoading)
              const Expanded(child: Center(child: CircularProgressIndicator()))
            else if (_errorMessage != null)
              Expanded(
                child: Center(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              )
            else if (_searchResults.isEmpty)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        LucideIcons.userX,
                        size: 48,
                        color: Colors.grey,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        "Nenhum resultado",
                        style: GoogleFonts.inter(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  itemCount: _searchResults.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, index) {
                    final item = _searchResults[index];
                    return Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.grey.shade200),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: item['merchant_type'] == 'FIXO'
                              ? Colors.blue.shade50
                              : Colors.amber.shade50,
                          child: Icon(
                            item['merchant_type'] == 'FIXO'
                                ? LucideIcons.store
                                : LucideIcons.footprints,
                            color: item['merchant_type'] == 'FIXO'
                                ? Colors.blue
                                : Colors.amber,
                            size: 20,
                          ),
                        ),
                        title: Text(
                          item['full_name'],
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text("NFC: ${item['nfc_uid'] ?? '-'}"),
                        trailing: const Icon(LucideIcons.chevronRight),
                        onTap: () => _onMerchantSelected(item),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
