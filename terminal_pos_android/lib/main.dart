import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'services/inactivity_service.dart';

void main() {
  // Disable runtime font fetching for offline operation
  // Allow runtime font fetching to fix missing asset errors
  GoogleFonts.config.allowRuntimeFetching = true;
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
        textTheme: Typography.material2021().black
            .apply(
              fontFamily: 'Roboto', // Android system font
            )
            .copyWith(
              // Reduce global font sizes to prevent overflow
              bodyLarge: const TextStyle(fontSize: 14), // Was ~16
              bodyMedium: const TextStyle(fontSize: 13), // Was ~14
              titleMedium: const TextStyle(fontSize: 14), // Was ~16
              titleSmall: const TextStyle(fontSize: 13), // Was ~14
              labelLarge: const TextStyle(fontSize: 13), // Button text
            ),
        // Reduce input field height and text size
        inputDecorationTheme: const InputDecorationTheme(
          isDense: true,
          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          labelStyle: TextStyle(fontSize: 13),
          hintStyle: TextStyle(fontSize: 13),
        ),
        scaffoldBackgroundColor: Colors.white,
      ),
      // Named routes for navigation
      routes: {'/login': (context) => const LoginScreen()},
      // Wrap the entire Navigator with InactivityDetector using builder
      builder: (context, child) {
        return InactivityDetector(child: child!);
      },
      home: const SplashScreen(),
    );
  }
}
