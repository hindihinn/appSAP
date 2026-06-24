class Vehicle {
  final int id;
  final String nopol;
  final String? vehicleCode;
  final String merk;
  final String? model;
  final String type;
  final int? year;
  final String? color;
  final String? chassisNumber;
  final String? engineNumber;
  final double? capacityTon;
  final String? fuelType;
  final double currentKm;
  final String status;
  final String ownership;
  final String? photoFront;
  final String? photoBack;
  final String? photoLeft;
  final String? photoRight;
  final String? notes;
  final int? companyId;
  final String? companyName;
  final int? unitId;
  final String? unitName;

  Vehicle({
    required this.id,
    required this.nopol,
    this.vehicleCode,
    required this.merk,
    this.model,
    required this.type,
    this.year,
    this.color,
    this.chassisNumber,
    this.engineNumber,
    this.capacityTon,
    this.fuelType,
    this.currentKm = 0.0,
    required this.status,
    required this.ownership,
    this.photoFront,
    this.photoBack,
    this.photoLeft,
    this.photoRight,
    this.notes,
    this.companyId,
    this.companyName,
    this.unitId,
    this.unitName,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'],
      nopol: json['nopol'],
      vehicleCode: json['vehicle_code'],
      merk: json['merk'],
      model: json['model'],
      type: json['type'] ?? 'other',
      year: json['year'],
      color: json['color'],
      chassisNumber: json['chassis_number'],
      engineNumber: json['engine_number'],
      capacityTon: json['capacity_ton'] != null ? double.parse(json['capacity_ton'].toString()) : null,
      fuelType: json['fuel_type'],
      currentKm: json['current_km'] != null ? double.parse(json['current_km'].toString()) : 0.0,
      status: json['status'] ?? 'available',
      ownership: json['ownership'] ?? 'owned',
      photoFront: json['photo_front'],
      photoBack: json['photo_back'],
      photoLeft: json['photo_left'],
      photoRight: json['photo_right'],
      notes: json['notes'],
      companyId: json['company_id'],
      companyName: json['company_name'],
      unitId: json['unit_id'],
      unitName: json['unit_name'],
    );
  }
}
