import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/transaction_service.dart';
import '../services/market_service.dart';
import 'receipt_screen.dart'; // To reprint logic

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() =>
      _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  final _transactionService = TransactionService();

  // State
  bool _isLoading = true;
  List<dynamic> _transactions = [];
  double _filteredTotal = 0.0;
  int _filteredCount = 0;

  DateTime _selectedDate = DateTime.now();
  final _currencyFormat = NumberFormat.currency(locale: 'pt_MZ', symbol: 'MT');
  final _dateFormat = DateFormat('HH:mm');

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);

    try {
      final txs = await _transactionService.getTransactions(
        startDate: DateFormat('yyyy-MM-dd').format(_selectedDate),
        endDate: DateFormat('yyyy-MM-dd').format(_selectedDate),
        limit: 100,
      );

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
                      final date =
                          DateTime.tryParse(tx['created_at'] ?? "") ??
                          DateTime.now();
                      final merchantName =
                          tx['merchant']?['full_name'] ?? "Comerciante";

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
                              _buildStatusBadge(status),
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
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
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
    return Text(
      status,
      style: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.bold,
        color: color,
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
