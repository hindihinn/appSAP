import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/vehicle_provider.dart';
import '../../config/theme.dart';
import '../../widgets/app_drawer.dart';
import 'vehicle_detail_screen.dart';

class VehicleListScreen extends StatefulWidget {
  const VehicleListScreen({super.key});

  @override
  State<VehicleListScreen> createState() => _VehicleListScreenState();
}

class _VehicleListScreenState extends State<VehicleListScreen> {
  String _filterStatus = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VehicleProvider>().fetchVehicles();
    });
  }

  void _onFilterChanged(String status) {
    setState(() {
      _filterStatus = status;
    });
    context.read<VehicleProvider>().fetchVehicles(status: status.isEmpty ? null : status);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<VehicleProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Unit Kendaraan', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list_rounded, color: AppTheme.textPrimary),
            onSelected: _onFilterChanged,
            itemBuilder: (context) => [
              const PopupMenuItem(value: '', child: Text('Semua Status')),
              const PopupMenuItem(value: 'available', child: Text('Tersedia')),
              const PopupMenuItem(value: 'in_use', child: Text('Digunakan')),
              const PopupMenuItem(value: 'maintenance', child: Text('Maintenance')),
              const PopupMenuItem(value: 'inactive', child: Text('Nonaktif')),
            ],
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : provider.error.isNotEmpty
              ? Center(child: Text(provider.error, style: const TextStyle(color: AppTheme.danger)))
              : RefreshIndicator(
                  onRefresh: () => provider.fetchVehicles(status: _filterStatus.isEmpty ? null : _filterStatus),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.vehicles.length,
                    itemBuilder: (context, index) {
                      final vehicle = provider.vehicles[index];
                      return _buildVehicleCard(vehicle, context);
                    },
                  ),
                ),
    );
  }

  Widget _buildVehicleCard(vehicle, BuildContext context) {
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => VehicleDetailScreen(vehicle: vehicle)),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.local_shipping_outlined, color: AppTheme.primary, size: 26),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${vehicle.merk} ${vehicle.model ?? ''}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        vehicle.nopol,
                        style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
