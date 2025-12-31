import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../utils/ui_utils.dart';

class ReceiptScreen extends StatelessWidget {
  final Map<String, dynamic> transactionData;
  final bool isReprint;

  const ReceiptScreen({
    super.key,
    required this.transactionData,
    this.isReprint = false,
  });

  @override
  Widget build(BuildContext context) {
    // Parsing Data
    final amount = double.tryParse(transactionData['amount'].toString()) ?? 0.0;
    final merchantName =
        transactionData['merchant_name'] ??
        transactionData['merchant']?['full_name'] ??
        "Comerciante";
    final merchantNfc = transactionData['merchant']?['nfc_uid'] ?? "---";

    // Agent's jurisdiction and market
    // Debug: print data to see what's available
    print("DEBUG Receipt - Full Transaction: $transactionData");

    // Try to get province/district from:
    // 1. Transaction direct fields (from /payments/ response)
    // 2. Agent data (from login)
    // 3. Merchant's market data
    final province =
        transactionData['province'] ??
        transactionData['agent']?['scope_province'] ??
        transactionData['agent']?['market_province'] ??
        transactionData['merchant']?['market']?['province'] ??
        "";
    final district =
        transactionData['district'] ??
        transactionData['agent']?['scope_district'] ??
        transactionData['agent']?['market_district'] ??
        transactionData['merchant']?['market']?['district'] ??
        "";

    // Market name from agent or merchant
    final marketName =
        transactionData['agent']?['market_name'] ??
        transactionData['merchant']?['market']?['name'] ??
        "";

    // Location for header: "District, Province" (jurisdiction)
    final jurisdiction =
        (district.toString().isNotEmpty && province.toString().isNotEmpty)
        ? "$district, $province"
        : (province.toString().isNotEmpty ? province.toString() : "");

    // Location for "Local" field: market name
    final location = marketName.toString();

    final date =
        DateTime.tryParse(transactionData['created_at'] ?? "") ??
        DateTime.now();
    final ref = transactionData['payment_reference'] ?? "";
    final mpesaRef = transactionData['mpesa_reference'];
    final method = transactionData['payment_method'] ?? "DINHEIRO";
    final status = transactionData['status'] ?? "SUCESSO";
    final uuid = transactionData['transaction_uuid'] ?? "";
    final agentName = transactionData['agent']?['full_name'] ?? "";

    final currencyFormat = NumberFormat.currency(
      locale: 'pt_MZ',
      symbol: 'MZN ',
    );
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm:ss');

    final isSuccess = status == 'SUCESSO';
    final statusColor = isSuccess
        ? const Color(0xFF10B981)
        : const Color(0xFFEF4444);

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9), // Slate 100
      appBar: AppBar(
        title: Text(
          isReprint ? "Reimprimir Recibo" : "Recibo",
          style: GoogleFonts.inter(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.x, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Receipt Paper with Zigzag Edge
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Main Receipt Container
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 32,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Stack(
                    children: [
                      // Watermark - Diagonal PAYSAFE text
                      Positioned.fill(
                        child: IgnorePointer(
                          child: ClipRect(
                            clipBehavior: Clip.none,
                            child: OverflowBox(
                              maxWidth: double.infinity,
                              maxHeight: double.infinity,
                              child: Center(
                                child: Transform.rotate(
                                  angle: -0.785, // -45 degrees
                                  child: Opacity(
                                    opacity: 0.04,
                                    child: Text(
                                      "PAYSAFE",
                                      softWrap: false,
                                      overflow: TextOverflow.visible,
                                      style: GoogleFonts.inter(
                                        fontSize: 85,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.black,
                                        letterSpacing: 8,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Main Content
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // Logo Area
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              LucideIcons.creditCard,
                              size: 28,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            "PAYSAFE SYSTEMS",
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2,
                            ),
                          ),
                          Text(
                            "Digital Payment Gateway",
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              color: Colors.grey.shade500,
                              letterSpacing: 1.5,
                            ),
                          ),
                          Text(
                            jurisdiction.isNotEmpty
                                ? jurisdiction
                                : "Maputo, Moçambique",
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: Colors.grey.shade500,
                            ),
                          ),

                          const SizedBox(height: 20),
                          const Divider(color: Colors.grey, thickness: 0.5),
                          const SizedBox(height: 20),

                          // Amount Section
                          Text(
                            "VALOR TOTAL",
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              color: Colors.grey.shade500,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            currencyFormat.format(amount),
                            style: GoogleFonts.inter(
                              fontSize: 36,
                              fontWeight: FontWeight.w900,
                              color: statusColor,
                            ),
                          ),
                          const SizedBox(height: 8),
                          // Status Badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: statusColor.withOpacity(0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  isSuccess
                                      ? LucideIcons.checkCircle
                                      : LucideIcons.xCircle,
                                  size: 14,
                                  color: statusColor,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  status,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: statusColor,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Merchant Section
                          _buildSectionHeader("COMERCIANTE"),
                          _buildInfoRowBold(merchantName),
                          _buildInfoRow("Local", location),
                          _buildInfoRow("NFC ID", merchantNfc),

                          const SizedBox(height: 20),

                          // Details Section
                          _buildSectionHeader("DETALHES"),
                          _buildInfoRow("Data", dateFormat.format(date)),
                          _buildInfoRow("Método", method),
                          _buildInfoRow("Ref. Interna", ref),
                          // Only show M-Pesa/mobile money reference for non-cash payments
                          if (mpesaRef != null && method != 'DINHEIRO')
                            _buildInfoRow(
                              method == 'MPESA'
                                  ? "M-Pesa Ref"
                                  : method == 'EMOLA'
                                  ? "E-Mola Ref"
                                  : method == 'MKESH'
                                  ? "M-Kesh Ref"
                                  : "Ref. Móvel",
                              mpesaRef,
                              valueColor: const Color(0xFFEA580C),
                            ),

                          const SizedBox(height: 20),

                          // Operator Section
                          _buildSectionHeader("OPERADOR"),
                          _buildInfoRow("Responsável", agentName),
                          _buildInfoRow("Cargo", "Agente Oficial"),

                          const SizedBox(height: 24),
                          const Divider(color: Color(0xFF0F172A), thickness: 1),
                          const SizedBox(height: 16),

                          // UUID Footer
                          Text(
                            "UUID: $uuid",
                            textAlign: TextAlign.center,
                            style: GoogleFonts.courierPrime(
                              fontSize: 9,
                              color: Colors.grey.shade400,
                            ),
                          ),
                          const SizedBox(height: 12),
                          // Barcode Mockup
                          Container(
                            height: 30,
                            width: 180,
                            decoration: BoxDecoration(
                              color: Colors.black,
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(2),
                              child: CustomPaint(
                                size: const Size(180, 30),
                                painter: _BarcodePainter(),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            "Obrigado pela preferência.",
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: Colors.grey.shade400,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Zigzag Bottom Edge
                Positioned(
                  bottom: -12,
                  left: 0,
                  right: 0,
                  child: CustomPaint(
                    size: Size(MediaQuery.of(context).size.width - 32, 12),
                    painter: _ZigzagPainter(),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 40),

            // Action Buttons
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                onPressed: () {
                  UIUtils.showInfoSnackBar(context, "Imprimindo...");
                },
                icon: const Icon(LucideIcons.printer),
                label: const Text("IMPRIMIR RECIBO"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F172A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: OutlinedButton(
                onPressed: () =>
                    Navigator.of(context).popUntil((route) => route.isFirst),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: Colors.grey.shade300),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  isReprint ? "VOLTAR" : "NOVO PAGAMENTO",
                  style: const TextStyle(
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: Colors.grey.shade400,
            letterSpacing: 1,
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRowBold(String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          value,
          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: valueColor ?? Colors.black,
            ),
          ),
        ],
      ),
    );
  }
}

// Custom Painter for Barcode Mockup
class _BarcodePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white;
    double x = 4;
    final random = [
      2,
      1,
      3,
      1,
      2,
      4,
      1,
      2,
      3,
      1,
      4,
      2,
      1,
      3,
      2,
      1,
      4,
      2,
      3,
      1,
      2,
      1,
      3,
      4,
      1,
      2,
    ];
    for (int i = 0; i < random.length && x < size.width - 4; i++) {
      final width = random[i].toDouble() * 1.5;
      canvas.drawRect(Rect.fromLTWH(x, 4, width, size.height - 8), paint);
      x += width + 3;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Custom Painter for Zigzag Edge
class _ZigzagPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.05)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);

    final path = Path();
    const zigSize = 10.0;
    path.moveTo(0, 0);

    double x = 0;
    while (x < size.width) {
      path.lineTo(x + zigSize / 2, size.height);
      path.lineTo(x + zigSize, 0);
      x += zigSize;
    }
    path.lineTo(size.width, 0);
    path.close();

    canvas.drawPath(path, shadowPaint);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
