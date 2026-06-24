import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../../config/theme.dart';
import '../../providers/vehicle_provider.dart';
import '../../providers/trip_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/app_drawer.dart';

class CreateOrderScreen extends StatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  DateTime? _selectedDate;
  
  final _unitCountController = TextEditingController(text: '1');
  final _itemsController = TextEditingController();
  final _notesController = TextEditingController();

  List<dynamic> _companies = [];
  List<dynamic> _units = [];
  int? _selectedCompanyId;
  int? _selectedUnitId;
  String? _selectedCompanyName;
  String? _selectedUnitName;
  bool _isLoadingOrgs = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VehicleProvider>().fetchVehicles(); // Fetch ALL vehicles for summary
      _fetchCompanies();
    });
  }

  @override
  void dispose() {
    _unitCountController.dispose();
    _itemsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _fetchCompanies() async {
    try {
      final dio = context.read<TripProvider>().tripService.client;
      final res = await dio.get('/organizations/companies');
      if (res.data['success']) {
        setState(() {
          _companies = res.data['data'];
          _isLoadingOrgs = false;
        });
      }
    } catch (e) {
      setState(() => _isLoadingOrgs = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Gagal memuat daftar PT')));
    }
  }

  Future<void> _fetchUnits(int companyId) async {
    setState(() {
      _selectedUnitId = null;
      _selectedUnitName = null;
      _units = [];
    });
    try {
      final dio = context.read<TripProvider>().tripService.client;
      final res = await dio.get('/organizations/units?company_id=$companyId');
      if (res.data['success']) {
        setState(() {
          _units = res.data['data'];
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Gagal memuat daftar Unit/Cabang')));
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: AppTheme.primary),
            textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: AppTheme.primary)),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pilih tanggal keberangkatan')));
      return;
    }
    if (_selectedCompanyId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pilih PT Tujuan')));
      return;
    }

    try {
      final tripProvider = context.read<TripProvider>();
      
      // We send the destination as a combined string for the API
      String dest = _selectedCompanyName ?? '';
      if (_selectedUnitName != null && _selectedUnitName!.isNotEmpty) {
        dest += ' - $_selectedUnitName';
      }

      await tripProvider.createOrder({
        'company_id': _selectedCompanyId,
        'unit_id': _selectedUnitId,
        'vehicle_id': null,
        'destination': dest,
        'purpose': _notesController.text.isNotEmpty ? _notesController.text : 'Order Pengiriman',
        'items_description': '[Butuh ${_unitCountController.text} Unit] - ${_itemsController.text}',
        'planned_departure': DateFormat('yyyy-MM-dd HH:mm:ss').format(_selectedDate!),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order berhasil dibuat'), backgroundColor: Colors.green));
        Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    final vehicles = context.watch<VehicleProvider>().vehicles;
    final isLoading = context.watch<TripProvider>().isLoading;

    final standbyVehicles = vehicles.where((v) => v.status == 'available').toList();
    final dinasVehicles = vehicles.where((v) => v.status == 'in_use').toList();
    final maintenanceVehicles = vehicles.where((v) => v.status == 'maintenance').toList();

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Buat Order Dinas', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: AppTheme.primaryDark,
        centerTitle: true,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Keterangan Total Unit
            Container(
              padding: const EdgeInsets.all(20),
              margin: const EdgeInsets.only(bottom: 24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.blue.shade50, Colors.white],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.blue.shade100),
                boxShadow: [
                  BoxShadow(color: Colors.blue.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                children: [
                  const Text('INFORMASI KETERSEDIAAN UNIT', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue, letterSpacing: 1, fontSize: 12)),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildSummaryItem(context, 'Standby', standbyVehicles, Icons.check_circle, Colors.green)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildSummaryItem(context, 'Jalan', dinasVehicles, Icons.local_shipping, Colors.orange)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildSummaryItem(context, 'Service', maintenanceVehicles, Icons.build, Colors.red)),
                    ],
                  ),
                ],
              ),
            ),
            
            _buildSectionTitle('Detail Kebutuhan'),
            _buildTextField(
              controller: _unitCountController,
              label: 'Jumlah Unit Dibutuhkan',
              icon: Icons.numbers_rounded,
              keyboardType: TextInputType.number,
              suffixText: 'Unit',
            ),
            const SizedBox(height: 16),
            _buildTextField(
              controller: _itemsController,
              label: 'Deskripsi Barang / Tonase',
              icon: Icons.inventory_2_rounded,
              maxLines: 2,
            ),
            
            const SizedBox(height: 24),
            _buildSectionTitle('Tujuan Pengiriman'),
            _buildDropdown(
              label: 'Pilih Perusahaan (PT)',
              icon: Icons.business_rounded,
              value: _selectedCompanyId,
              items: _companies,
              isLoading: _isLoadingOrgs,
              onChanged: (val) {
                setState(() {
                  _selectedCompanyId = val;
                  _selectedCompanyName = _companies.firstWhere((c) => c['id'] == val)['name'];
                });
                _fetchUnits(val as int);
              },
            ),
            const SizedBox(height: 16),
            _buildDropdown(
              label: 'Pilih Unit / Cabang',
              icon: Icons.store_rounded,
              value: _selectedUnitId,
              items: _units,
              onChanged: _selectedCompanyId == null ? null : (val) {
                setState(() {
                  _selectedUnitId = val;
                  _selectedUnitName = _units.firstWhere((u) => u['id'] == val)['name'];
                });
              },
            ),
            
            const SizedBox(height: 24),
            _buildSectionTitle('Jadwal & Keterangan'),
            InkWell(
              onTap: () => _selectDate(context),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_month_rounded, color: AppTheme.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Tanggal Keberangkatan', style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(
                            _selectedDate != null ? DateFormat('EEEE, dd MMM yyyy', 'id_ID').format(_selectedDate!) : 'Pilih Tanggal',
                            style: TextStyle(fontSize: 16, color: _selectedDate != null ? Colors.black87 : Colors.grey, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: Colors.grey),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildTextField(
              controller: _notesController,
              label: 'Keterangan Tambahan (Opsional)',
              icon: Icons.notes_rounded,
              maxLines: 3,
              isRequired: false,
            ),
            
            const SizedBox(height: 40),
            Row(
              children: [
                Expanded(
                  flex: 1,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      side: BorderSide(color: Colors.grey.shade400),
                    ),
                    child: const Text('Batal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black54)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 4,
                      shadowColor: AppTheme.primary.withOpacity(0.5),
                    ),
                    child: isLoading
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3))
                        : const Text('Buat Order Sekarang', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isRequired = true,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? suffixText,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      style: const TextStyle(fontWeight: FontWeight.w500),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.grey.shade600),
        prefixIcon: Icon(icon, color: AppTheme.primary),
        suffixText: suffixText,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary, width: 2)),
      ),
      validator: isRequired ? (val) => val == null || val.isEmpty ? 'Wajib diisi' : null : null,
    );
  }

  Widget _buildDropdown({
    required String label,
    required IconData icon,
    required dynamic value,
    required List<dynamic> items,
    required void Function(dynamic)? onChanged,
    bool isLoading = false,
  }) {
    return DropdownButtonFormField<dynamic>(
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.grey.shade600),
        prefixIcon: isLoading 
            ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
            : Icon(icon, color: AppTheme.primary),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary, width: 2)),
      ),
      value: value,
      items: items.map((item) {
        return DropdownMenuItem(
          value: item['id'],
          child: Text(item['name'], style: const TextStyle(fontWeight: FontWeight.w500)),
        );
      }).toList(),
      onChanged: onChanged,
      validator: (val) => val == null ? 'Wajib dipilih' : null,
      isExpanded: true,
      icon: const Icon(Icons.arrow_drop_down_rounded, color: AppTheme.primary, size: 30),
    );
  }

  Widget _buildSummaryItem(BuildContext context, String label, List<dynamic> items, IconData icon, Color color) {
    return GestureDetector(
      onLongPress: () {
        _showVehicleList(context, label, items, color);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
          boxShadow: [
            BoxShadow(color: color.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
          ],
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(items.length.toString(), style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  void _showVehicleList(BuildContext context, String label, List<dynamic> items, Color color) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4)))),
              const SizedBox(height: 16),
              Text('Daftar Unit $label', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
              const Divider(height: 24),
              if (items.isEmpty)
                const Padding(padding: EdgeInsets.all(16), child: Center(child: Text('Tidak ada unit')))
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: items.length,
                    itemBuilder: (c, i) {
                      final v = items[i];
                      return ListTile(
                        leading: Icon(Icons.directions_car, color: color),
                        title: Text(v.nopol, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${v.merk} ${v.model} - ${v.companyName ?? ''}'),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}

class TripServiceExtension {
  // Just a placeholder since tripService.client is a Dio instance directly accessible
}
