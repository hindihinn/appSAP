import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../config/routes.dart';
import '../../providers/auth_provider.dart';
import '../../providers/trip_provider.dart';
import 'active_trip_stepper_screen.dart';

class DriverTasksScreen extends StatefulWidget {
  const DriverTasksScreen({super.key});

  @override
  State<DriverTasksScreen> createState() => _DriverTasksScreenState();
}

class _DriverTasksScreenState extends State<DriverTasksScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTrips();
    });
  }

  Future<void> _loadTrips() async {
    final driverId = context.read<AuthProvider>().user?.id; // Assuming user.id == driver_id for simplicity (in a real app, you'd map user_id -> drivers.id)
    if (driverId != null) {
      await context.read<TripProvider>().fetchMyTrips(driverId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TripProvider>();
    final trips = provider.trips;
    
    // Filter trips that need attention
    final activeTrips = trips.where((t) => t.status == 'approved' || t.status == 'in_progress').toList();
    final historyTrips = trips.where((t) => t.status == 'completed').toList();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          title: const Text('Tugas Perjalanan', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
          elevation: 0,
          backgroundColor: Colors.white,
          iconTheme: const IconThemeData(color: AppTheme.textPrimary),
          bottom: const TabBar(
            indicatorColor: AppTheme.primary,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.textSecondary,
            labelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            tabs: [
              Tab(text: 'Tugas Aktif'),
              Tab(text: 'Riwayat Selesai'),
            ],
          ),
        ),
        body: provider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [
                  _buildList(activeTrips, isActive: true),
                  _buildList(historyTrips, isActive: false),
                ],
              ),
      ),
    );
  }

  Widget _buildList(List trips, {required bool isActive}) {
    if (trips.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isActive ? Icons.local_shipping_outlined : Icons.history, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              isActive ? 'Belum ada tugas aktif' : 'Belum ada riwayat',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTrips,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: trips.length,
        itemBuilder: (context, index) {
          final trip = trips[index];
          bool isInProgress = trip.status == 'in_progress';
          Color accentColor = isInProgress ? AppTheme.info : AppTheme.warning;

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Container(
                decoration: BoxDecoration(
                  border: Border(
                    left: BorderSide(
                      color: accentColor,
                      width: 5,
                    ),
                  ),
                ),
                child: InkWell(
                  onTap: isActive ? () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => ActiveTripStepperScreen(tripId: trip.id)),
                    ).then((_) => _loadTrips());
                  } : null,
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              trip.spdNumber ?? trip.orderNumber,
                              style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.primary, fontSize: 15),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: accentColor.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                trip.statusLabel,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: accentColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          trip.destination,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          trip.purpose,
                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                        ),
                        const Divider(height: 28, color: Color(0xFFE2E8F0)),
                        Row(
                          children: [
                            const Icon(Icons.local_shipping_outlined, size: 16, color: AppTheme.textMuted),
                            const SizedBox(width: 8),
                            Text(trip.nopol ?? '-', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                            const Spacer(),
                            const Icon(Icons.calendar_today_outlined, size: 16, color: AppTheme.textMuted),
                            const SizedBox(width: 8),
                            Text(
                              trip.plannedDeparture != null
                                  ? DateFormat('dd MMM yyyy').format(DateTime.parse(trip.plannedDeparture!))
                                  : '-',
                              style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                        if (isActive) ...[
                          const SizedBox(height: 18),
                          SizedBox(
                            width: double.infinity,
                            height: 44,
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => ActiveTripStepperScreen(tripId: trip.id)),
                                ).then((_) => _loadTrips());
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primary,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                              ),
                              child: const Text('Mulai / Lanjutkan Tugas', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          )
                        ]
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
