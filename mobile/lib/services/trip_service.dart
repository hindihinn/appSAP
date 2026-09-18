import 'package:dio/dio.dart';
import '../config/api_config.dart';

class TripOrder {
  final int id;
  final String orderNumber;
  final String? spdNumber;
  final String destination;
  final String purpose;
  final String? itemsDescription;
  final String status;
  final String? plannedDeparture;
  final int? vehicleId;
  final int? driverId;
  final String? nopol;
  final String? driverName;
  final String? companyName;
  final int? companyId;
  final int? unitId;

  TripOrder({
    required this.id,
    required this.orderNumber,
    this.spdNumber,
    required this.destination,
    required this.purpose,
    this.itemsDescription,
    required this.status,
    this.plannedDeparture,
    this.vehicleId,
    this.driverId,
    this.nopol,
    this.driverName,
    this.companyName,
    this.companyId,
    this.unitId,
  });

  factory TripOrder.fromJson(Map<String, dynamic> json) {
    return TripOrder(
      id: json['id'],
      orderNumber: json['order_number'],
      spdNumber: json['spd_number'],
      destination: json['destination'],
      purpose: json['purpose'],
      itemsDescription: json['items_description'],
      status: json['status'],
      plannedDeparture: json['planned_departure'],
      vehicleId: json['vehicle_id'],
      driverId: json['driver_id'],
      nopol: json['nopol'],
      driverName: json['driver_name'],
      companyName: json['company_name'],
      companyId: json['company_id'],
      unitId: json['unit_id'],
    );
  }

  String get statusLabel {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'MENUNGGU';
      case 'admin_review':
        return 'REVIEW ADMIN';
      case 'waiting_hrga':
        return 'REVIEW HRGA';
      case 'approved':
        return 'DISETUJUI';
      case 'in_progress':
        return 'BERJALAN';
      case 'completed':
        return 'SELESAI';
      case 'cancelled':
      case 'rejected':
        return 'DITOLAK';
      default:
        return status.replaceAll('_', ' ').toUpperCase();
    }
  }
}

class TripService {
  final Dio client;

  TripService(this.client);

  Future<List<TripOrder>> getTrips({String? status, int? driverId, int? requesterId}) async {
    try {
      final response = await client.get(
        '/trips',
        queryParameters: {
          if (status != null) 'status': status,
          if (driverId != null) 'driver_id': driverId,
          if (requesterId != null) 'requester_id': requesterId,
        },
      );
      if (response.data['success']) {
        final List data = response.data['data'];
        return data.map((e) => TripOrder.fromJson(e)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Gagal mengambil data trip: $e');
    }
  }

  Future<void> createOrder(Map<String, dynamic> data) async {
    try {
      final response = await client.post('/trips', data: data);
      if (!response.data['success']) {
        throw Exception(response.data['message']);
      }
    } catch (e) {
      throw Exception('Gagal membuat order: $e');
    }
  }

  Future<void> withdrawOrder(int tripId) async {
    try {
      final response = await client.put('/trips/$tripId/withdraw');
      if (!response.data['success']) {
        throw Exception(response.data['message']);
      }
    } catch (e) {
      throw Exception('Gagal menarik order: $e');
    }
  }
}
