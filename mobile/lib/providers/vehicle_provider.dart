import 'package:flutter/material.dart';
import '../models/vehicle.dart';
import '../services/vehicle_service.dart';

class VehicleProvider with ChangeNotifier {
  final VehicleService _vehicleService;
  
  List<Vehicle> _vehicles = [];
  bool _isLoading = false;
  String _error = '';

  VehicleProvider(this._vehicleService);

  List<Vehicle> get vehicles => _vehicles;
  bool get isLoading => _isLoading;
  String get error => _error;

  Future<void> fetchVehicles({String? status}) async {
    _isLoading = true;
    _error = '';
    notifyListeners();

    final result = await _vehicleService.getVehicles(status: status);
    if (result['success']) {
      _vehicles = result['data'];
    } else {
      _error = result['message'] ?? 'Failed to load vehicles';
    }

    _isLoading = false;
    notifyListeners();
  }
}
