import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'services/inactivity_service.dart';

void main() {
  // Disable runtime font fetching for offline operation
  GoogleFonts.config.allowRuntimeFetching = false;
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Use system default font for POS devices without internet
    // GoogleFonts will gracefully fallback to system font when disabled
    return MaterialApp(
      title: 'Paysafe POS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF059669), // Emerald 600
          primary: const Color(0xFF059669),
          secondary: const Color(0xFF10B981),
        ),
        useMaterial3: true,
        // Using system default text theme for offline compatibility
        textTheme: Typography.material2021().black.apply(
          fontFamily: 'Roboto', // Android system font
        ),
        scaffoldBackgroundColor: Colors.white,
      ),
      // Named routes for navigation
      routes: {'/login': (context) => const LoginScreen()},
      home: const InactivityDetector(child: SplashScreen()),
    );
  }
}
