import 'package:dio/dio.dart';
import '../models/vehicle.dart';
import 'api_service.dart';

class VehicleService {
  final ApiService _apiService;

  VehicleService(this._apiService);

  Future<Map<String, dynamic>> getVehicles({String? status}) async {
    try {
      final response = await _apiService.client.get(
        '/vehicles',
        queryParameters: status != null ? {'status': status} : null,
      );

      if (response.data['success']) {
        final List data = response.data['data'];
        return {
          'success': true,
          'data': data.map((e) => Vehicle.fromJson(e)).toList(),
        };
      }
      return {'success': false, 'message': response.data['message']};
    } catch (e) {
      return {'success': false, 'message': 'Network error'};
    }
  }

  Future<Map<String, dynamic>> getVehicleDetail(int id) async {
    try {
      final response = await _apiService.client.get('/vehicles/$id');
      if (response.data['success']) {
        return {
          'success': true,
          'data': Vehicle.fromJson(response.data['data']),
        };
      }
      return {'success': false, 'message': response.data['message']};
    } catch (e) {
      return {'success': false, 'message': 'Network error'};
    }
  }
  
  Future<Map<String, dynamic>> getVehicleLegality(int vehicleId) async {
    try {
      final response = await _apiService.client.get(
        '/vehicleLegality',
        queryParameters: {'vehicle_id': vehicleId},
      );
      if (response.data['success']) {
        return {'success': true, 'data': response.data['data']};
      }
      return {'success': false, 'message': response.data['message']};
    } catch (e) {
      return {'success': false, 'message': 'Network error'};
    }
  }

  Future<Map<String, dynamic>> getVehicleKmLogs(int vehicleId) async {
    try {
      final response = await _apiService.client.get(
        '/vehicleKm',
        queryParameters: {'vehicle_id': vehicleId},
      );
      if (response.data['success']) {
        return {'success': true, 'data': response.data['data']};
      }
      return {'success': false, 'message': response.data['message']};
    } catch (e) {
      return {'success': false, 'message': 'Network error'};
    }
  }
}
