import 'package:flutter/material.dart';
import '../../widgets/image_loader.dart';
import '../../models/vehicle.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../widgets/photo_viewer.dart';

class VehicleDetailScreen extends StatelessWidget {
  final Vehicle vehicle;

  const VehicleDetailScreen({super.key, required this.vehicle});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusLabel;
    switch (vehicle.status) {
      case 'available':
        statusColor = AppTheme.success;
        statusLabel = 'Tersedia';
        break;
      case 'in_use':
        statusColor = AppTheme.info;
        statusLabel = 'Digunakan';
        break;
      case 'maintenance':
        statusColor = AppTheme.warning;
        statusLabel = 'Maintenance';
        break;
      default:
        statusColor = AppTheme.danger;
        statusLabel = 'Nonaktif';
    }

    final List<Map<String, String>> photos = [];
    if (vehicle.photoFront != null) photos.add({'url': vehicle.photoFront!, 'desc': 'Tampak Depan'});
    if (vehicle.photoBack != null) photos.add({'url': vehicle.photoBack!, 'desc': 'Tampak Belakang'});
    if (vehicle.photoLeft != null) photos.add({'url': vehicle.photoLeft!, 'desc': 'Tampak Kiri'});
    if (vehicle.photoRight != null) photos.add({'url': vehicle.photoRight!, 'desc': 'Tampak Kanan'});

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Detail Kendaraan', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: AppTheme.textPrimary),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Edit coming soon')));
            },
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryDark, Color(0xFF1E3A8A), AppTheme.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withOpacity(0.2),
                    blurRadius: 15,
                    offset: const Offset(0, 8),
                  )
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.local_shipping_outlined, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${vehicle.merk} ${vehicle.model ?? ''}',
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${vehicle.nopol} ${vehicle.vehicleCode != null ? '• ${vehicle.vehicleCode}' : ''}',
                          style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.25),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      statusLabel,
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Photos
            if (photos.isNotEmpty) ...[
              _buildSectionTitle('Foto Kendaraan', Icons.camera_alt_outlined),
              const SizedBox(height: 12),
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: photos.length,
                  itemBuilder: (context, index) {
                    final photo = photos[index];
                    return GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PhotoViewer(photos: photos, initialIndex: index),
                          ),
                        );
                      },
                      child: Container(
                        width: 160,
                        margin: const EdgeInsets.only(right: 12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFe2e8f0)),
                        ),
                        clipBehavior: Clip.hardEdge,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            ImageLoader.load(
                              photo['url'],
                              fit: BoxFit.cover,
                            ),
                            Positioned(
                              bottom: 0,
                              left: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                                color: Colors.black.withOpacity(0.6),
                                child: Text(
                                  photo['desc']!,
                                  style: const TextStyle(color: Colors.white, fontSize: 11),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Identitas & Organisasi
            _buildSectionTitle('Identitas & Organisasi', Icons.badge_outlined),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildDetailRow('Kode', vehicle.vehicleCode ?? '-'),
                    const Divider(),
                    _buildDetailRow('No. Polisi', vehicle.nopol),
                    const Divider(),
                    _buildDetailRow('PT', vehicle.companyName ?? '-'),
                    const Divider(),
                    _buildDetailRow('Unit', vehicle.unitName ?? '-'),
                    const Divider(),
                    _buildDetailRow('Kepemilikan', vehicle.ownership.toUpperCase()),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Spesifikasi
            _buildSectionTitle('Spesifikasi Teknis', Icons.settings_outlined),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildDetailRow('Tipe', vehicle.type.toUpperCase()),
                    const Divider(),
                    _buildDetailRow('Merk/Model', '${vehicle.merk} ${vehicle.model ?? ''}'),
                    const Divider(),
                    _buildDetailRow('Tahun', vehicle.year?.toString() ?? '-'),
                    const Divider(),
                    _buildDetailRow('Warna', vehicle.color ?? '-'),
                    const Divider(),
                    _buildDetailRow('Kapasitas', vehicle.capacityTon != null ? '${vehicle.capacityTon} Ton' : '-'),
                    const Divider(),
                    _buildDetailRow('BBM', vehicle.fuelType?.toUpperCase() ?? '-'),
                    const Divider(),
                    _buildDetailRow('KM Saat Ini', '${vehicle.currentKm.toStringAsFixed(0)} km'),
                  ],
                ),
              ),
            ),
            
            if (vehicle.notes != null && vehicle.notes!.isNotEmpty) ...[
              const SizedBox(height: 24),
              _buildSectionTitle('Catatan', Icons.note_alt_outlined),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    vehicle.notes!,
                    style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary, height: 1.5),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.primary),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(fontSize: 14, color: AppTheme.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
