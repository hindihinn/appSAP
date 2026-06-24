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
        appBar: AppBar(
          title: const Text('Tugas Perjalanan'),
          elevation: 0,
          backgroundColor: AppTheme.primaryDark,
          bottom: const TabBar(
            indicatorColor: Colors.white,
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
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: isActive ? () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => ActiveTripStepperScreen(tripId: trip.id)),
                ).then((_) => _loadTrips());
              } : null,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          trip.orderNumber,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: trip.status == 'in_progress' ? Colors.blue.shade100 : Colors.orange.shade100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            trip.status.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: trip.status == 'in_progress' ? Colors.blue.shade800 : Colors.orange.shade800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      trip.destination,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      trip.purpose,
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const Divider(height: 24),
                    Row(
                      children: [
                        const Icon(Icons.directions_car, size: 16, color: Colors.grey),
                        const SizedBox(width: 8),
                        Text(trip.nopol ?? '-'),
                        const Spacer(),
                        const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                        const SizedBox(width: 8),
                        Text(
                          trip.plannedDeparture != null
                              ? DateFormat('dd MMM yyyy').format(DateTime.parse(trip.plannedDeparture!))
                              : '-',
                        ),
                      ],
                    ),
                    if (isActive) ...[
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => ActiveTripStepperScreen(tripId: trip.id)),
                            ).then((_) => _loadTrips());
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                          child: const Text('Mulai / Lanjutkan Tugas'),
                        ),
                      )
                    ]
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
