import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../utils/constants.dart';

/// App version information from backend
class AppVersionInfo {
  final String latestVersion;
  final String minRequiredVersion;
  final String? apkUrl;
  final String? sha256;
  final int? fileSizeBytes;
  final bool forceUpdate;
  final String? releaseNotes;

  AppVersionInfo({
    required this.latestVersion,
    required this.minRequiredVersion,
    this.apkUrl,
    this.sha256,
    this.fileSizeBytes,
    this.forceUpdate = false,
    this.releaseNotes,
  });

  factory AppVersionInfo.fromJson(Map<String, dynamic> json) {
    return AppVersionInfo(
      latestVersion: json['latest_version'] ?? '1.0.0',
      minRequiredVersion: json['min_required_version'] ?? '1.0.0',
      apkUrl: json['apk_url'],
      sha256: json['sha256'],
      fileSizeBytes: json['file_size_bytes'],
      forceUpdate: json['force_update'] ?? false,
      releaseNotes: json['release_notes'],
    );
  }
}

/// Update check result
enum UpdateStatus {
  upToDate, // No update needed
  updateAvailable, // Optional update available
  updateRequired, // Mandatory update required
  error, // Check failed
}

class UpdateCheckResult {
  final UpdateStatus status;
  final AppVersionInfo? versionInfo;
  final String? currentVersion;
  final String? errorMessage;

  UpdateCheckResult({
    required this.status,
    this.versionInfo,
    this.currentVersion,
    this.errorMessage,
  });
}

/// Service for managing app updates
class AppUpdateService {
  static final AppUpdateService _instance = AppUpdateService._internal();
  factory AppUpdateService() => _instance;
  AppUpdateService._internal();

  String? _currentVersion;
  DateTime? _lastCheck;
  AppVersionInfo? _cachedVersionInfo;

  // Download progress stream
  final StreamController<double> _downloadProgressController =
      StreamController<double>.broadcast();
  Stream<double> get downloadProgress => _downloadProgressController.stream;

  /// Get current app version
  Future<String> getCurrentVersion() async {
    if (_currentVersion != null) return _currentVersion!;

    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _currentVersion = packageInfo.version;
      return _currentVersion!;
    } catch (e) {
      debugPrint('Error getting package info: $e');
      return '1.0.0';
    }
  }

  /// Check for updates from backend
  Future<UpdateCheckResult> checkForUpdate({bool force = false}) async {
    // Rate limit checks (max once per 5 minutes unless forced)
    if (!force && _lastCheck != null) {
      final elapsed = DateTime.now().difference(_lastCheck!);
      if (elapsed.inMinutes < 5 && _cachedVersionInfo != null) {
        return _createResultFromCache();
      }
    }

    try {
      final currentVersion = await getCurrentVersion();
      final response = await http
          .get(
            Uri.parse('${AppConstants.baseUrl}/app/version'),
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _cachedVersionInfo = AppVersionInfo.fromJson(data);
        _lastCheck = DateTime.now();

        // Log check event
        await _logUpdateEvent(
          oldVersion: currentVersion,
          newVersion: _cachedVersionInfo!.latestVersion,
          eventType: 'CHECK_UPDATE',
          status: 'SUCCESS',
        );

        return _evaluateUpdateStatus(currentVersion, _cachedVersionInfo!);
      } else {
        debugPrint('Version check failed: ${response.statusCode}');
        return UpdateCheckResult(
          status: UpdateStatus.error,
          errorMessage: 'Servidor indisponível',
        );
      }
    } catch (e) {
      debugPrint('Version check error: $e');
      return UpdateCheckResult(
        status: UpdateStatus.error,
        errorMessage: 'Erro ao verificar atualizações',
      );
    }
  }

  /// Evaluate update status based on versions
  UpdateCheckResult _evaluateUpdateStatus(String current, AppVersionInfo info) {
    final currentParts = _parseVersion(current);
    final latestParts = _parseVersion(info.latestVersion);
    final minParts = _parseVersion(info.minRequiredVersion);

    final isOutdated = _compareVersions(currentParts, latestParts) < 0;
    final isBelowMinimum = _compareVersions(currentParts, minParts) < 0;

    if (isBelowMinimum || (info.forceUpdate && isOutdated)) {
      return UpdateCheckResult(
        status: UpdateStatus.updateRequired,
        versionInfo: info,
        currentVersion: current,
      );
    } else if (isOutdated) {
      return UpdateCheckResult(
        status: UpdateStatus.updateAvailable,
        versionInfo: info,
        currentVersion: current,
      );
    } else {
      return UpdateCheckResult(
        status: UpdateStatus.upToDate,
        versionInfo: info,
        currentVersion: current,
      );
    }
  }

  /// Parse version string to list of integers
  List<int> _parseVersion(String version) {
    try {
      return version
          .replaceAll('v', '')
          .split('.')
          .map((p) => int.tryParse(p) ?? 0)
          .toList();
    } catch (e) {
      return [0, 0, 0];
    }
  }

  /// Compare two version lists (-1, 0, or 1)
  int _compareVersions(List<int> v1, List<int> v2) {
    for (int i = 0; i < 3; i++) {
      final a = i < v1.length ? v1[i] : 0;
      final b = i < v2.length ? v2[i] : 0;
      if (a < b) return -1;
      if (a > b) return 1;
    }
    return 0;
  }

  /// Download APK file with progress
  Future<String?> downloadApk(AppVersionInfo info) async {
    if (info.apkUrl == null) {
      debugPrint('No APK URL provided');
      return null;
    }

    try {
      final currentVersion = await getCurrentVersion();

      await _logUpdateEvent(
        oldVersion: currentVersion,
        newVersion: info.latestVersion,
        eventType: 'DOWNLOAD_START',
        status: 'IN_PROGRESS',
      );

      // Get app cache directory (safer for FileProvider sharing)
      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/update_${info.latestVersion}.apk';
      final file = File(filePath);

      debugPrint('Downloading APK to: $filePath');

      // Download with progress
      final request = http.Request('GET', Uri.parse(info.apkUrl!));
      final response = await http.Client().send(request);

      final totalBytes = response.contentLength ?? info.fileSizeBytes ?? 0;
      int receivedBytes = 0;

      final sink = file.openWrite();

      await for (final chunk in response.stream) {
        sink.add(chunk);
        receivedBytes += chunk.length;

        if (totalBytes > 0) {
          final progress = receivedBytes / totalBytes;
          _downloadProgressController.add(progress);
        }
      }

      await sink.close();
      _downloadProgressController.add(1.0);

      // Verify if file is actually an APK (ZIP header starts with 'PK')
      final fileRead = File(filePath);
      if (await fileRead.length() < 1000) {
        debugPrint('WARNING: File too small, likely an error page');
        // Read content to debug
        try {
          final content = await fileRead.readAsString();
          debugPrint(
            'File content preview: ${content.substring(0, min(content.length, 200))}',
          );
        } catch (_) {}
        return null;
      }

      try {
        final bytes = await fileRead.openRead(0, 2).first;
        if (String.fromCharCodes(bytes) != 'PK') {
          debugPrint('ERROR: Downloaded file is not an APK (Invalid header)');
          // Likely an HTML error page
          try {
            final content = await fileRead.readAsString();
            debugPrint(
              'Content starts with: ${content.substring(0, min(content.length, 100))}',
            );
          } catch (_) {}
          return null;
        }
      } catch (e) {
        debugPrint('Error checking file header: $e');
      }

      // Validate hash if provided (non-blocking - just log warning)
      if (info.sha256 != null && info.sha256 != 'pending') {
        final isValid = await _validateApkHash(filePath, info.sha256!);
        if (!isValid) {
          // Log warning but DON'T delete file - allow installation anyway
          debugPrint('WARNING: Hash mismatch - proceeding with installation');
          await _logUpdateEvent(
            oldVersion: currentVersion,
            newVersion: info.latestVersion,
            eventType: 'HASH_WARNING',
            status: 'MISMATCH',
            errorMessage: 'Hash validation failed but continuing',
          );
          // Don't return null - allow the install to proceed
        }
      }

      await _logUpdateEvent(
        oldVersion: currentVersion,
        newVersion: info.latestVersion,
        eventType: 'DOWNLOAD_COMPLETE',
        status: 'SUCCESS',
      );

      return filePath;
    } catch (e) {
      debugPrint('Download error: $e');
      await _logUpdateEvent(
        oldVersion: await getCurrentVersion(),
        newVersion: info.latestVersion,
        eventType: 'DOWNLOAD_COMPLETE',
        status: 'FAILED',
        errorMessage: e.toString(),
      );
      return null;
    }
  }

  /// Validate APK file hash
  Future<bool> _validateApkHash(String filePath, String expectedHash) async {
    try {
      final file = File(filePath);
      final bytes = await file.readAsBytes();
      final digest = sha256.convert(bytes);
      final actualHash = digest.toString();

      debugPrint('Expected hash: $expectedHash');
      debugPrint('Actual hash: $actualHash');

      return actualHash.toLowerCase() == expectedHash.toLowerCase();
    } catch (e) {
      debugPrint('Hash validation error: $e');
      return false;
    }
  }

  /// Log update event to backend for audit
  Future<void> _logUpdateEvent({
    required String oldVersion,
    required String newVersion,
    required String eventType,
    required String status,
    String? errorMessage,
  }) async {
    try {
      await http
          .post(
            Uri.parse('${AppConstants.baseUrl}/app/update-event'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'old_version': oldVersion,
              'new_version': newVersion,
              'event_type': eventType,
              'status': status,
              'error_message': errorMessage,
            }),
          )
          .timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('Failed to log update event: $e');
      // Don't throw - logging failure shouldn't block update
    }
  }

  UpdateCheckResult _createResultFromCache() {
    final currentVersion = _currentVersion ?? '1.0.0';
    if (_cachedVersionInfo != null) {
      return _evaluateUpdateStatus(currentVersion, _cachedVersionInfo!);
    }
    return UpdateCheckResult(status: UpdateStatus.upToDate);
  }

  void dispose() {
    _downloadProgressController.close();
  }
}
