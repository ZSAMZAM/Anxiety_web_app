import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

class SafeImage extends StatelessWidget {
  final String? url;
  final BoxFit fit;
  final Widget fallback;

  const SafeImage({
    Key? key,
    required this.url,
    required this.fallback,
    this.fit = BoxFit.cover,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final source = url?.trim();
    if (source == null || source.isEmpty) {
      return fallback;
    }

    if (source.startsWith('data:image')) {
      final bytes = _decodeDataImage(source);
      if (bytes == null || bytes.isEmpty) {
        return fallback;
      }
      return Image.memory(
        bytes,
        fit: fit,
        errorBuilder: (_, __, ___) => fallback,
      );
    }

    return Image.network(
      source,
      fit: fit,
      errorBuilder: (_, __, ___) => fallback,
    );
  }

  Uint8List? _decodeDataImage(String source) {
    final commaIndex = source.indexOf(',');
    if (commaIndex == -1 || commaIndex == source.length - 1) {
      return null;
    }
    try {
      return base64Decode(source.substring(commaIndex + 1));
    } catch (_) {
      return null;
    }
  }
}
