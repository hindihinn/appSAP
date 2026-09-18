import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../config/api_config.dart';

class ImageLoader {
  static Widget load(String? url, {double? width, double? height, BoxFit fit = BoxFit.cover}) {
    if (url == null || url.isEmpty) {
      return Container(
        width: width,
        height: height,
        color: Colors.grey[200],
        child: const Icon(Icons.image, color: Colors.grey),
      );
    }

    if (url.startsWith('data:image/') && url.contains(';base64,')) {
      try {
        final commaIndex = url.indexOf(',');
        if (commaIndex != -1) {
          final base64Str = url.substring(commaIndex + 1);
          final Uint8List bytes = base64Decode(base64Str.trim());
          return Image.memory(
            bytes,
            width: width,
            height: height,
            fit: fit,
            errorBuilder: (context, error, stackTrace) => Container(
              width: width,
              height: height,
              color: Colors.grey[200],
              child: const Icon(Icons.broken_image, color: Colors.grey),
            ),
          );
        }
      } catch (e) {
        // Fallback to error icon
      }
      return Container(
        width: width,
        height: height,
        color: Colors.grey[200],
        child: const Icon(Icons.broken_image, color: Colors.grey),
      );
    }

    final fullUrl = url.startsWith('http') ? url : '${ApiConfig.imageUrl}$url';
    return CachedNetworkImage(
      imageUrl: fullUrl,
      width: width,
      height: height,
      fit: fit,
      placeholder: (context, url) => Container(
        width: width,
        height: height,
        color: Colors.grey[100],
        child: const Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.grey),
          ),
        ),
      ),
      errorWidget: (context, url, error) => Container(
        width: width,
        height: height,
        color: Colors.grey[200],
        child: const Icon(Icons.broken_image_outlined, color: Colors.grey),
      ),
    );
  }

  static ImageProvider provider(String url) {
    if (url.startsWith('data:image/') && url.contains(';base64,')) {
      try {
        final commaIndex = url.indexOf(',');
        if (commaIndex != -1) {
          final base64Str = url.substring(commaIndex + 1);
          final Uint8List bytes = base64Decode(base64Str.trim());
          return MemoryImage(bytes);
        }
      } catch (e) {
        // Fallback
      }
    }
    final fullUrl = url.startsWith('http') ? url : '${ApiConfig.imageUrl}$url';
    return CachedNetworkImageProvider(fullUrl);
  }
}
