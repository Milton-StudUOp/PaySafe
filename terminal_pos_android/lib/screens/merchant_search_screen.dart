import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:nfc_manager/nfc_manager.dart';
import '../services/merchant_service.dart';
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
  // final _marketService = MarketService(); // Removed unused service

  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Debounce helper could be added, but manual search button is fine for POS

  @override
  void initState() {
    super.initState();
    // Optional: Start NFC immediately if desired, but user might want to type first.
    // Let's add an explicit FAB or button for NFC to avoid conflicts typing.
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
      final results = await _merchantService.searchMerchants(query);
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
            // Found UID, close dialog and search
            await NfcManager.instance.stopSession();
            if (mounted) {
              Navigator.pop(context); // Close dialog
              _searchController.text = uid;
              _performSearch();
            }
          }
        } catch (e) {
          await NfcManager.instance.stopSession();
          if (mounted) Navigator.pop(context);
        }
      },
    );
  }

  void _showNfcDialog() {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.nfc, size: 48, color: Color(0xFF10B981)),
            const SizedBox(height: 16),
            Text(
              "Aproxime o Cartão",
              style: GoogleFonts.inter(fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    ).then((_) => NfcManager.instance.stopSession());
  }

  void _onMerchantSelected(Map<String, dynamic> merchant) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              merchant['full_name'],
              style: GoogleFonts.inter(
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 8),
            Text("NFC: ${merchant['nfc_uid'] ?? 'N/A'}"),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _goToPayment(merchant);
                    },
                    icon: const Icon(LucideIcons.banknote),
                    label: const Text("PAGAR"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _goToEdit(merchant);
                    },
                    icon: const Icon(LucideIcons.edit),
                    label: const Text("EDITAR"),
                  ),
                ),
              ],
            ),
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

  void _goToEdit(Map<String, dynamic> merchant) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => EditMerchantScreen(merchant: merchant)),
    );
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
