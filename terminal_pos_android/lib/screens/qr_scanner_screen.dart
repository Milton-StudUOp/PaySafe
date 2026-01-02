import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/feedback_service.dart';
import 'receipt_verification_screen.dart';

/// Modern QR Scanner Screen with animated frame
class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen>
    with SingleTickerProviderStateMixin {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  bool _hasScanned = false;
  late AnimationController _animationController;
  late Animation<double> _scanLineAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _scanLineAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? code = barcodes.first.rawValue;
    if (code == null || !code.contains('|')) return;

    setState(() => _hasScanned = true);

    // Haptic feedback
    FeedbackService().successFeedback();

    // Navigate to verification screen
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => ReceiptVerificationScreen(qrToken: code),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final scanAreaSize = screenSize.width * 0.7;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera Preview
          MobileScanner(controller: _scannerController, onDetect: _onDetect),

          // Dark Overlay with Transparent Scan Area
          CustomPaint(
            size: Size(screenSize.width, screenSize.height),
            painter: _ScanOverlayPainter(
              scanAreaSize: scanAreaSize,
              borderRadius: 24,
            ),
          ),

          // Scan Area Frame with Animated Corners
          Center(
            child: SizedBox(
              width: scanAreaSize,
              height: scanAreaSize,
              child: Stack(
                children: [
                  // Corner Decorations
                  ..._buildCorners(scanAreaSize),

                  // Animated Scan Line
                  AnimatedBuilder(
                    animation: _scanLineAnimation,
                    builder: (context, child) {
                      return Positioned(
                        top: _scanLineAnimation.value * (scanAreaSize - 4),
                        left: 20,
                        right: 20,
                        child: Container(
                          height: 2,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Colors.transparent,
                                const Color(0xFF10B981),
                                const Color(0xFF10B981),
                                Colors.transparent,
                              ],
                              stops: const [0.0, 0.3, 0.7, 1.0],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF10B981).withOpacity(0.5),
                                blurRadius: 8,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // Top Bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: IconButton(
                      icon: const Icon(LucideIcons.x, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: IconButton(
                      icon: Icon(
                        _scannerController.torchEnabled
                            ? LucideIcons.zap
                            : LucideIcons.zapOff,
                        color: Colors.white,
                      ),
                      onPressed: () => _scannerController.toggleTorch(),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Instructions
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        LucideIcons.scan,
                        color: Color(0xFF10B981),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "Aponte para o QR Code do recibo",
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  "Verificar Autenticidade",
                  style: GoogleFonts.inter(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCorners(double size) {
    const cornerSize = 40.0;
    const thickness = 4.0;
    const color = Color(0xFF10B981);

    return [
      // Top Left
      Positioned(
        top: 0,
        left: 0,
        child: _buildCorner(cornerSize, thickness, color, 0),
      ),
      // Top Right
      Positioned(
        top: 0,
        right: 0,
        child: _buildCorner(cornerSize, thickness, color, 1),
      ),
      // Bottom Left
      Positioned(
        bottom: 0,
        left: 0,
        child: _buildCorner(cornerSize, thickness, color, 2),
      ),
      // Bottom Right
      Positioned(
        bottom: 0,
        right: 0,
        child: _buildCorner(cornerSize, thickness, color, 3),
      ),
    ];
  }

  Widget _buildCorner(
    double size,
    double thickness,
    Color color,
    int position,
  ) {
    final BorderRadius borderRadius;
    switch (position) {
      case 0:
        borderRadius = const BorderRadius.only(topLeft: Radius.circular(24));
        break;
      case 1:
        borderRadius = const BorderRadius.only(topRight: Radius.circular(24));
        break;
      case 2:
        borderRadius = const BorderRadius.only(bottomLeft: Radius.circular(24));
        break;
      default:
        borderRadius = const BorderRadius.only(
          bottomRight: Radius.circular(24),
        );
        break;
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        border: Border(
          top: position < 2
              ? BorderSide(color: color, width: thickness)
              : BorderSide.none,
          bottom: position >= 2
              ? BorderSide(color: color, width: thickness)
              : BorderSide.none,
          left: position % 2 == 0
              ? BorderSide(color: color, width: thickness)
              : BorderSide.none,
          right: position % 2 == 1
              ? BorderSide(color: color, width: thickness)
              : BorderSide.none,
        ),
      ),
    );
  }
}

/// Overlay painter for the scanning area
class _ScanOverlayPainter extends CustomPainter {
  final double scanAreaSize;
  final double borderRadius;

  _ScanOverlayPainter({required this.scanAreaSize, required this.borderRadius});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.7)
      ..style = PaintingStyle.fill;

    final scanRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(size.width / 2, size.height / 2),
        width: scanAreaSize,
        height: scanAreaSize,
      ),
      Radius.circular(borderRadius),
    );

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(scanRect);
    path.fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
