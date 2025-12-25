import 'package:flutter/material.dart';

/// App typography that works offline without downloading fonts.
/// Uses system fonts (Roboto on Android) for all text styles.
class AppTypography {
  static TextStyle inter({
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    FontStyle? fontStyle,
    double? letterSpacing,
    double? height,
    TextDecoration? decoration,
  }) {
    return TextStyle(
      fontFamily: 'Roboto', // Android default, iOS will auto-fallback to SF Pro
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      fontStyle: fontStyle,
      letterSpacing: letterSpacing,
      height: height,
      decoration: decoration,
    );
  }
}
