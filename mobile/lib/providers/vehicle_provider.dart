import 'package:flutter/material.dart';
import '../models/vehicle.dart';
import '../services/vehicle_service.dart';

class VehicleProvider with ChangeNotifier {
  final VehicleService _vehicleService;
  
  List<Vehicle> _vehicles = [];
  List<Vehicle> _vehiclesByDate = [];
  bool _isLoading = false;
  bool _isLoadingByDate = false;
  String _error = '';

  VehicleProvider(this._vehicleService);

  List<Vehicle> get vehicles => _vehicles;
  List<Vehicle> get vehiclesByDate => _vehiclesByDate;
  bool get isLoading => _isLoading;
  bool get isLoadingByDate => _isLoadingByDate;
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

  Future<void> fetchVehiclesByDate({required String dateFrom, required String dateTo}) async {
    _isLoadingByDate = true;
    _error = '';
    notifyListeners();

    final result = await _vehicleService.getVehiclesByDate(dateFrom: dateFrom, dateTo: dateTo);
    if (result['success']) {
      _vehiclesByDate = result['data'];
    } else {
      _error = result['message'] ?? 'Failed to load vehicles by date';
    }

    _isLoadingByDate = false;
    notifyListeners();
  }

  void clearVehiclesByDate() {
    _vehiclesByDate = [];
    _isLoadingByDate = false;
    notifyListeners();
  }
}
