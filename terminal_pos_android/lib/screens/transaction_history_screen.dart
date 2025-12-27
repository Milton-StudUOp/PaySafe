import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/transaction_service.dart';
import '../services/transaction_cache_service.dart';
import '../services/offline_payment_queue_service.dart';
import '../services/auth_service.dart';
import '../services/market_service.dart';
import '../services/connectivity_service.dart'; // Added
import 'dart:async';
import 'receipt_screen.dart'; // To reprint logic

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() =>
      _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  final _transactionService = TransactionService();
  final _transactionCache = TransactionCacheService();
  final _offlineQueue = OfflinePaymentQueueService();
  final _authService = AuthService();
  final _connectivityService = ConnectivityService(); // Added

  // State
  bool _isLoading = true;
  bool _isOffline = false;
  List<dynamic> _transactions = [];
  double _filteredTotal = 0.0;
  int _filteredCount = 0;
  StreamSubscription<bool>? _connectivitySubscription; // Added

  DateTime _selectedDate = DateTime.now();
  final _currencyFormat = NumberFormat.currency(locale: 'pt_MZ', symbol: 'MT');
  final _dateFormat = DateFormat('HH:mm');

  @override
  void initState() {
    super.initState();
    _checkOfflineAndFetch();
    // Listen to real-time connectivity changes
    _connectivitySubscription = _connectivityService.connectionStream.listen((
      isConnected,
    ) {
      if (mounted) {
        final wasOffline = _isOffline;
        setState(() => _isOffline = !isConnected);
        // Refresh data if we just came online
        if (wasOffline && isConnected) {
          _fetchData();
        }
      }
    });
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  Future<void> _checkOfflineAndFetch() async {
    final isOfflineLogin = await _authService.isOfflineMode();
    final isConnected = await _connectivityService.checkConnectivity();
    _isOffline = isOfflineLogin || !isConnected;
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);

    try {
      List<Map<String, dynamic>> txs = [];

      if (_isOffline) {
        // Offline: use cached transactions
        txs = await _transactionCache.getTransactionsByDateRange(
          startDate: DateTime(
            _selectedDate.year,
            _selectedDate.month,
            _selectedDate.day,
          ),
          endDate: DateTime(
            _selectedDate.year,
            _selectedDate.month,
            _selectedDate.day,
            23,
            59,
            59,
          ),
        );
      } else {
        // Online: try API first, fallback to cache
        try {
          txs = await _transactionService.getTransactions(
            startDate: DateFormat('yyyy-MM-dd').format(_selectedDate),
            endDate: DateFormat('yyyy-MM-dd').format(_selectedDate),
            limit: 100,
          );
        } catch (e) {
          // API failed, try cache
          debugPrint('API failed, using cache: $e');
          txs = await _transactionCache.getTransactionsByDateRange(
            startDate: DateTime(
              _selectedDate.year,
              _selectedDate.month,
              _selectedDate.day,
            ),
            endDate: DateTime(
              _selectedDate.year,
              _selectedDate.month,
              _selectedDate.day,
              23,
              59,
              59,
            ),
          );
        }
      }

      // Add pending offline payments for today
      final today = DateTime.now();
      if (_selectedDate.year == today.year &&
          _selectedDate.month == today.month &&
          _selectedDate.day == today.day) {
        final pendingPayments = await _offlineQueue.getPendingPayments();
        for (final payment in pendingPayments) {
          // Mark as pending sync for UI display
          final tx = Map<String, dynamic>.from(payment);
          tx['is_pending_sync'] = true;
          tx['status'] = 'SUCESSO'; // Show as success
          txs.insert(0, tx); // Add to top of list
        }
      }

      // Calculate stats locally from filtered transactions
      double totalFiltered = 0.0;
      int countFiltered = 0;
      for (var tx in txs) {
        if (tx['status'] == 'SUCESSO') {
          totalFiltered += double.tryParse(tx['amount'].toString()) ?? 0.0;
          countFiltered++;
        }
      }

      setState(() {
        _transactions = txs;
        _filteredTotal = totalFiltered;
        _filteredCount = countFiltered;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _fetchData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          "Transações",
          style: GoogleFonts.inter(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.calendar, color: Colors.black),
            onPressed: () => _selectDate(context),
          ),
        ],
        elevation: 0,
      ),
      body: Column(
        children: [
          // Stats Header
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    "Total",
                    _currencyFormat.format(_filteredTotal),
                    LucideIcons.banknote,
                    const Color(0xFF10B981),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    "Quantidade",
                    _filteredCount.toString(),
                    LucideIcons.barChart3,
                    const Color(0xFF3B82F6),
                  ),
                ),
              ],
            ),
          ),

          // Filter Display
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Transações de ${DateFormat('dd/MM/yyyy').format(_selectedDate)}",
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade600,
                  ),
                ),
                if (_isLoading)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
          ),

          // List
          Expanded(
            child: _transactions.isEmpty && !_isLoading
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          LucideIcons.history,
                          size: 64,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          "Sem transações nesta data",
                          style: GoogleFonts.inter(color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _transactions.length,
                    itemBuilder: (context, index) {
                      final tx = _transactions[index];
                      final amount =
                          double.tryParse(tx['amount'].toString()) ?? 0.0;
                      final method = tx['payment_method'] ?? "DINHEIRO";
                      final status = tx['status'] ?? "PENDING";
                      final isPendingSync = tx['is_pending_sync'] == true;
                      final date =
                          DateTime.tryParse(tx['created_at'] ?? "") ??
                          DateTime.now();
                      final merchantName =
                          tx['merchant_name'] ??
                          tx['merchant']?['full_name'] ??
                          "Comerciante";

                      return Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Colors.grey.shade200),
                        ),
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: _getMethodColor(method).withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _getMethodIcon(method),
                              color: _getMethodColor(method),
                              size: 20,
                            ),
                          ),
                          title: Text(
                            merchantName,
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Text(
                            "${_dateFormat.format(date)} • $method",
                            style: GoogleFonts.inter(fontSize: 12),
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                _currencyFormat.format(amount),
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              _buildStatusBadge(
                                status,
                                isPendingSync: isPendingSync,
                              ),
                            ],
                          ),
                          onTap: () async {
                            // Navigate to Receipt (Reprint mode)
                            final receiptData = Map<String, dynamic>.from(tx);
                            receiptData['merchant_name'] = merchantName;

                            // Get logged-in agent data (same as new payment flow)
                            final prefs = await SharedPreferences.getInstance();
                            final userDataString = prefs.getString('user_data');
                            if (userDataString != null) {
                              receiptData['agent'] = json.decode(
                                userDataString,
                              );
                            }

                            // Fetch market data to enrich merchant info (fallback)
                            final marketId = tx['merchant']?['market_id'];
                            if (marketId != null) {
                              final marketService = MarketService();
                              final market = await marketService.getMarketById(
                                marketId,
                              );
                              if (market != null) {
                                // Ensure merchant object exists
                                receiptData['merchant'] ??= {};
                                (receiptData['merchant']
                                        as Map<
                                          String,
                                          dynamic
                                        >)['market_name'] =
                                    market['name'];
                                (receiptData['merchant']
                                        as Map<
                                          String,
                                          dynamic
                                        >)['market_district'] =
                                    market['district'];
                                (receiptData['merchant']
                                        as Map<
                                          String,
                                          dynamic
                                        >)['market_province'] =
                                    market['province'];
                              }
                            }

                            if (context.mounted) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ReceiptScreen(
                                    transactionData: receiptData,
                                    isReprint: true,
                                  ),
                                ),
                              );
                            }
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: Colors.grey.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status, {bool isPendingSync = false}) {
    if (isPendingSync) {
      // Pending sync: show special indicator
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.amber.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.amber.shade300),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.cloudOff, size: 10, color: Colors.amber.shade700),
            const SizedBox(width: 4),
            Text(
              'Aguardando Sync',
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: Colors.amber.shade700,
              ),
            ),
          ],
        ),
      );
    }

    Color color;
    switch (status) {
      case 'SUCESSO':
        color = Colors.green;
        break;
      case 'PENDING':
        color = Colors.orange;
        break;
      case 'FALHOU':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }

  Color _getMethodColor(String method) {
    switch (method) {
      case 'MPESA':
        return const Color(0xFFE11400);
      case 'EMOLA':
        return const Color(0xFFF7941D);
      case 'MKESH':
        return const Color(0xFF0071CE);
      default:
        return const Color(0xFF10B981);
    }
  }

  IconData _getMethodIcon(String method) {
    if (method == 'DINHEIRO') return LucideIcons.banknote;
    return LucideIcons.smartphone;
  }
}
