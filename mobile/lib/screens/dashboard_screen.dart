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
      await Future.wait([
        context.read<VehicleProvider>().fetchVehicles(),
        context.read<TripProvider>().fetchMyOrders(user!.id),
      ]);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Dashboard', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        elevation: 0,
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, color: AppTheme.textPrimary),
            onPressed: () {},
          ),
          IconButton(
            tooltip: 'Pengaturan API Server',
            icon: const Icon(Icons.dns_outlined, color: AppTheme.textPrimary),
            onPressed: () async {
              final messenger = ScaffoldMessenger.of(context);
              final changed = await Navigator.pushNamed(context, AppRoutes.apiSettings);
              if (changed == true) {
                messenger.showSnackBar(
                  SnackBar(
                    content: const Text('🔄 URL API diperbarui. Request berikutnya pakai IP baru.'),
                    backgroundColor: AppTheme.primary,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                );
              }
            },
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
            color: AppTheme.primary.withOpacity(0.25),
            blurRadius: 20,
            offset: const Offset(0, 10),
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
                  Text('Selamat datang,', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(
                    user?.name ?? 'User',
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                  ),
                ],
              ),
              CircleAvatar(
                radius: 26,
                backgroundColor: Colors.white.withOpacity(0.15),
                child: const Icon(Icons.person_outline_rounded, color: Colors.white, size: 28),
              )
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Text(
              (user?.roleDisplayName ?? 'Staff').toUpperCase(),
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1),
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
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            width: double.infinity,
            child: Column(
              children: [
                Icon(Icons.check_circle_outline_rounded, size: 64, color: AppTheme.success.withOpacity(0.5)),
                const SizedBox(height: 16),
                const Text('Tidak ada tugas aktif', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                const SizedBox(height: 4),
                const Text('Status Anda saat ini sedang standby', style: TextStyle(color: AppTheme.textSecondary)),
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
                        color: isInProgress ? AppTheme.info : AppTheme.warning,
                        width: 5,
                      ),
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: isInProgress ? AppTheme.info.withOpacity(0.08) : AppTheme.warning.withOpacity(0.08),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(trip.spdNumber ?? trip.orderNumber, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isInProgress ? AppTheme.info : AppTheme.warning,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                isInProgress ? 'DALAM PERJALANAN' : 'SIAP BERANGKAT',
                                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
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
                                const Icon(Icons.location_on_rounded, color: AppTheme.primary, size: 20),
                                const SizedBox(width: 8),
                                Expanded(child: Text(trip.destination, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary))),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.inventory_2_outlined, color: AppTheme.textSecondary, size: 16),
                                const SizedBox(width: 8),
                                Expanded(child: Text(trip.itemsDescription ?? 'Bongkar Muatan', style: const TextStyle(color: AppTheme.textSecondary))),
                              ],
                            ),
                            const SizedBox(height: 16),
                            
                            // Mini Next Action Card
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.info_outline_rounded, color: AppTheme.primary, size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      isInProgress ? 'Checkpoint Selanjutnya: Update Lokasi / BBM / Tiba' : 'Checkpoint Pertama: Input KM Keberangkatan',
                                      style: const TextStyle(color: AppTheme.primary, fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: ElevatedButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => ActiveTripStepperScreen(tripId: trip.id)),
                                  ).then((_) => _loadData());
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primary,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  elevation: 0,
                                ),
                                child: Text(isInProgress ? 'LANJUTKAN PERJALANAN' : 'MULAI PERJALANAN', style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                              ),
                            )
                          ],
                        ),
                      )
                    ],
                  ),
                ),
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

    final tripProvider = context.watch<TripProvider>();
    final allOrders = tripProvider.trips;
    final activeOrders = allOrders.where((t) => t.status != 'completed' && t.status != 'rejected' && t.status != 'cancelled').toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Status Armada', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _buildGudangStat(context, 'Standby', standbyVehicles, Icons.check_circle_rounded, AppTheme.success)),
            const SizedBox(width: 12),
            Expanded(child: _buildGudangStat(context, 'Jalan', dinasVehicles, Icons.local_shipping_rounded, AppTheme.info)),
            const SizedBox(width: 12),
            Expanded(child: _buildGudangStat(context, 'Service', maintenanceVehicles, Icons.build_rounded, AppTheme.warning)),
          ],
        ),
        const SizedBox(height: 24),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0)),
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
                child: const Icon(Icons.add_box_rounded, size: 40, color: AppTheme.primary),
              ),
              const SizedBox(height: 16),
              const Text('Buat Order Pengiriman', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, letterSpacing: -0.5)),
              const SizedBox(height: 6),
              const Text('Pesan unit kendaraan untuk operasional logistics', textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pushNamed(context, AppRoutes.createOrder).then((_) => _loadData());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Text('BUAT ORDER SEKARANG', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 0.5)),
                ),
              )
            ],
          ),
        ),
        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Order Dinas Aktif', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            if (activeOrders.isNotEmpty)
              TextButton(
                onPressed: () {
                  Navigator.pushNamed(context, AppRoutes.orderHistory);
                },
                child: const Text('Lihat Semua', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (activeOrders.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Text(
                'Tidak ada order dinas aktif',
                style: TextStyle(color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
              ),
            ),
          )
        else
          ...activeOrders.map((order) {
            Color badgeColor;
            switch (order.status) {
              case 'pending':
                badgeColor = AppTheme.warning;
                break;
              case 'admin_review':
              case 'waiting_hrga':
              case 'approved':
              case 'in_progress':
                badgeColor = AppTheme.info;
                break;
              default:
                badgeColor = AppTheme.primary;
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
                        color: badgeColor,
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
                            Text(
                              order.spdNumber ?? order.orderNumber,
                              style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.primary, fontSize: 13),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: badgeColor.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                order.statusLabel,
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: badgeColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          order.destination,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          order.itemsDescription ?? 'Detail muatan kosong',
                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
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
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Text(items.length.toString(), style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
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
                        leading: Icon(Icons.directions_car_rounded, color: color),
                        title: Text(v.nopol, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                        subtitle: Text('${v.merk} ${v.model} - ${v.companyName ?? ''}', style: const TextStyle(color: AppTheme.textSecondary)),
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
