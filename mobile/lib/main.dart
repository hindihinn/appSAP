import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'config/routes.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/vehicle_service.dart';
import 'services/trip_service.dart';
import 'providers/auth_provider.dart';
import 'providers/vehicle_provider.dart';
import 'providers/trip_provider.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID', null);
  runApp(const FleetApp());
}

class FleetApp extends StatelessWidget {
  const FleetApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Initialize services
    final apiService = ApiService();
    final authService = AuthService(apiService);
    final vehicleService = VehicleService(apiService);
    final tripService = TripService(apiService.client);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(authService)),
        ChangeNotifierProvider(create: (_) => VehicleProvider(vehicleService)),
        ChangeNotifierProvider(create: (_) => TripProvider(tripService)),
      ],
      child: MaterialApp(
        title: 'Fleet Management',
        theme: AppTheme.lightTheme,
        debugShowCheckedModeBanner: false,
        initialRoute: AppRoutes.splash,
        routes: AppRoutes.routes,
      ),
    );
  }
}
