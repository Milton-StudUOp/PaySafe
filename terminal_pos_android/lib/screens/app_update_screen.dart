import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/app_update_service.dart';

/// Screen shown when an app update is available or required
class AppUpdateScreen extends StatefulWidget {
  final UpdateCheckResult updateResult;
  final VoidCallback? onSkip; // Only for optional updates

  const AppUpdateScreen({super.key, required this.updateResult, this.onSkip});

  @override
  State<AppUpdateScreen> createState() => _AppUpdateScreenState();
}

class _AppUpdateScreenState extends State<AppUpdateScreen> {
  final AppUpdateService _updateService = AppUpdateService();
  static const _installerChannel = MethodChannel('com.paysafe.pos/installer');

  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String _statusMessage = '';
  bool _downloadComplete = false;
  bool _installTriggered = false;

  bool get _isRequired =>
      widget.updateResult.status == UpdateStatus.updateRequired;

  @override
  void initState() {
    super.initState();
    _updateService.downloadProgress.listen((progress) {
      setState(() {
        _downloadProgress = progress;
      });
    });
  }

  Future<void> _startUpdate() async {
    if (_isDownloading) return;

    setState(() {
      _isDownloading = true;
      _statusMessage = 'A descarregar atualização...';
      _downloadProgress = 0.0;
    });

    final versionInfo = widget.updateResult.versionInfo;
    if (versionInfo == null) {
      setState(() {
        _isDownloading = false;
        _statusMessage = 'Informação de versão indisponível';
      });
      return;
    }

    final apkPath = await _updateService.downloadApk(versionInfo);

    if (apkPath != null) {
      setState(() {
        _downloadComplete = true;
        _statusMessage = 'Download concluído. A instalar...';
      });

      // Trigger native installation
      await _installApk(apkPath);
    } else {
      setState(() {
        _isDownloading = false;
        _statusMessage = 'Erro ao descarregar. Tente novamente.';
      });
    }
  }

  Future<void> _installApk(String path) async {
    setState(() {
      _statusMessage = 'A abrir instalador...';
    });

    try {
      // Call native Android installer via MethodChannel
      final result = await _installerChannel.invokeMethod('installApk', {
        'filePath': path,
      });

      if (result == true) {
        setState(() {
          _installTriggered = true;
          _statusMessage = 'Instalador aberto. Siga as instruções no ecrã.';
        });
      } else {
        setState(() {
          _statusMessage = 'Erro ao abrir instalador.';
          _isDownloading = false;
        });
      }
    } on PlatformException catch (e) {
      debugPrint('Install error: ${e.message}');
      setState(() {
        _statusMessage = 'Erro: ${e.message ?? "Falha ao instalar"}';
        _isDownloading = false;
      });
    } catch (e) {
      debugPrint('Install error: $e');
      setState(() {
        _statusMessage = 'Erro ao instalar: $e';
        _isDownloading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => !_isRequired, // Block back if required
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),

                // Icon
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: _isRequired
                          ? [Colors.orange, Colors.red]
                          : [Colors.blue, Colors.purple],
                    ),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Icon(
                    _isRequired
                        ? LucideIcons.alertTriangle
                        : LucideIcons.download,
                    size: 48,
                    color: Colors.white,
                  ),
                ).animate().scale(duration: 500.ms, curve: Curves.elasticOut),

                const SizedBox(height: 32),

                // Title
                Text(
                  _isRequired
                      ? 'Atualização Obrigatória'
                      : 'Nova Versão Disponível',
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ).animate().fadeIn(delay: 200.ms),

                const SizedBox(height: 16),

                // Version info
                Text(
                  'Versão ${widget.updateResult.versionInfo?.latestVersion ?? "?"}',
                  style: GoogleFonts.inter(fontSize: 16, color: Colors.white70),
                ).animate().fadeIn(delay: 300.ms),

                const SizedBox(height: 8),

                Text(
                  'Versão atual: ${widget.updateResult.currentVersion ?? "?"}',
                  style: GoogleFonts.inter(fontSize: 14, color: Colors.white54),
                ).animate().fadeIn(delay: 400.ms),

                const SizedBox(height: 24),

                // Release notes
                if (widget.updateResult.versionInfo?.releaseNotes != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      widget.updateResult.versionInfo!.releaseNotes!,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white70,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ).animate().fadeIn(delay: 500.ms),

                const SizedBox(height: 32),

                // Progress indicator
                if (_isDownloading) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Text(
                          _statusMessage,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: _downloadProgress,
                            minHeight: 8,
                            backgroundColor: Colors.white.withOpacity(0.1),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _downloadComplete ? Colors.green : Colors.blue,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${(_downloadProgress * 100).toInt()}%',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const Spacer(),

                // Actions
                if (!_isDownloading) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _startUpdate,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Text(
                        'Atualizar Agora',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ).animate().fadeIn(delay: 600.ms),

                  if (!_isRequired && widget.onSkip != null) ...[
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: widget.onSkip,
                      child: Text(
                        'Mais tarde',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: Colors.white54,
                        ),
                      ),
                    ),
                  ],
                ],

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
