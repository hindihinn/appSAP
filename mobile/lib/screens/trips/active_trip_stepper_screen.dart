import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import '../../config/theme.dart';
import '../../services/trip_service.dart';
import '../../providers/trip_provider.dart';

class ActiveTripStepperScreen extends StatefulWidget {
  final int tripId;
  const ActiveTripStepperScreen({super.key, required this.tripId});

  @override
  State<ActiveTripStepperScreen> createState() => _ActiveTripStepperScreenState();
}

class _ActiveTripStepperScreenState extends State<ActiveTripStepperScreen> {
  int _currentStep = 0;
  bool _isLoading = true;
  
  // Controllers
  final _kmController = TextEditingController();
  final _fuelLitersController = TextEditingController();
  final _fuelCostController = TextEditingController();
  
  // Locations
  Position? _currentPosition;
  String? _locationAddress = "Menunggu lokasi...";

  // Photos
  File? _photoKm;
  File? _photoNota;
  File? _photoPump;
  File? _photoActivity;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTripStatus();
    });
  }

  Future<void> _loadTripStatus() async {
    try {
      final tripService = context.read<TripProvider>().tripService;
      final response = await tripService.client.get('/trips/${widget.tripId}');
      if (response.data != null && response.data['success'] == true) {
        final tripData = response.data['data'];
        final List checkpoints = tripData['checkpoints'] ?? [];
        
        bool hasDeparture = false;
        bool hasFuel = false;
        bool hasUnloading = false;
        bool hasReturn = false;

        for (var cp in checkpoints) {
          final type = cp['type'];
          if (type == 'departure') hasDeparture = true;
          if (type == 'fuel_stop') hasFuel = true;
          if (type == 'unloading') hasUnloading = true;
          if (type == 'return_arrival') hasReturn = true;
        }

        setState(() {
          if (hasReturn) {
            _currentStep = 3;
          } else if (hasUnloading) {
            _currentStep = 3;
          } else if (hasFuel) {
            _currentStep = 2;
          } else if (hasDeparture) {
            _currentStep = 1;
          } else {
            _currentStep = 0;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memuat status perjalanan: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _kmController.dispose();
    _fuelLitersController.dispose();
    _fuelCostController.dispose();
    super.dispose();
  }

  Future<void> _getLocation() async {
    setState(() {
      _isLoading = true;
      _locationAddress = "Mencari lokasi...";
    });
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw 'Location services are disabled.';

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) throw 'Location permissions are denied';
      }
      if (permission == LocationPermission.deniedForever) {
        throw 'Location permissions are permanently denied.';
      }

      _currentPosition = await Geolocator.getCurrentPosition();
      _locationAddress = "Lat: ${_currentPosition!.latitude}, Lng: ${_currentPosition!.longitude}";
      // Note: We could use geocoding here to get a real address, but skipping for simplicity
    } catch (e) {
      _locationAddress = "Gagal: $e";
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _takePhoto(String type) async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (photo != null) {
      setState(() {
        if (type == 'km') _photoKm = File(photo.path);
        if (type == 'nota') _photoNota = File(photo.path);
        if (type == 'pump') _photoPump = File(photo.path);
        if (type == 'activity') _photoActivity = File(photo.path);
      });
    }
  }

  Future<void> _submitCheckpoint(String type) async {
    if (_kmController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('KM Wajib diisi')));
      return;
    }
    if (_currentPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Wajib melampirkan lokasi GPS')));
      return;
    }
    if (_photoKm == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto KM Wajib dilampirkan')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final tripService = context.read<TripProvider>().tripService;
      
      // If departure, call start trip first
      if (type == 'departure') {
        await tripService.client.put('/trips/${widget.tripId}/start');
      }

      final formData = FormData.fromMap({
        'type': type,
        'km_reading': _kmController.text,
        'latitude': _currentPosition!.latitude,
        'longitude': _currentPosition!.longitude,
        'address': _locationAddress,
        'location_accuracy': _currentPosition!.accuracy,
        'fuel_liters': _fuelLitersController.text.isNotEmpty ? _fuelLitersController.text : null,
        'fuel_cost': _fuelCostController.text.isNotEmpty ? _fuelCostController.text : null,
        if (_photoKm != null) 'photo_km': await MultipartFile.fromFile(_photoKm!.path),
        if (_photoNota != null) 'photo_nota': await MultipartFile.fromFile(_photoNota!.path),
        if (_photoPump != null) 'photo_pump': await MultipartFile.fromFile(_photoPump!.path),
        if (_photoActivity != null) 'photo_activity': await MultipartFile.fromFile(_photoActivity!.path),
      });

      await tripService.client.post('/trips/${widget.tripId}/checkpoints', data: formData);

      // If return_arrival, call complete trip
      if (type == 'return_arrival') {
        await tripService.client.put('/trips/${widget.tripId}/complete');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Perjalanan Selesai!')));
          Navigator.pop(context);
        }
        return;
      }

      // Move to next step
      setState(() {
        _kmController.clear();
        _fuelLitersController.clear();
        _fuelCostController.clear();
        _currentPosition = null;
        _locationAddress = "Menunggu lokasi...";
        _photoKm = null;
        _photoNota = null;
        _photoPump = null;
        _photoActivity = null;
        _currentStep++;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Berhasil menyimpan data')));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Widget _buildPhotoTile(String title, File? file, String type) {
    return InkWell(
      onTap: () => _takePhoto(type),
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(file != null ? Icons.check_circle : Icons.camera_alt, color: file != null ? Colors.green : Colors.grey),
            const SizedBox(width: 12),
            Expanded(child: Text(title)),
            if (file != null)
              Image.file(file, width: 40, height: 40, fit: BoxFit.cover),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationWidget() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Row(
          children: [
            ElevatedButton.icon(
              onPressed: _getLocation,
              icon: const Icon(Icons.my_location),
              label: const Text('Ambil Lokasi Saat Ini (GPS)'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accent),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_currentPosition != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.green),
                const SizedBox(width: 8),
                Expanded(child: Text(_locationAddress ?? '', style: const TextStyle(color: Colors.green))),
              ],
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Eksekusi Perjalanan'),
        backgroundColor: AppTheme.primaryDark,
        actions: [
          IconButton(
            icon: const Icon(Icons.warning_amber_rounded, color: Colors.redAccent),
            tooltip: 'Lapor Kejadian Darurat',
            onPressed: () {
              // TODO: Open Event Reporter Modal
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fitur Darurat')));
            },
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Stepper(
              currentStep: _currentStep,
              onStepTapped: (index) {}, // Disable manual tapping to force sequence
              controlsBuilder: (context, details) {
                return const SizedBox.shrink(); // Hide default buttons
              },
              steps: [
                Step(
                  isActive: _currentStep >= 0,
                  state: _currentStep > 0 ? StepState.complete : StepState.indexed,
                  title: const Text('1. Keberangkatan', style: TextStyle(fontWeight: FontWeight.bold)),
                  content: Column(
                    children: [
                      TextField(
                        controller: _kmController,
                        decoration: const InputDecoration(labelText: 'KM Awal Berangkat', suffixText: 'km'),
                        keyboardType: TextInputType.number,
                      ),
                      _buildLocationWidget(),
                      const SizedBox(height: 16),
                      _buildPhotoTile('Foto Dashboard KM *', _photoKm, 'km'),
                      _buildPhotoTile('Foto Surat Jalan *', _photoActivity, 'activity'),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => _submitCheckpoint('departure'),
                          child: const Text('Mulai Perjalanan'),
                        ),
                      )
                    ],
                  ),
                ),
                Step(
                  isActive: _currentStep >= 1,
                  state: _currentStep > 1 ? StepState.complete : StepState.indexed,
                  title: const Text('2. Isi BBM (Opsional)', style: TextStyle(fontWeight: FontWeight.bold)),
                  content: Column(
                    children: [
                      TextField(
                        controller: _kmController,
                        decoration: const InputDecoration(labelText: 'KM Saat Isi BBM', suffixText: 'km'),
                        keyboardType: TextInputType.number,
                      ),
                      TextField(
                        controller: _fuelLitersController,
                        decoration: const InputDecoration(labelText: 'Jumlah Liter', suffixText: 'L'),
                        keyboardType: TextInputType.number,
                      ),
                      TextField(
                        controller: _fuelCostController,
                        decoration: const InputDecoration(labelText: 'Biaya BBM', prefixText: 'Rp '),
                        keyboardType: TextInputType.number,
                      ),
                      _buildLocationWidget(),
                      const SizedBox(height: 16),
                      _buildPhotoTile('Foto Dashboard KM *', _photoKm, 'km'),
                      _buildPhotoTile('Foto Nota BBM', _photoNota, 'nota'),
                      _buildPhotoTile('Foto Dispenser / Mesin', _photoPump, 'pump'),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => setState(() => _currentStep++),
                              child: const Text('Lewati BBM'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => _submitCheckpoint('fuel_stop'),
                              child: const Text('Simpan BBM'),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
                Step(
                  isActive: _currentStep >= 2,
                  state: _currentStep > 2 ? StepState.complete : StepState.indexed,
                  title: const Text('3. Bongkar Muatan', style: TextStyle(fontWeight: FontWeight.bold)),
                  content: Column(
                    children: [
                      TextField(
                        controller: _kmController,
                        decoration: const InputDecoration(labelText: 'KM Saat Tiba (Bongkar)', suffixText: 'km'),
                        keyboardType: TextInputType.number,
                      ),
                      _buildLocationWidget(),
                      const SizedBox(height: 16),
                      _buildPhotoTile('Foto Dashboard KM *', _photoKm, 'km'),
                      _buildPhotoTile('Foto Aktivitas Bongkar *', _photoActivity, 'activity'),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => _submitCheckpoint('unloading'),
                          child: const Text('Simpan Data Bongkar'),
                        ),
                      )
                    ],
                  ),
                ),
                Step(
                  isActive: _currentStep >= 3,
                  state: _currentStep > 3 ? StepState.complete : StepState.indexed,
                  title: const Text('4. Pulang / Selesai', style: TextStyle(fontWeight: FontWeight.bold)),
                  content: Column(
                    children: [
                      TextField(
                        controller: _kmController,
                        decoration: const InputDecoration(labelText: 'KM Saat Pulang / Kembali', suffixText: 'km'),
                        keyboardType: TextInputType.number,
                      ),
                      _buildLocationWidget(),
                      const SizedBox(height: 16),
                      _buildPhotoTile('Foto Dashboard KM *', _photoKm, 'km'),
                      _buildPhotoTile('Foto Kendaraan *', _photoActivity, 'activity'),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => _submitCheckpoint('return_arrival'),
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                          child: const Text('Selesaikan Perjalanan'),
                        ),
                      )
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
