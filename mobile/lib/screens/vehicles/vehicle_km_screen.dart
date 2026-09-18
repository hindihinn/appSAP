import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../widgets/image_loader.dart';
import '../../services/vehicle_service.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../widgets/app_drawer.dart';

class VehicleKmScreen extends StatefulWidget {
  const VehicleKmScreen({super.key});

  @override
  State<VehicleKmScreen> createState() => _VehicleKmScreenState();
}

class _VehicleKmScreenState extends State<VehicleKmScreen> {
  late final VehicleService _vehicleService;
  List<dynamic> _kmLogs = [];
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _vehicleService = VehicleService(ApiService());
    _loadKmLogs();
  }

  Future<void> _loadKmLogs() async {
    setState(() { _isLoading = true; _error = ''; });
    try {
      final result = await _vehicleService.getVehicleKmLogs(0); // 0 or omit to get all
      if (result['success']) {
        setState(() { _kmLogs = result['data']; });
      } else {
        setState(() { _error = result['message']; });
      }
    } catch (e) {
      setState(() { _error = 'Failed to load data'; });
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Monitoring KM', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_outlined, color: AppTheme.textPrimary),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Input KM coming soon')));
            },
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? Center(child: Text(_error, style: const TextStyle(color: AppTheme.danger)))
              : RefreshIndicator(
                  onRefresh: _loadKmLogs,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _kmLogs.length,
                    itemBuilder: (context, index) {
                      final log = _kmLogs[index];
                      return _buildKmCard(log);
                    },
                  ),
                ),
    );
  }

  Widget _buildKmCard(dynamic log) {
    final recordedDate = log['recorded_date'] != null ? DateTime.parse(log['recorded_date']) : null;
    final kmDiff = (log['km_reading'] ?? 0) - (log['previous_km'] ?? 0);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.01), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.speed_rounded, color: AppTheme.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        log['nopol'] ?? '-',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                      ),
                      Text(
                        recordedDate != null ? DateFormat('dd MMM, HH:mm').format(recordedDate) : '-',
                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${log['merk'] ?? ''}',
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text(
                        '${NumberFormat('#,###').format(log['km_reading'] ?? 0)} km',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppTheme.primary),
                      ),
                      if (kmDiff > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.success.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '+${NumberFormat('#,###').format(kmDiff)}',
                            style: const TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ]
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.person_outline_rounded, size: 14, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        log['recorded_by_name'] ?? 'System',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(width: 12),
                      const Icon(Icons.source_outlined, size: 14, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        (log['source'] ?? '').toUpperCase(),
                        style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (log['photo'] != null) ...[
              const SizedBox(width: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: ImageLoader.load(
                  log['photo'],
                  width: 60,
                  height: 60,
                  fit: BoxFit.cover,
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
