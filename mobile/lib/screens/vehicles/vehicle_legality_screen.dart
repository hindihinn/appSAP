import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../services/vehicle_service.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import '../../widgets/app_drawer.dart';

class VehicleLegalityScreen extends StatefulWidget {
  const VehicleLegalityScreen({super.key});

  @override
  State<VehicleLegalityScreen> createState() => _VehicleLegalityScreenState();
}

class _VehicleLegalityScreenState extends State<VehicleLegalityScreen> {
  late final VehicleService _vehicleService;
  List<dynamic> _legalities = [];
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _vehicleService = VehicleService(ApiService());
    _loadLegalities();
  }

  Future<void> _loadLegalities() async {
    setState(() { _isLoading = true; _error = ''; });
    try {
      final result = await _vehicleService.getVehicleLegality(0); // 0 or omit to get all
      if (result['success']) {
        setState(() { _legalities = result['data']; });
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
        title: const Text('Legalitas Kendaraan', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? Center(child: Text(_error, style: const TextStyle(color: AppTheme.danger)))
              : RefreshIndicator(
                  onRefresh: _loadLegalities,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _legalities.length,
                    itemBuilder: (context, index) {
                      final item = _legalities[index];
                      return _buildLegalityCard(item);
                    },
                  ),
                ),
    );
  }

  Widget _buildLegalityCard(dynamic item) {
    final expiryDate = item['expiry_date'] != null ? DateTime.parse(item['expiry_date']) : null;
    final now = DateTime.now();
    final daysLeft = expiryDate != null ? expiryDate.difference(now).inDays : 0;
    
    Color statusColor;
    String statusText;

    if (item['status'] == 'inactive') {
      statusColor = AppTheme.textMuted;
      statusText = 'Nonaktif';
    } else if (daysLeft < 0) {
      statusColor = AppTheme.danger;
      statusText = 'Expired';
    } else if (daysLeft <= (item['reminder_days'] ?? 30)) {
      statusColor = AppTheme.warning;
      statusText = 'Mendekati Expired ($daysLeft hari)';
    } else {
      statusColor = AppTheme.success;
      statusText = 'Aktif ($daysLeft hari)';
    }

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
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(
                color: statusColor,
                width: 5,
              ),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        (item['type'] ?? '').toUpperCase(),
                        style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 11),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(color: statusColor, fontWeight: FontWeight.w800, fontSize: 11),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '${item['nopol']} • ${item['merk']} ${item['model'] ?? ''}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 4),
                Text(
                  'No. Dokumen: ${item['document_number']}',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 14, color: AppTheme.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      'Berlaku s/d: ${expiryDate != null ? DateFormat('dd MMM yyyy').format(expiryDate) : '-'}',
                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
