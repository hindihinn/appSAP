import 'package:flutter/material.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../config/api_config.dart';

class PhotoViewer extends StatelessWidget {
  final List<Map<String, String>> photos; // e.g. [{'url': '/uploads/...', 'desc': 'Depan'}]
  final int initialIndex;

  const PhotoViewer({
    super.key,
    required this.photos,
    this.initialIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          photos.isNotEmpty ? photos[initialIndex]['desc'] ?? 'Photo' : 'Photo',
          style: const TextStyle(color: Colors.white, fontSize: 16),
        ),
      ),
      body: PhotoViewGallery.builder(
        scrollPhysics: const BouncingScrollPhysics(),
        builder: (BuildContext context, int index) {
          final url = '${ApiConfig.imageUrl}${photos[index]['url']}';
          return PhotoViewGalleryPageOptions(
            imageProvider: CachedNetworkImageProvider(url),
            initialScale: PhotoViewComputedScale.contained,
            minScale: PhotoViewComputedScale.contained * 0.8,
            maxScale: PhotoViewComputedScale.covered * 2,
            heroAttributes: PhotoViewHeroAttributes(tag: photos[index]['url']!),
          );
        },
        itemCount: photos.length,
        loadingBuilder: (context, event) => const Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
        pageController: PageController(initialPage: initialIndex),
      ),
    );
  }
}
