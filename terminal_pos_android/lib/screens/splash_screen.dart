import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import '../services/connectivity_service.dart';
import 'login_screen.dart';
import 'dashboard_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  String _statusMessage = 'A iniciar...';
  bool _isCheckingConnection = true;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // Initialize app constants (load custom server URL if set)
    await AppConstants.initialize();

    setState(() {
      _statusMessage = 'A verificar conexão...';
    });

    // Check connectivity
    final connectivity = ConnectivityService();
    final isConnected = await connectivity.checkConnectivity();

    setState(() {
      _isCheckingConnection = false;
      if (isConnected) {
        _statusMessage = 'Conectado';
      } else {
        _statusMessage = connectivity.statusMessage;
      }
    });

    // Brief delay for splash effect
    await Future.delayed(const Duration(milliseconds: 1500));

    if (!mounted) return;

    // Check authentication
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');

    if (token != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const DashboardScreen()),
      );
    } else {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      body: SafeArea(
        child: Column(
          children: [
            // Main content - centered
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Logo with emerald glow
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981), // Emerald 500
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF10B981).withOpacity(0.4),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: const Icon(
                        LucideIcons.wallet,
                        size: 64,
                        color: Colors.white,
                      ),
                    ).animate().scale(
                      duration: 600.ms,
                      curve: Curves.elasticOut,
                    ),

                    const SizedBox(height: 24),

                    // App name
                    Text(
                      "PaySafe POS",
                      style: GoogleFonts.outfit(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 1.2,
                      ),
                    ).animate().fade().slideY(delay: 300.ms),

                    const SizedBox(height: 8),

                    // Tagline
                    Text(
                      "Terminal Seguro",
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white54,
                      ),
                    ).animate().fade().slideY(delay: 500.ms),

                    const SizedBox(height: 32),

                    // Status indicator
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: Row(
                        key: ValueKey(_statusMessage),
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_isCheckingConnection)
                            const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Color(0xFF10B981),
                                ),
                              ),
                            )
                          else
                            Icon(
                              _statusMessage == 'Conectado'
                                  ? LucideIcons.wifi
                                  : LucideIcons.wifiOff,
                              size: 16,
                              color: _statusMessage == 'Conectado'
                                  ? const Color(0xFF10B981)
                                  : Colors.amber,
                            ),
                          const SizedBox(width: 8),
                          Text(
                            _statusMessage,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: _statusMessage == 'Conectado'
                                  ? const Color(0xFF10B981)
                                  : Colors.white54,
                            ),
                          ),
                        ],
                      ),
                    ).animate().fade(delay: 700.ms),
                  ],
                ),
              ),
            ),

            // Footer with version
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  Text(
                    'Versão ${AppConstants.appVersion}',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: Colors.white38,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '© ${DateTime.now().year} PaySafe Moçambique',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      color: Colors.white24,
                    ),
                  ),
                ],
              ),
            ).animate().fade(delay: 800.ms),
          ],
        ),
      ),
    );
  }
}
