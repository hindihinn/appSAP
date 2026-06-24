import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../providers/vehicle_provider.dart';
import '../config/theme.dart';
import '../config/routes.dart';
import '../widgets/app_bottom_menu.dart';
import 'trips/active_trip_stepper_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    final user = context.read<AuthProvider>().user;
    if (user?.roleId == 5) {
      // Driver
      await context.read<TripProvider>().fetchMyTrips(user!.id);
    } else if (user?.roleId == 4) {
      // Gudang
      await context.read<VehicleProvider>().fetchVehicles();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: AppTheme.primaryDark,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => const AppBottomMenu(),
          );
        },
        backgroundColor: AppTheme.primaryDark,
        elevation: 4,
        icon: const Icon(Icons.apps_rounded, color: Colors.white),
        label: const Text('MENU', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppTheme.primary,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            _buildWelcomeCard(user),
            const SizedBox(height: 24),
            
            if (user?.roleId == 5) _buildDriverDashboard(context),
            if (user?.roleId == 4) _buildGudangDashboard(context),
            if (user?.roleId != 4 && user?.roleId != 5) _buildGenericDashboard(),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeCard(user) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primaryDark, AppTheme.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Selamat datang,', style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(
                    user?.name ?? 'User',
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              CircleAvatar(
                radius: 24,
                backgroundColor: Colors.white.withOpacity(0.2),
                child: const Icon(Icons.person, color: Colors.white, size: 28),
              )
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              (user?.roleDisplayName ?? 'Staff').toUpperCase(),
              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildDriverDashboard(BuildContext context) {
    final tripProvider = context.watch<TripProvider>();
    final activeTrips = tripProvider.trips.where((t) => t.status == 'approved' || t.status == 'in_progress').toList();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Tugas Saat Ini', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
        const SizedBox(height: 16),
        
        if (activeTrips.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            width: double.infinity,
            child: Column(
              children: [
                Icon(Icons.check_circle_outline, size: 64, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                const Text('Tidak ada tugas aktif', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey)),
                const Text('Anda sedang standby', style: TextStyle(color: Colors.grey)),
              ],
            ),
          )
        else
          ...activeTrips.map((trip) {
            bool isInProgress = trip.status == 'in_progress';
            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isInProgress ? AppTheme.accent : Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isInProgress ? AppTheme.accent.withOpacity(0.1) : Colors.grey.shade50,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(trip.orderNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isInProgress ? AppTheme.accent : Colors.orange,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            isInProgress ? 'DALAM PERJALANAN' : 'SIAP BERANGKAT',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        )
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.location_on, color: AppTheme.primary, size: 20),
                            const SizedBox(width: 8),
                            Expanded(child: Text(trip.destination, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.inventory_2, color: Colors.grey, size: 16),
                            const SizedBox(width: 8),
                            Expanded(child: Text(trip.itemsDescription ?? 'Bongkar Muatan', style: TextStyle(color: Colors.grey.shade700))),
                          ],
                        ),
                        const SizedBox(height: 16),
                        
                        // Mini Next Action Card
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.blue.shade100),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.info_outline, color: Colors.blue, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  isInProgress ? 'Checkpoint Selanjutnya: Update Lokasi / BBM / Tiba' : 'Checkpoint Pertama: Input KM Keberangkatan',
                                  style: const TextStyle(color: Colors.blue, fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        ),
                        
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => ActiveTripStepperScreen(tripId: trip.id)),
                              ).then((_) => _loadData());
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            child: Text(isInProgress ? 'LANJUTKAN PERJALANAN' : 'MULAI PERJALANAN', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        )
                      ],
                    ),
                  )
                ],
              ),
            );
          }).toList()
      ],
    );
  }

  Widget _buildGudangDashboard(BuildContext context) {
    final vehicleProvider = context.watch<VehicleProvider>();
    final vehicles = vehicleProvider.vehicles;
    
    final standbyVehicles = vehicles.where((v) => v.status == 'available').toList();
    final dinasVehicles = vehicles.where((v) => v.status == 'in_use').toList();
    final maintenanceVehicles = vehicles.where((v) => v.status == 'maintenance').toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Status Armada', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _buildGudangStat(context, 'Standby', standbyVehicles, Icons.check_circle, Colors.green)),
            const SizedBox(width: 12),
            Expanded(child: _buildGudangStat(context, 'Jalan', dinasVehicles, Icons.local_shipping, Colors.orange)),
            const SizedBox(width: 12),
            Expanded(child: _buildGudangStat(context, 'Service', maintenanceVehicles, Icons.build, Colors.red)),
          ],
        ),
        const SizedBox(height: 32),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
            ],
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.add_box, size: 48, color: AppTheme.primary),
              ),
              const SizedBox(height: 16),
              const Text('Buat Order Pengiriman', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Pesan unit kendaraan untuk operasional', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pushNamed(context, AppRoutes.createOrder).then((_) => _loadData());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('BUAT ORDER SEKARANG', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              )
            ],
          ),
        )
      ],
    );
  }

  Widget _buildGudangStat(BuildContext context, String title, List<dynamic> items, IconData icon, Color color) {
    return GestureDetector(
      onLongPress: () {
        _showVehicleList(context, title, items, color);
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
          boxShadow: [
            BoxShadow(color: color.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
          ],
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(items.length.toString(), style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  void _showVehicleList(BuildContext context, String label, List<dynamic> items, Color color) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4)))),
              const SizedBox(height: 16),
              Text('Daftar Unit $label', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
              const Divider(height: 24),
              if (items.isEmpty)
                const Padding(padding: EdgeInsets.all(16), child: Center(child: Text('Tidak ada unit')))
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: items.length,
                    itemBuilder: (c, i) {
                      final v = items[i];
                      return ListTile(
                        leading: Icon(Icons.directions_car, color: color),
                        title: Text(v.nopol, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${v.merk} ${v.model} - ${v.companyName ?? ''}'),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildGenericDashboard() {
    return const Center(child: Text('Dashboard for other roles'));
  }
}
