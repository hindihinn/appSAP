import 'package:flutter/material.dart';
import '../screens/splash_screen.dart';
import '../screens/login_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/vehicles/vehicle_list_screen.dart';
import '../screens/vehicles/vehicle_legality_screen.dart';
import '../screens/vehicles/vehicle_km_screen.dart';
import '../screens/trips/create_order_screen.dart';
import '../screens/trips/driver_tasks_screen.dart';

class AppRoutes {
  static const String splash = '/';
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String vehicleList = '/vehicles';
  static const String vehicleLegality = '/vehicles/legality';
  static const String vehicleKm = '/vehicles/km';
  static const String createOrder = '/trips/create';
  static const String driverTasks = '/trips/driver-tasks';

  static Map<String, WidgetBuilder> get routes => {
    splash: (context) => const SplashScreen(),
    login: (context) => const LoginScreen(),
    dashboard: (context) => const DashboardScreen(),
    vehicleList: (context) => const VehicleListScreen(),
    vehicleLegality: (context) => const VehicleLegalityScreen(),
    vehicleKm: (context) => const VehicleKmScreen(),
    createOrder: (context) => const CreateOrderScreen(),
    driverTasks: (context) => const DriverTasksScreen(),
  };
}
