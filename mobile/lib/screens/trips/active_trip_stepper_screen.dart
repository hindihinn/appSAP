import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../config/theme.dart';
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
  Map<String, dynamic>? _tripData;
  double? _fuelPricePerLiter;
  
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
    _fuelLitersController.addListener(_onFuelLitersChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTripStatus();
    });
  }

  void _onFuelLitersChanged() {
    if (_fuelPricePerLiter != null && _fuelLitersController.text.isNotEmpty) {
      final double? liters = double.tryParse(_fuelLitersController.text);
      if (liters != null) {
        final double totalCost = liters * _fuelPricePerLiter!;
        _fuelCostController.text = totalCost.toStringAsFixed(0);
      }
    }
  }

  Future<void> _loadTripStatus() async {
    try {
      final tripService = context.read<TripProvider>().tripService;
      final response = await tripService.client.get('/trips/${widget.tripId}');
      if (response.data != null && response.data['success'] == true) {
        final tripData = response.data['data'];
        final List checkpoints = tripData['checkpoints'] ?? [];
        final bool isExtended = tripData['is_extended'] == 1 || tripData['is_extended'] == true || tripData['is_extended'].toString() == '1';
        
        bool hasDeparture = false;
        bool hasFuel = false;
        bool hasUnloading = false;
        bool hasExtendUnloading = false;
        bool hasReturn = false;

        for (var cp in checkpoints) {
          final type = cp['type'];
          if (type == 'departure') hasDeparture = true;
          if (type == 'fuel_stop') hasFuel = true;
          if (type == 'unloading') hasUnloading = true;
          if (type == 'extend_unloading') hasExtendUnloading = true;
          if (type == 'return_arrival') hasReturn = true;
        }

        final double? fuelPrice = tripData['fuel_price_per_liter'] != null
            ? double.tryParse(tripData['fuel_price_per_liter'].toString())
            : null;

        setState(() {
          _tripData = tripData;
          _fuelPricePerLiter = fuelPrice;
          if (isExtended) {
            if (hasReturn) {
              _currentStep = 4;
            } else if (hasExtendUnloading) {
              _currentStep = 4;
            } else if (hasUnloading) {
              _currentStep = 3;
            } else if (hasFuel) {
              _currentStep = 2;
            } else if (hasDeparture) {
              _currentStep = 1;
            } else {
              _currentStep = 0;
            }
          } else {
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
    _fuelLitersController.removeListener(_onFuelLitersChanged);
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
      if (!serviceEnabled) throw 'Layanan lokasi GPS tidak aktif.';

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) throw 'Akses lokasi ditolak';
      }
      if (permission == LocationPermission.deniedForever) {
        throw 'Akses lokasi ditolak permanen, aktifkan lewat pengaturan.';
      }

      _currentPosition = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      _locationAddress = "Latitude: ${_currentPosition!.latitude.toStringAsFixed(6)}\nLongitude: ${_currentPosition!.longitude.toStringAsFixed(6)}";
    } catch (e) {
      _locationAddress = "Gagal mendapatkan GPS: $e";
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
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

    if (type == 'departure' && _photoActivity == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto Surat Jalan Wajib dilampirkan')));
      return;
    }
    if (type == 'unloading' && _photoActivity == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto Aktivitas Bongkar Wajib dilampirkan')));
      return;
    }
    if (type == 'extend_unloading' && _photoActivity == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto Bongkar / Sampai Extend Wajib dilampirkan')));
      return;
    }
    if (type == 'return_arrival' && _photoActivity == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto Kendaraan Wajib dilampirkan')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final provider = context.read<TripProvider>();
      final tripService = provider.tripService;
      
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

      if (type == 'return_arrival') {
        await tripService.client.put('/trips/${widget.tripId}/complete');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Perjalanan Dinas Selesai! Terima kasih.'),
              backgroundColor: AppTheme.success,
            ),
          );
          Navigator.pop(context);
        }
        return;
      }

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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Berhasil menyimpan data checkpoint'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showEmergencyDialog() {
    String selectedType = 'breakdown';
    final titleController = TextEditingController();
    final kmController = TextEditingController();
    final descController = TextEditingController();
    String selectedSeverity = 'medium';
    File? incidentPhoto;
    File? photoKm;
    Position? eventLocation;
    String? locationStatus = "Lokasi GPS belum diambil";
    String? validationError;
    bool isSubmittingEvent = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            Future<void> pickIncidentPhoto() async {
              final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
              if (photo != null) {
                setModalState(() {
                  incidentPhoto = File(photo.path);
                });
              }
            }

            Future<void> submitEvent() async {
              if (titleController.text.trim().isEmpty) {
                setModalState(() => validationError = 'Judul laporan wajib diisi');
                return;
              }
              if (kmController.text.trim().isEmpty) {
                setModalState(() => validationError = 'KM saat ini wajib diisi');
                return;
              }
              if (eventLocation == null) {
                setModalState(() => validationError = 'Lokasi GPS wajib diambil');
                return;
              }
              if (photoKm == null) {
                setModalState(() => validationError = 'Foto KM odometer kendaraan wajib diisi');
                return;
              }
              if (incidentPhoto == null) {
                setModalState(() => validationError = 'Foto bukti kejadian wajib diisi');
                return;
              }

              setModalState(() {
                validationError = null;
                isSubmittingEvent = true;
              });

              try {
                final provider = context.read<TripProvider>();
                final tripService = provider.tripService;

                final formData = FormData.fromMap({
                  'event_type': selectedType,
                  'title': titleController.text.trim(),
                  'description': descController.text.trim(),
                  'severity': selectedSeverity,
                  'current_km': kmController.text.trim(),
                  'latitude': eventLocation!.latitude,
                  'longitude': eventLocation!.longitude,
                  'address': 'Kejadian Kendala',
                  'photo': await MultipartFile.fromFile(incidentPhoto!.path),
                  'photo_km': await MultipartFile.fromFile(photoKm!.path),
                });

                await tripService.client.post('/trips/${widget.tripId}/events', data: formData);

                _loadTripStatus();

                if (sheetContext.mounted) {
                  Navigator.pop(sheetContext);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Laporan darurat berhasil dikirim!'),
                      backgroundColor: AppTheme.success,
                    ),
                  );
                }
              } catch (e) {
                setModalState(() {
                  validationError = 'Gagal mengirim laporan: $e';
                });
              } finally {
                setModalState(() => isSubmittingEvent = false);
              }
            }

            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              padding: EdgeInsets.only(
                top: 20,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 24),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'Lapor Kejadian Darurat',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(sheetContext),
                        )
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 12),
                    const Text('Tipe Kejadian', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: selectedType,
                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      items: const [
                        DropdownMenuItem(value: 'breakdown', child: Text('Kendaraan Mogok')),
                        DropdownMenuItem(value: 'accident', child: Text('Kecelakaan')),
                        DropdownMenuItem(value: 'flat_tire', child: Text('Ban Bocor / Pecah')),
                        DropdownMenuItem(value: 'traffic_jam', child: Text('Macet Total / Jalur Ditutup')),
                        DropdownMenuItem(value: 'other', child: Text('Kejadian Lainnya')),
                      ],
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedType = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    const Text('Judul Kejadian *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(
                        hintText: 'Misal: Ban belakang kanan meletus',
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('KM Saat Ini *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: kmController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        hintText: 'Contoh: 124500',
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Ambil Lokasi GPS *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: eventLocation != null ? Colors.green.shade50 : Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: eventLocation != null ? Colors.green.shade200 : Colors.orange.shade200,
                          width: 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: eventLocation != null ? Colors.green.shade100 : Colors.orange.shade100,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  eventLocation != null ? Icons.location_on : Icons.location_off_outlined,
                                  color: eventLocation != null ? Colors.green.shade800 : Colors.orange.shade800,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      eventLocation != null ? 'GPS Terkunci' : 'GPS Belum Diambil',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: eventLocation != null ? Colors.green.shade900 : Colors.orange.shade900,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      eventLocation != null 
                                          ? 'Akurasi: ±${eventLocation!.accuracy.toStringAsFixed(1)} meter'
                                          : 'Wajib melampirkan lokasi saat ini',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: eventLocation != null ? Colors.green.shade700 : Colors.orange.shade700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (eventLocation != null)
                                const Icon(Icons.check_circle, color: Colors.green, size: 24),
                            ],
                          ),
                          if (eventLocation != null) ...[
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 8.0),
                              child: Divider(color: Colors.green, thickness: 0.5),
                            ),
                            Text(
                              locationStatus ?? '',
                              style: TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 12,
                                color: Colors.green.shade900,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              height: 160,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.green.shade300, width: 1.5),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(10.5),
                                child: FlutterMap(
                                  key: ValueKey('${eventLocation!.latitude}_${eventLocation!.longitude}'),
                                  options: MapOptions(
                                    initialCenter: LatLng(eventLocation!.latitude, eventLocation!.longitude),
                                    initialZoom: 15.0,
                                    interactionOptions: const InteractionOptions(
                                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                                    ),
                                  ),
                                  children: [
                                    TileLayer(
                                      urlTemplate: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                                      userAgentPackageName: 'com.sap.fleet',
                                    ),
                                    MarkerLayer(
                                      markers: [
                                        Marker(
                                          point: LatLng(eventLocation!.latitude, eventLocation!.longitude),
                                          width: 40,
                                          height: 40,
                                          child: const Icon(
                                            Icons.location_on,
                                            color: Colors.red,
                                            size: 40,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                setModalState(() {
                                  locationStatus = "Mendapatkan GPS...";
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

                                  Position pos = await Geolocator.getCurrentPosition(
                                    locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
                                  );
                                  setModalState(() {
                                    eventLocation = pos;
                                    locationStatus = "Latitude: ${pos.latitude.toStringAsFixed(6)}\nLongitude: ${pos.longitude.toStringAsFixed(6)}";
                                  });
                                } catch (e) {
                                  setModalState(() {
                                    locationStatus = "Gagal mendapatkan GPS: $e";
                                  });
                                  ScaffoldMessenger.of(sheetContext).showSnackBar(SnackBar(content: Text('$e')));
                                }
                              },
                              icon: const Icon(Icons.my_location, size: 16),
                              label: Text(eventLocation != null ? 'Perbarui Lokasi GPS' : 'Ambil Lokasi Saat Ini (GPS)'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: eventLocation != null ? Colors.green.shade700 : AppTheme.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Deskripsi Detail', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: 'Jelaskan kronologi singkat, lokasi detil, atau bantuan yang dibutuhkan...',
                        contentPadding: EdgeInsets.all(12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Tingkat Keparahan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildSeverityOption('low', 'Rendah', Colors.green, selectedSeverity, (val) {
                          setModalState(() => selectedSeverity = val);
                        }),
                        const SizedBox(width: 8),
                        _buildSeverityOption('medium', 'Sedang', Colors.orange, selectedSeverity, (val) {
                          setModalState(() => selectedSeverity = val);
                        }),
                        const SizedBox(width: 8),
                        _buildSeverityOption('high', 'Tinggi', Colors.red, selectedSeverity, (val) {
                          setModalState(() => selectedSeverity = val);
                        }),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Foto KM *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: () async {
                                  final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
                                  if (photo != null) {
                                    setModalState(() {
                                      photoKm = File(photo.path);
                                    });
                                  }
                                },
                                child: Container(
                                  height: 100,
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    border: Border.all(color: Colors.grey.shade300),
                                    borderRadius: BorderRadius.circular(12),
                                    color: Colors.grey.shade50,
                                  ),
                                  child: photoKm != null
                                      ? ClipRRect(
                                          borderRadius: BorderRadius.circular(12),
                                          child: Image.file(photoKm!, fit: BoxFit.cover),
                                        )
                                      : Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.speed_outlined, color: Colors.grey.shade400, size: 28),
                                            const SizedBox(height: 4),
                                            const Text('Foto Odometer KM', style: TextStyle(color: Colors.grey, fontSize: 10)),
                                          ],
                                        ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Foto Bukti *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: pickIncidentPhoto,
                                child: Container(
                                  height: 100,
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    border: Border.all(color: Colors.grey.shade300),
                                    borderRadius: BorderRadius.circular(12),
                                    color: Colors.grey.shade50,
                                  ),
                                  child: incidentPhoto != null
                                      ? ClipRRect(
                                          borderRadius: BorderRadius.circular(12),
                                          child: Image.file(incidentPhoto!, fit: BoxFit.cover),
                                        )
                                      : Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.camera_alt_outlined, color: Colors.grey.shade400, size: 28),
                                            const SizedBox(height: 4),
                                            const Text('Foto Kejadian', style: TextStyle(color: Colors.grey, fontSize: 10)),
                                          ],
                                        ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (validationError != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Colors.red, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                validationError!,
                                style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isSubmittingEvent ? null : submitEvent,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red.shade700,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: isSubmittingEvent
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('KIRIM LAPORAN DARURAT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildSeverityOption(
    String value,
    String label,
    Color color,
    String current,
    Function(String) onSelected,
  ) {
    final isSelected = current == value;
    return Expanded(
      child: InkWell(
        onTap: () => onSelected(value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.1) : Colors.white,
            border: Border.all(
              color: isSelected ? color : Colors.grey.shade300,
              width: isSelected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? color : Colors.grey.shade700,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    final bool isExtended = _tripData != null && (_tripData!['is_extended'] == 1 || _tripData!['is_extended'] == true || _tripData!['is_extended'].toString() == '1');

    final steps = [
      {'title': 'Keberangkatan', 'icon': Icons.local_shipping},
      {'title': 'Isi BBM', 'icon': Icons.local_gas_station},
      {'title': 'Bongkar', 'icon': Icons.inventory},
      if (isExtended) {'title': 'Extend Bongkar', 'icon': Icons.add_business_outlined},
      {'title': 'Selesai', 'icon': Icons.assignment_turned_in},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: List.generate(steps.length, (index) {
          final isCompleted = _currentStep > index;
          final isActive = _currentStep == index;
          
          Color circleColor;
          Color iconColor;
          Color textColor;
          FontWeight fontWeight;

          if (isCompleted) {
            circleColor = AppTheme.success.withValues(alpha: 0.15);
            iconColor = AppTheme.success;
            textColor = AppTheme.textSecondary;
            fontWeight = FontWeight.w500;
          } else if (isActive) {
            circleColor = AppTheme.primary;
            iconColor = Colors.white;
            textColor = AppTheme.primary;
            fontWeight = FontWeight.bold;
          } else {
            circleColor = Colors.grey.shade100;
            iconColor = Colors.grey.shade400;
            textColor = Colors.grey.shade400;
            fontWeight = FontWeight.normal;
          }

          return Expanded(
            child: Column(
              children: [
                Row(
                  children: [
                    if (index > 0)
                      Expanded(
                        child: Container(
                          height: 2.5,
                          color: _currentStep >= index ? AppTheme.success : Colors.grey.shade200,
                        ),
                      )
                    else
                      const Spacer(),

                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: circleColor,
                        shape: BoxShape.circle,
                        border: isActive
                            ? Border.all(color: AppTheme.primary.withValues(alpha: 0.2), width: 4)
                            : null,
                      ),
                      child: Center(
                        child: Icon(
                          isCompleted ? Icons.check : steps[index]['icon'] as IconData,
                          size: isCompleted ? 18 : 20,
                          color: iconColor,
                        ),
                      ),
                    ),

                    if (index < steps.length - 1)
                      Expanded(
                        child: Container(
                          height: 2.5,
                          color: _currentStep > index ? AppTheme.success : Colors.grey.shade200,
                        ),
                      )
                    else
                      const Spacer(),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  steps[index]['title'] as String,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: fontWeight,
                    color: textColor,
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildLocationCard() {
    final hasLocation = _currentPosition != null;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: hasLocation ? Colors.green.shade50 : Colors.orange.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasLocation ? Colors.green.shade200 : Colors.orange.shade200,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: hasLocation ? Colors.green.shade100 : Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  hasLocation ? Icons.location_on : Icons.location_off_outlined,
                  color: hasLocation ? Colors.green.shade800 : Colors.orange.shade800,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasLocation ? 'GPS Terkunci' : 'GPS Belum Diambil',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: hasLocation ? Colors.green.shade900 : Colors.orange.shade900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hasLocation 
                          ? 'Akurasi: ±${_currentPosition!.accuracy.toStringAsFixed(1)} meter'
                          : 'Wajib melampirkan lokasi saat ini',
                      style: TextStyle(
                        fontSize: 12,
                        color: hasLocation ? Colors.green.shade700 : Colors.orange.shade700,
                      ),
                    ),
                  ],
                ),
              ),
              if (hasLocation)
                const Icon(Icons.check_circle, color: Colors.green, size: 24),
            ],
          ),
          if (hasLocation) ...[
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8.0),
              child: Divider(color: Colors.green, thickness: 0.5),
            ),
            Text(
              _locationAddress ?? '',
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 12,
                color: Colors.green.shade900,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              height: 160,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade300, width: 1.5),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10.5),
                child: FlutterMap(
                  key: ValueKey('${_currentPosition!.latitude}_${_currentPosition!.longitude}'),
                  options: MapOptions(
                    initialCenter: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                    initialZoom: 15.0,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                      userAgentPackageName: 'com.sap.fleet',
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.location_on,
                            color: Colors.red,
                            size: 40,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _getLocation,
              icon: const Icon(Icons.my_location, size: 16),
              label: Text(hasLocation ? 'Perbarui Lokasi GPS' : 'Ambil Lokasi Saat Ini (GPS)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: hasLocation ? Colors.green.shade700 : AppTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadZone({
    required String title,
    required File? file,
    required String type,
    required bool isRequired,
  }) {
    final hasPhoto = file != null;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasPhoto ? AppTheme.primary.withValues(alpha: 0.3) : Colors.grey.shade200,
          width: 1.5,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => _takePhoto(type),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (hasPhoto)
                Stack(
                  children: [
                    Image.file(
                      file,
                      width: double.infinity,
                      height: 180,
                      fit: BoxFit.cover,
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: CircleAvatar(
                        backgroundColor: Colors.black.withValues(alpha: 0.6),
                        radius: 18,
                        child: IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.white, size: 18),
                          onPressed: () {
                            setState(() {
                              if (type == 'km') _photoKm = null;
                              if (type == 'nota') _photoNota = null;
                              if (type == 'pump') _photoPump = null;
                              if (type == 'activity') _photoActivity = null;
                            });
                          },
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check_circle, color: Colors.green, size: 14),
                            SizedBox(width: 4),
                            Text(
                              'Foto Disimpan',
                              style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                )
              else
                Container(
                  width: double.infinity,
                  height: 120,
                  color: Colors.grey.shade50,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.camera_alt_outlined,
                        size: 36,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isRequired ? 'Wajib dilampirkan *' : 'Opsional',
                        style: TextStyle(
                          fontSize: 11,
                          color: isRequired ? Colors.red.shade700 : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTripHeaderCard() {
    if (_tripData == null) return const SizedBox.shrink();

    final spdNumber = _tripData!['spd_number'] ?? _tripData!['order_number'] ?? '-';
    final destination = _tripData!['destination'] ?? '-';
    final purpose = _tripData!['purpose'] ?? '-';
    final nopol = _tripData!['nopol'] ?? '-';
    final itemsDescription = _tripData!['items_description'];

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primaryDark, AppTheme.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Positioned(
              right: -30,
              top: -30,
              child: CircleAvatar(
                radius: 80,
                backgroundColor: Colors.white.withValues(alpha: 0.04),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(30),
                        ),
                        child: Text(
                          spdNumber,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Text(
                          nopol,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.location_on, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Tujuan Perjalanan:',
                              style: TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              destination,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: Colors.white24, height: 1),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Keperluan:', style: TextStyle(color: Colors.white70, fontSize: 11)),
                            const SizedBox(height: 2),
                            Text(
                              purpose,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      if (itemsDescription != null && itemsDescription.toString().isNotEmpty) ...[
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Muatan:', style: TextStyle(color: Colors.white70, fontSize: 11)),
                              const SizedBox(height: 2),
                              Text(
                                itemsDescription.toString(),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ]
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    final bool isExtended = _tripData != null && (_tripData!['is_extended'] == 1 || _tripData!['is_extended'] == true || _tripData!['is_extended'].toString() == '1');
    
    if (isExtended) {
      switch (_currentStep) {
        case 0:
          return _buildDepartureStep();
        case 1:
          return _buildFuelStep();
        case 2:
          return _buildUnloadingStep();
        case 3:
          return _buildExtendUnloadingStep();
        case 4:
          return _buildReturnStep();
        default:
          return const SizedBox.shrink();
      }
    } else {
      switch (_currentStep) {
        case 0:
          return _buildDepartureStep();
        case 1:
          return _buildFuelStep();
        case 2:
          return _buildUnloadingStep();
        case 3:
          return _buildReturnStep();
        default:
          return const SizedBox.shrink();
      }
    }
  }

  Widget _buildExtendUnloadingStep() {
    final extCompany = _tripData!['extend_company_name'] ?? '-';
    final extUnit = _tripData!['extend_unit_name'] ?? '-';
    final extDest = _tripData!['extend_destination'] ?? '-';
    final extPurpose = _tripData!['extend_purpose'] ?? '-';
    final extNotes = _tripData!['extend_notes'] ?? '-';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Input Data Extend Pengantaran',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.purple.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.purple.shade200, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.purple, size: 18),
                  SizedBox(width: 6),
                  Text(
                    'Informasi Extend Perjalanan:',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.purple, fontSize: 13),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text('Tujuan: $extDest', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
              const SizedBox(height: 4),
              Text('PT / Unit: $extCompany / $extUnit', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              if (extPurpose.isNotEmpty && extPurpose != '-') ...[
                const SizedBox(height: 4),
                Text('Keperluan: $extPurpose', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              ],
              if (extNotes.isNotEmpty && extNotes != '-') ...[
                const SizedBox(height: 4),
                Text('Catatan: $extNotes', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppTheme.textSecondary)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _kmController,
          decoration: const InputDecoration(
            labelText: 'KM Kendaraan Saat Sampai Extend',
            hintText: 'Contoh: 12850',
            prefixIcon: Icon(Icons.speed, color: AppTheme.primary),
            suffixText: 'km',
          ),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 20),
        const Text(
          'Lokasi GPS *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildLocationCard(),
        const SizedBox(height: 20),
        const Text(
          'Dokumentasi Foto *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildUploadZone(
          title: 'Foto Dashboard KM',
          file: _photoKm,
          type: 'km',
          isRequired: true,
        ),
        _buildUploadZone(
          title: 'Foto Sampai / Bongkar Extend',
          file: _photoActivity,
          type: 'activity',
          isRequired: true,
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => _submitCheckpoint('extend_unloading'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple.shade700,
              foregroundColor: Colors.white,
            ),
            child: const Text('SIMPAN DATA EXTEND BONGKAR', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          ),
        )
      ],
    );
  }


  Widget _buildDepartureStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Input Data Keberangkatan',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _kmController,
          decoration: const InputDecoration(
            labelText: 'KM Awal Berangkat',
            hintText: 'Contoh: 12450',
            prefixIcon: Icon(Icons.speed, color: AppTheme.primary),
            suffixText: 'km',
          ),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 20),
        const Text(
          'Lokasi GPS *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildLocationCard(),
        const SizedBox(height: 20),
        const Text(
          'Dokumentasi Foto *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildUploadZone(
          title: 'Foto Dashboard KM',
          file: _photoKm,
          type: 'km',
          isRequired: true,
        ),
        _buildUploadZone(
          title: 'Foto Surat Jalan',
          file: _photoActivity,
          type: 'activity',
          isRequired: true,
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => _submitCheckpoint('departure'),
            child: const Text('MULAI PERJALANAN', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          ),
        )
      ],
    );
  }

  Widget _buildFuelStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Input Pengisian BBM (Opsional)',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _kmController,
          decoration: const InputDecoration(
            labelText: 'KM Saat Isi BBM',
            hintText: 'Contoh: 12550',
            prefixIcon: Icon(Icons.speed, color: AppTheme.primary),
            suffixText: 'km',
          ),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _fuelLitersController,
          decoration: const InputDecoration(
            labelText: 'Jumlah Liter',
            hintText: 'Contoh: 30',
            prefixIcon: Icon(Icons.local_gas_station, color: AppTheme.primary),
            suffixText: 'Liter',
          ),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _fuelCostController,
          decoration: const InputDecoration(
            labelText: 'Biaya BBM',
            hintText: 'Contoh: 350000',
            prefixIcon: Icon(Icons.payments_outlined, color: AppTheme.primary),
            prefixText: 'Rp ',
          ),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 20),
        const Text(
          'Lokasi GPS *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildLocationCard(),
        const SizedBox(height: 20),
        const Text(
          'Dokumentasi Foto *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildUploadZone(
          title: 'Foto Dashboard KM',
          file: _photoKm,
          type: 'km',
          isRequired: true,
        ),
        _buildUploadZone(
          title: 'Foto Nota BBM',
          file: _photoNota,
          type: 'nota',
          isRequired: false,
        ),
        _buildUploadZone(
          title: 'Foto Dispenser / Mesin BBM',
          file: _photoPump,
          type: 'pump',
          isRequired: false,
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _currentStep++),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.grey),
                  foregroundColor: Colors.grey.shade700,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('LEWATI BBM', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: () => _submitCheckpoint('fuel_stop'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('SIMPAN BBM', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
              ),
            ),
          ],
        )
      ],
    );
  }

  Widget _buildUnloadingStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Input Data Tiba / Bongkar Muatan',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _kmController,
          decoration: const InputDecoration(
            labelText: 'KM Saat Tiba (Bongkar)',
            hintText: 'Contoh: 12700',
            prefixIcon: Icon(Icons.speed, color: AppTheme.primary),
            suffixText: 'km',
          ),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 20),
        const Text(
          'Lokasi GPS *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildLocationCard(),
        const SizedBox(height: 20),
        const Text(
          'Dokumentasi Foto *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildUploadZone(
          title: 'Foto Dashboard KM',
          file: _photoKm,
          type: 'km',
          isRequired: true,
        ),
        _buildUploadZone(
          title: 'Foto Aktivitas Bongkar',
          file: _photoActivity,
          type: 'activity',
          isRequired: true,
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => _submitCheckpoint('unloading'),
            child: const Text('SIMPAN DATA BONGKAR', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          ),
        )
      ],
    );
  }

  Widget _buildReturnStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Input Data Kembali / Selesai',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _kmController,
          decoration: const InputDecoration(
            labelText: 'KM Saat Kembali',
            hintText: 'Contoh: 12950',
            prefixIcon: Icon(Icons.speed, color: AppTheme.primary),
            suffixText: 'km',
          ),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 20),
        const Text(
          'Lokasi GPS *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildLocationCard(),
        const SizedBox(height: 20),
        const Text(
          'Dokumentasi Foto *',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildUploadZone(
          title: 'Foto Dashboard KM',
          file: _photoKm,
          type: 'km',
          isRequired: true,
        ),
        _buildUploadZone(
          title: 'Foto Kendaraan di Lokasi Selesai',
          file: _photoActivity,
          type: 'activity',
          isRequired: true,
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => _submitCheckpoint('return_arrival'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.success,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text('SELESAIKAN PERJALANAN', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          ),
        )
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Eksekusi Perjalanan'),
        backgroundColor: Colors.white,
        centerTitle: true,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 26),
            tooltip: 'Lapor Kejadian Darurat',
            onPressed: _showEmergencyDialog,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  children: [
                    _buildTripHeaderCard(),
                    _buildStepIndicator(),
                    const SizedBox(height: 20),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                        border: Border.all(color: Colors.grey.shade100),
                      ),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        child: _buildStepContent(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
