import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../../providers/trip_provider.dart';
import '../../config/theme.dart';
import 'wo_stepper_screen.dart';

class DriverWOTasksScreen extends StatefulWidget {
  const DriverWOTasksScreen({super.key});

  @override
  State<DriverWOTasksScreen> createState() => _DriverWOTasksScreenState();
}

class _DriverWOTasksScreenState extends State<DriverWOTasksScreen> {
  Map<String, dynamic>? _activeWO;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadActiveWO();
  }

  Future<void> _loadActiveWO() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final client = context.read<TripProvider>().tripService.client;
      final res = await client.get('/services/work-orders/driver/active');
      if (res.data['success'] == true) {
        setState(() {
          _activeWO = res.data['data'];
        });
      }
    } on DioException catch (e) {
      setState(() {
        _error = e.response?.data['message'] ?? 'Gagal memuat tugas perbaikan';
      });
    } catch (e) {
      setState(() {
        _error = 'Terjadi kesalahan koneksi server';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Tugas Perbaikan', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: RefreshIndicator(
        onRefresh: _loadActiveWO,
        color: AppTheme.primary,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline_rounded, size: 64, color: Colors.orange.shade300),
                          const SizedBox(height: 16),
                          Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            onPressed: _loadActiveWO,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Coba Lagi'),
                          ),
                        ],
                      ),
                    ),
                  )
                : _activeWO == null
                    ? ListView(
                        padding: const EdgeInsets.all(24.0),
                        children: [
                          const SizedBox(height: 60),
                          Center(
                            child: Column(
                              children: [
                                CircleAvatar(
                                  radius: 40,
                                  backgroundColor: AppTheme.success.withOpacity(0.1),
                                  child: const Icon(Icons.check_circle_outline_rounded, size: 48, color: AppTheme.success),
                                ),
                                const SizedBox(height: 20),
                                const Text(
                                  'Tidak ada tugas perbaikan aktif',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Kendaraan Anda saat ini dalam kondisi prima.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        ],
                      )
                    : ListView(
                        padding: const EdgeInsets.all(20.0),
                        children: [
                          const Text(
                            'Work Order Aktif Anda',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          ),
                          const SizedBox(height: 16),

                          // Active WO Card
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                decoration: BoxDecoration(
                                  border: Border(
                                    left: BorderSide(
                                      color: _activeWO!['status'] == 'in_progress' ? AppTheme.info : AppTheme.warning,
                                      width: 5,
                                    ),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Card Header
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                      decoration: BoxDecoration(
                                        color: _activeWO!['status'] == 'in_progress' ? AppTheme.info.withOpacity(0.08) : AppTheme.warning.withOpacity(0.08),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            _activeWO!['wo_number'],
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', color: AppTheme.textPrimary),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: _activeWO!['status'] == 'in_progress' ? AppTheme.info : AppTheme.warning,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              _activeWO!['status'] == 'in_progress' ? 'SEDANG DIPERBAIKI' : 'SIAP DIPERBAIKI',
                                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                    // Card Body
                                    Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              const Icon(Icons.build_rounded, color: AppTheme.primary, size: 20),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  'Kategori: ${_activeWO!['category'] ?? 'Perbaikan'}',
                                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 10),
                                          Row(
                                            children: [
                                              const Icon(Icons.storefront_rounded, color: AppTheme.textSecondary, size: 16),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  'Bengkel: ${_activeWO!['workshop_name'] ?? '—'}',
                                                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              const Icon(Icons.description_outlined, color: AppTheme.textSecondary, size: 16),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  'Deskripsi: ${_activeWO!['description']}',
                                                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 16),

                                          // Urgency Info card
                                          Container(
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: AppTheme.primary.withOpacity(0.08),
                                              borderRadius: BorderRadius.circular(10),
                                              border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
                                            ),
                                            child: Row(
                                              children: [
                                                const Icon(Icons.info_outline_rounded, color: AppTheme.primary, size: 18),
                                                const SizedBox(width: 8),
                                                Expanded(
                                                  child: Text(
                                                    'Prioritas: ${_activeWO!['priority']?.toUpperCase()}',
                                                    style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.bold),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(height: 20),

                                          // Action button
                                          SizedBox(
                                            width: double.infinity,
                                            height: 48,
                                            child: ElevatedButton(
                                              onPressed: () async {
                                                await Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (_) => WOStepperScreen(
                                                      woId: _activeWO!['id'],
                                                      woNumber: _activeWO!['wo_number'],
                                                      status: _activeWO!['status'],
                                                    ),
                                                  ),
                                                );
                                                _loadActiveWO();
                                              },
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: AppTheme.primaryDark,
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                              ),
                                              child: Text(
                                                _activeWO!['status'] == 'in_progress' ? 'LANJUTKAN STEPPER PERBAIKAN' : 'MULAI PERBAIKAN (MENUJU BENGKEL)',
                                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
      ),
    );
  }
}
