import 'package:flutter/foundation.dart';
import '../services/trip_service.dart';

class TripProvider with ChangeNotifier {
  final TripService _tripService;

  List<TripOrder> _trips = [];
  bool _isLoading = false;
  String? _error;

  TripProvider(this._tripService);

  TripService get tripService => _tripService;
  List<TripOrder> get trips => _trips;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchMyTrips(int driverId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _trips = await _tripService.getTrips(driverId: driverId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createOrder(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _tripService.createOrder(data);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
