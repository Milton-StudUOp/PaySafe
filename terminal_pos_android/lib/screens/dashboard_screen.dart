import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/auth_service.dart';
import '../services/inactivity_service.dart';
import '../services/sync_service.dart';
import '../services/connectivity_service.dart'; // Added
import 'login_screen.dart';
import 'payment_screen.dart';
import 'transaction_history_screen.dart';
import 'pin_reset_screen.dart';
import 'merchant_registration_screen.dart';
import 'merchant_search_screen.dart';

class DashboardScreen extends StatefulWidget {
  final bool isOfflineMode;

  const DashboardScreen({super.key, this.isOfflineMode = false});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final AuthService _authService = AuthService();
  final ConnectivityService _connectivityService = ConnectivityService();
  final SyncService _syncService = SyncService(); // Restored

  // State
  Map<String, dynamic>? _userData;
  Map<String, dynamic>? _deviceData;
  bool _isLoading = true;
  late bool _isLoginModeOffline; // True if user explicitly logged in offline
  String? _syncStatus;

  // Network state (dynamic, real-time)
  bool _isNetworkDown = false;
  bool _initialStateEstablished =
      false; // Skip first emission to prevent false changes

  // Unified offline state: True if user logged in offline OR network is down
  bool get _effectivelyOffline => _isLoginModeOffline || _isNetworkDown;

  // Banner state
  bool _showConnectionBanner = false;
  String _connectionBannerMessage = '';
  bool _isReconnectionBanner = false; // Green banner when reconnecting

  @override
  void initState() {
    super.initState();
    _isLoginModeOffline = widget.isOfflineMode; // User choice mode

    // Start network monitoring
    _connectivityService.startMonitoring();
    _connectivityService.connectionStream.listen(_handleConnectionChange);

    _loadUserData();

    // Start inactivity monitoring after login
    WidgetsBinding.instance.addPostFrameCallback((_) {
      InactivityService.startMonitoring(context);
    });
  }

  void _handleConnectionChange(bool isConnected) {
    if (!mounted) return;

    // First emission: establish initial state, don't react
    if (!_initialStateEstablished) {
      _initialStateEstablished = true;
      _isNetworkDown = !isConnected;
      debugPrint(
        '🌐 Initial network state established: ${isConnected ? "ONLINE" : "OFFLINE"}',
      );
      return; // Don't trigger any action on first check
    }

    final wasOffline = _isNetworkDown;

    // Only react to actual changes (after first state is established)
    if (isConnected == !wasOffline) return; // No real change

    if (isConnected && wasOffline) {
      // CAME ONLINE (was offline before)
      setState(() {
        _isNetworkDown = false;
        _connectionBannerMessage = "Conexão restaurada. Reautenticando...";
        _isReconnectionBanner = true;
        _showConnectionBanner = true;
      });

      // Sync data first, then logout for clean re-login
      _syncMerchantsInBackground().then((_) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted)
            _forceReloginWithMessage(
              'Conexão restaurada. Por favor, faça login novamente.',
            );
        });
      });
    } else if (!isConnected && !wasOffline) {
      // WENT OFFLINE (was online before)
      setState(() {
        _isNetworkDown = true;
        _connectionBannerMessage = "Conexão perdida. Reautenticando...";
        _isReconnectionBanner = false;
        _showConnectionBanner = true;
      });

      // Logout after brief delay for clean offline re-login
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted)
          _forceReloginWithMessage(
            'Conexão perdida. Por favor, faça login no modo offline.',
          );
      });
    }
  }

  /// Force logout and show message on login screen
  Future<void> _forceReloginWithMessage(String message) async {
    await _authService.logout();
    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => LoginScreen(initialMessage: message)),
      (route) => false,
    );
  }

  @override
  void dispose() {
    InactivityService.stopMonitoring();
    _connectivityService.stopMonitoring();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    final userData = await _authService.getUserData();
    final deviceData = await _authService.getDeviceData();
    setState(() {
      _userData = userData;
      _deviceData = deviceData;
      _isLoading = false;
    });

    // Check initial connectivity
    final isConnected = await _connectivityService.checkConnectivity();
    if (!isConnected && !_isLoginModeOffline) {
      // If we logged in online but net is down now
      _handleConnectionChange(false);
    }

    // Sync merchants in background if online (and not forced offline)
    if (!_isLoginModeOffline && isConnected) {
      _syncMerchantsInBackground();
    }
  }

  Future<void> _syncMerchantsInBackground() async {
    setState(() => _syncStatus = 'Sincronizando dados...');

    // Use the new comprehensive sync that handles:
    // 1. UPLOAD all pending offline data
    // 2. CLEAR all synced queues and caches
    // 3. DOWNLOAD fresh data from server
    final result = await _syncService.performFullOnlineSync(
      onStatusUpdate: (status) {
        if (mounted) setState(() => _syncStatus = status);
      },
    );

    if (mounted) {
      if (result.success) {
        setState(() {
          _syncStatus = result.message;
          _isLoading = false;
        });

        // Clear status after delay
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _syncStatus = null);
        });
      } else {
        setState(() {
          _syncStatus = '❌ ${result.message}';
          _isLoading = false;
        });

        // Clear error status after longer delay
        Future.delayed(const Duration(seconds: 5), () {
          if (mounted) setState(() => _syncStatus = null);
        });
      }
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Saída'),
        content: const Text('Tem certeza que deseja sair?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sair', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _authService.logout();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final agentName = _userData?['full_name'] ?? 'Agente';
    final agentCode = _userData?['agent_code'] ?? '';
    final marketName = _userData?['market_name'] ?? '';
    final deviceSerial = _deviceData?['serial_number'] ?? '';

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        // Dynamic color: Amber 800 when offline, Emerald 600 when online
        backgroundColor: _effectivelyOffline
            ? const Color(0xFF92400E) // Amber 800
            : const Color(0xFF059669),
        foregroundColor: Colors.white,
        title: Text(
          'Paysafe POS',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.logOut),
            onPressed: _handleLogout,
            tooltip: 'Sair',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // UNIFIED CONNECTION STATUS BANNER
            // Shows: amber offline card OR green reconnection toast OR nothing
            if (_showConnectionBanner && _isReconnectionBanner)
              // Green reconnection banner (temporary)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981), // Emerald 500
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(LucideIcons.wifi, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      _connectionBannerMessage,
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ).animate().slideY(begin: -1, end: 0, duration: 300.ms),

            // Amber offline card (persistent when offline)
            if (_effectivelyOffline && !_isReconnectionBanner)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: Colors.amber.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade400),
                ),
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.wifiOff,
                      color: Colors.amber.shade800,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Modo Offline',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.bold,
                              color: Colors.amber.shade900,
                            ),
                          ),
                          Text(
                            _isLoginModeOffline
                                ? 'Sessão offline. Dados serão sincronizados quando online.'
                                : 'Sem conexão. Usando dados em cache.',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: Colors.amber.shade800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn().slideY(begin: -0.2),
            // Sync Status Banner
            if (_syncStatus != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Row(
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: _syncStatus!.contains('Sincronizando')
                          ? CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.blue.shade600,
                            )
                          : Icon(
                              LucideIcons.checkCircle,
                              color: Colors.green.shade600,
                              size: 16,
                            ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _syncStatus!,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.blue.shade800,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(),
            // Welcome Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF10B981)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF059669).withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          LucideIcons.user,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bem-vindo,',
                              style: GoogleFonts.inter(
                                color: Colors.white70,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              agentName,
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          LucideIcons.badgeCheck,
                          color: Colors.white70,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          agentCode,
                          style: GoogleFonts.robotoMono(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (marketName.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(
                          LucideIcons.store,
                          color: Colors.white70,
                          size: 14,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            marketName,
                            style: GoogleFonts.inter(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (deviceSerial.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          LucideIcons.smartphone,
                          color: Colors.white70,
                          size: 14,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          deviceSerial,
                          style: GoogleFonts.robotoMono(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2, end: 0),

            const SizedBox(height: 32),

            // Quick Actions Title
            Text(
              'Ações Rápidas',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey[800],
              ),
            ).animate().fadeIn(delay: 200.ms),

            const SizedBox(height: 16),

            // Action Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.1,
              children: [
                _ActionCard(
                      icon: LucideIcons.banknote,
                      title: 'Novo Pagamento',
                      subtitle: 'Receber pagamento',
                      color: const Color(0xFF059669),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const PaymentScreen(),
                        ),
                      ),
                    )
                    .animate()
                    .fadeIn(delay: 300.ms)
                    .scale(begin: const Offset(0.8, 0.8)),
                _ActionCard(
                      icon: LucideIcons.history,
                      title: 'Histórico',
                      subtitle: 'Ver transações',
                      color: const Color(0xFF3B82F6),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const TransactionHistoryScreen(),
                        ),
                      ),
                    )
                    .animate()
                    .fadeIn(delay: 400.ms)
                    .scale(begin: const Offset(0.8, 0.8)),
                _ActionCard(
                      icon: LucideIcons.userPlus,
                      title: 'Registrar',
                      subtitle: 'Novo comerciante',
                      color: const Color(0xFF8B5CF6),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const MerchantRegistrationScreen(),
                        ),
                      ),
                    )
                    .animate()
                    .fadeIn(delay: 500.ms)
                    .scale(begin: const Offset(0.8, 0.8)),

                _ActionCard(
                      icon: LucideIcons.search,
                      title: 'Buscar',
                      subtitle: 'Buscar comerciante',
                      color: const Color(0xFF06B6D4),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const MerchantSearchScreen(),
                        ),
                      ),
                    )
                    .animate()
                    .fadeIn(delay: 700.ms)
                    .scale(begin: const Offset(0.8, 0.8)),

                _ActionCard(
                      icon: LucideIcons.keyRound,
                      title: 'Alterar PIN',
                      subtitle: _effectivelyOffline
                          ? 'Indisponível offline'
                          : 'Redefinir senha',
                      color: const Color(0xFFF59E0B),
                      isDisabled: _effectivelyOffline,
                      onTap: _effectivelyOffline
                          ? () => ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Alteração de PIN requer conexão com o servidor',
                                ),
                                backgroundColor: Colors.orange,
                              ),
                            )
                          : () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const PinResetScreen(),
                              ),
                            ),
                    )
                    .animate()
                    .fadeIn(delay: 600.ms)
                    .scale(begin: const Offset(0.8, 0.8)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  final bool isDisabled;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
    this.isDisabled = false,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = isDisabled ? Colors.grey : color;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDisabled ? Colors.grey.shade100 : Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon with optional lock overlay
              Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: effectiveColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: effectiveColor, size: 24),
                  ),
                  // Lock badge inside icon container
                  if (isDisabled)
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.grey.shade100,
                            width: 2,
                          ),
                        ),
                        child: Icon(
                          LucideIcons.lock,
                          size: 10,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ),
                ],
              ),
              const Spacer(),
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDisabled ? Colors.grey : Colors.grey[800],
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: isDisabled ? Colors.grey.shade400 : Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
