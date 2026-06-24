class User {
  final int id;
  final String name;
  final String email;
  final String? phone;
  final int? roleId;
  final String? roleName;
  final String? roleDisplayName;
  final int? companyId;
  final String? companyName;
  final int? unitId;
  final String? unitName;
  final List<String> permissions;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.roleId,
    this.roleName,
    this.roleDisplayName,
    this.companyId,
    this.companyName,
    this.unitId,
    this.unitName,
    this.permissions = const [],
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      phone: json['phone'],
      roleId: json['role_id'],
      roleName: json['role_name'],
      roleDisplayName: json['role_display_name'],
      companyId: json['company_id'],
      companyName: json['company_name'],
      unitId: json['unit_id'],
      unitName: json['unit_name'],
      permissions: json['permissions'] != null 
          ? List<String>.from(json['permissions']) 
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'role_id': roleId,
      'role_name': roleName,
      'role_display_name': roleDisplayName,
      'company_id': companyId,
      'company_name': companyName,
      'unit_id': unitId,
      'unit_name': unitName,
      'permissions': permissions,
    };
  }
}
