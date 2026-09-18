import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/trip_provider.dart';
import '../../config/theme.dart';

class WOStepperScreen extends StatefulWidget {
  final int woId;
  final String woNumber;
  final String status;

  const WOStepperScreen({
    super.key,
    required this.woId,
    required this.woNumber,
    required this.status,
  });

  @override
  State<WOStepperScreen> createState() => _WOStepperScreenState();
}

class _WOStepperScreenState extends State<WOStepperScreen> {
  final _kmController = TextEditingController();
  final _costController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  int _currentStep = 0;
  bool _loadingWO = true;
  bool _submitting = false;
  String? _loadError;

  // GPS state
  Position? _currentPosition;
  String _locationAddress = "Lokasi belum didapatkan";
  bool _loadingGPS = false;

  // Photo attachments state
  File? _photoKm;
  File? _photoActivity;
  File? _photoInvoice;

  @override
  void initState() {
    super.initState();
    _loadWODetails();
  }

  @override
  void dispose() {
    _kmController.dispose();
    _costController.dispose();
    super.dispose();
  }

  Future<void> _loadWODetails() async {
    setState(() {
      _loadingWO = true;
      _loadError = null;
    });

    try {
      final client = context.read<TripProvider>().tripService.client;
      final res = await client.get('/services/work-orders/${widget.woId}');
      if (res.data['success'] == true) {
        final wo = res.data['data'];
        final List checkpoints = wo['checkpoints'] ?? [];

        // Determine current step based on existing checkpoints
        int step = 0;
        final hasStart = checkpoints.any((c) => c['type'] == 'start_to_workshop');
        final hasArrive = checkpoints.any((c) => c['type'] == 'arrive_at_workshop');
        final hasReturn = checkpoints.any((c) => c['type'] == 'return_to_office');

        if (hasReturn) {
          step = 3; // Completed
        } else if (hasArrive) {
          step = 2; // Return to office
        } else if (hasStart) {
          step = 1; // Arrive at workshop
        } else {
          step = 0; // Start to workshop
        }

        setState(() {
          _currentStep = step;
        });

        // Trigger auto GPS load
        _getGPSLocation();
      }
    } catch (e) {
      setState(() {
        _loadError = 'Gagal memuat detail Work Order';
      });
    } finally {
      setState(() {
        _loadingWO = false;
      });
    }
  }

  Future<void> _getGPSLocation() async {
    setState(() {
      _loadingGPS = true;
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw 'Layanan lokasi GPS tidak aktif.';

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) throw 'Akses lokasi ditolak';
      }
      if (permission == LocationPermission.deniedForever) {
        throw 'Akses lokasi ditolak permanen, aktifkan lewat pengaturan.';
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      
      setState(() {
        _currentPosition = pos;
        _locationAddress = "Latitude: ${pos.latitude.toStringAsFixed(6)}\nLongitude: ${pos.longitude.toStringAsFixed(6)}";
      });
    } catch (e) {
      setState(() {
        _locationAddress = "Gagal mengambil GPS: $e";
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _loadingGPS = false);
    }
  }

  Future<void> _takePhoto(String type) async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (photo != null) {
      setState(() {
        if (type == 'km') _photoKm = File(photo.path);
        if (type == 'activity') _photoActivity = File(photo.path);
        if (type == 'invoice') _photoInvoice = File(photo.path);
      });
    }
  }

  Future<void> _submitCheckpoint() async {
    if (_kmController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('KM kendaraan wajib diisi')));
      return;
    }
    if (_currentPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Koordinat GPS wajib terkuci')));
      return;
    }
    if (_photoKm == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto kilometer wajib dilampirkan')));
      return;
    }

    // Additional photo validations per step
    if (_currentStep == 1) {
      // Arrive at workshop requires repair photo only
      if (_photoActivity == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto perbaikan wajib dilampirkan')));
        return;
      }
    } else if (_currentStep == 2) {
      // Return to office requires vehicle condition photo, invoice photo, and cost input
      if (_photoActivity == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto kondisi kendaraan terbaru wajib dilampirkan')));
        return;
      }
      if (_photoInvoice == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto nota/invoice perbaikan wajib dilampirkan')));
        return;
      }
      if (_costController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Biaya perbaikan/service wajib diisi')));
        return;
      }
    }

    setState(() => _submitting = true);

    try {
      final client = context.read<TripProvider>().tripService.client;
      final typeCode = _currentStep == 0
          ? 'start_to_workshop'
          : _currentStep == 1
              ? 'arrive_at_workshop'
              : 'return_to_office';

      final formData = FormData.fromMap({
        'type': typeCode,
        'km_reading': _kmController.text.trim(),
        'latitude': _currentPosition!.latitude,
        'longitude': _currentPosition!.longitude,
        'address': _locationAddress,
        'photo_km': await MultipartFile.fromFile(_photoKm!.path),
        if (_photoActivity != null) 'photo_activity': await MultipartFile.fromFile(_photoActivity!.path),
        if (_photoInvoice != null) 'photo_invoice': await MultipartFile.fromFile(_photoInvoice!.path),
        if (_currentStep == 2) 'actual_cost': _costController.text.trim(),
      });

      final res = await client.post('/services/work-orders/${widget.woId}/checkpoints', data: formData);

      if (res.data['success'] == true && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Checkpoint ${typeCode.replaceAll('_', ' ')} berhasil disimpan!'),
            backgroundColor: AppTheme.success,
          ),
        );
        
        // Reset local variables
        _kmController.clear();
        _costController.clear();
        _photoKm = null;
        _photoActivity = null;
        _photoInvoice = null;

        if (_currentStep == 2) {
          // Completed, pop back to tasks
          Navigator.pop(context);
        } else {
          _loadWODetails();
        }
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal mengirim checkpoint: ${e.response?.data['message'] ?? e.message}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Koneksi server gagal'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stepsList = [
      {'title': 'Menuju Bengkel', 'icon': Icons.play_arrow_rounded},
      {'title': 'Sampai Bengkel', 'icon': Icons.build_rounded},
      {'title': 'Sampai Kantor', 'icon': Icons.flag_rounded},
    ];

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(widget.woNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace')),
        elevation: 0,
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: _loadingWO
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 60, color: Colors.orange),
                        const SizedBox(height: 16),
                        Text(_loadError!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 20),
                        ElevatedButton(onPressed: _loadWODetails, child: const Text('Coba Lagi')),
                      ],
                    ),
                  ),
                )
              : _currentStep >= 3
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.check_circle_rounded, size: 70, color: AppTheme.success),
                          const SizedBox(height: 16),
                          const Text('WO Selesai Perbaikan!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(height: 20),
                          ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('Kembali')),
                        ],
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.all(20.0),
                      children: [
                        // Steps Progress Indicator
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: List.generate(stepsList.length, (idx) {
                              final isCompleted = _currentStep > idx;
                              final isActive = _currentStep == idx;
                              

                              return Expanded(
                                child: Column(
                                  children: [
                                    Row(
                                      children: [
                                        if (idx > 0)
                                          Expanded(
                                            child: Container(
                                              height: 2,
                                              color: _currentStep >= idx ? AppTheme.success : Colors.grey.shade200,
                                            ),
                                          )
                                        else
                                          const Spacer(),
                                        Container(
                                          width: 34,
                                          height: 34,
                                          decoration: BoxDecoration(
                                            color: isActive ? AppTheme.primary : (isCompleted ? AppTheme.success.withOpacity(0.12) : Colors.grey.shade100),
                                            shape: BoxShape.circle,
                                            border: isActive ? Border.all(color: AppTheme.primary.withOpacity(0.2), width: 3) : null,
                                          ),
                                          child: Icon(
                                            isCompleted ? Icons.check : stepsList[idx]['icon'] as IconData,
                                            size: 16,
                                            color: isCompleted ? AppTheme.success : (isActive ? Colors.white : Colors.grey.shade400),
                                          ),
                                        ),
                                        if (idx < stepsList.length - 1)
                                          Expanded(
                                            child: Container(
                                              height: 2,
                                              color: _currentStep > idx ? AppTheme.success : Colors.grey.shade200,
                                            ),
                                          )
                                        else
                                          const Spacer(),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      stepsList[idx]['title'] as String,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                                        color: isActive ? AppTheme.primary : (isCompleted ? AppTheme.textSecondary : Colors.grey),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Form Header Info
                        Text(
                          'Input Checkpoint: ${stepsList[_currentStep]['title']}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 16),

                        // KM Input Form
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('KM Kendaraan Saat Ini *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _kmController,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  hintText: 'Contoh: 125800',
                                  filled: true,
                                  fillColor: Colors.grey.shade50,
                                  suffixText: 'km',
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                                ),
                              ),
                              if (_currentStep == 2) ...[
                                const SizedBox(height: 16),
                                const Text('Biaya Perbaikan/Service *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                const SizedBox(height: 8),
                                TextFormField(
                                  controller: _costController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: 'Contoh: 350000',
                                    filled: true,
                                    fillColor: Colors.grey.shade50,
                                    prefixText: 'Rp ',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        // GPS Card
                        _buildGPSCard(),
                        const SizedBox(height: 20),

                        // Photos section
                        const Text('Lampiran Foto Perbaikan *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 12),
                        
                        _buildPhotoGrid(),
                        const SizedBox(height: 32),

                        // Submit Button
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: _submitting ? null : _submitCheckpoint,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: 2,
                            ),
                            child: _submitting
                                ? const CircularProgressIndicator(color: Colors.white)
                                : Text(
                                    _currentStep == 2 ? 'SELESAIKAN PERBAIKAN' : 'KIRIM CHECKPOINT',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 30),
                      ],
                    ),
    );
  }

  Widget _buildGPSCard() {
    final hasLocation = _currentPosition != null;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: hasLocation ? Colors.green.shade50 : Colors.orange.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: hasLocation ? Colors.green.shade200 : Colors.orange.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                hasLocation ? Icons.gps_fixed : Icons.gps_off,
                color: hasLocation ? Colors.green : Colors.orange,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasLocation ? 'GPS Terkunci' : 'GPS Belum Terkunci',
                      style: TextStyle(fontWeight: FontWeight.bold, color: hasLocation ? Colors.green.shade900 : Colors.orange.shade900),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _locationAddress,
                      style: TextStyle(fontSize: 12, color: hasLocation ? Colors.green.shade700 : Colors.orange.shade700),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (hasLocation) ...[
            SizedBox(
              height: 140,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: FlutterMap(
                  options: MapOptions(
                    initialCenter: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                    initialZoom: 15.0,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.location_pin, color: Colors.red, size: 40),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            height: 40,
            child: OutlinedButton.icon(
              onPressed: _loadingGPS ? null : _getGPSLocation,
              icon: _loadingGPS
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.my_location, size: 16),
              label: const Text('Perbarui Lokasi GPS', style: TextStyle(fontSize: 12)),
              style: OutlinedButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                side: BorderSide(color: hasLocation ? Colors.green : Colors.orange),
                foregroundColor: hasLocation ? Colors.green.shade700 : Colors.orange.shade700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoGrid() {
    // Generate photo items depending on _currentStep
    final List<Map<String, dynamic>> photoFields = [
      {'key': 'km', 'label': 'Foto Kilometer *', 'file': _photoKm},
      if (_currentStep == 1) ...[
        {'key': 'activity', 'label': 'Foto Perbaikan *', 'file': _photoActivity},
      ] else if (_currentStep == 2) ...[
        {'key': 'activity', 'label': 'Foto Kondisi Kendaraan *', 'file': _photoActivity},
        {'key': 'invoice', 'label': 'Foto Nota Perbaikan *', 'file': _photoInvoice},
      ]
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.15,
      ),
      itemCount: photoFields.length,
      itemBuilder: (context, idx) {
        final field = photoFields[idx];
        final File? file = field['file'];

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              onTap: () => _takePhoto(field['key'] as String),
              child: file != null
                  ? Stack(
                      children: [
                        Positioned.fill(child: Image.file(file, fit: BoxFit.cover)),
                        Positioned(
                          bottom: 0,
                          left: 0,
                          right: 0,
                          child: Container(
                            color: Colors.black.withOpacity(0.5),
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Text(
                              field['label'] as String,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.camera_alt_rounded, color: AppTheme.primary, size: 36),
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0),
                          child: Text(
                            field['label'] as String,
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        );
      },
    );
  }
}
