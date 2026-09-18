import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/api_config.dart';
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

// ─── Singleton services (tidak dibuat ulang saat rebuild) ───────────────────
late final ApiService _apiService;
late final AuthService _authService;
late final VehicleService _vehicleService;
late final TripService _tripService;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID', null);

  // Load saved API URL dari SharedPreferences sebelum app start
  await ApiConfig.init();

  // Inisialisasi services sekali saja
  _apiService = ApiService();
  _authService = AuthService(_apiService);
  _vehicleService = VehicleService(_apiService);
  _tripService = TripService(_apiService.client);

  runApp(const FleetApp());
}

class FleetApp extends StatelessWidget {
  const FleetApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(_authService)),
        ChangeNotifierProvider(create: (_) => VehicleProvider(_vehicleService)),
        ChangeNotifierProvider(create: (_) => TripProvider(_tripService)),
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
