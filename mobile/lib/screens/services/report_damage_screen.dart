import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/trip_provider.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';

class ReportDamageScreen extends StatefulWidget {
  const ReportDamageScreen({super.key});

  @override
  State<ReportDamageScreen> createState() => _ReportDamageScreenState();
}

class _ReportDamageScreenState extends State<ReportDamageScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descController = TextEditingController();
  final _notesController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  String _selectedDamageType = 'mesin';
  List<File> _selectedPhotos = [];
  Map<String, dynamic>? _activeVehicle;
  bool _loadingVehicle = true;
  bool _submitting = false;
  String? _vehicleError;

  // History State - Simple & Conflict-Free
  List<dynamic> _historyTickets = [];
  bool _loadingHistory = false;
  String? _historyError;
  final Map<dynamic, List<dynamic>> _ticketPhotosMap = {}; // Cache photos by ticket ID
  final Map<dynamic, bool> _loadingPhotosMap = {};

  final List<Map<String, String>> _damageTypes = [
    {'value': 'mesin', 'label': 'Masalah Mesin / Transmisi'},
    {'value': 'rem', 'label': 'Masalah Sistem Rem'},
    {'value': 'ban', 'label': 'Ban Bocor / Pecah / Aus'},
    {'value': 'kelistrikan', 'label': 'Masalah Kelistrikan / Aki / Lampu'},
    {'value': 'suspensi', 'label': 'Suspensi / Kaki-kaki Bunyi'},
    {'value': 'body', 'label': 'Kerusakan Body / Cat'},
    {'value': 'ac', 'label': 'AC Tidak Dingin'},
    {'value': 'lainnya', 'label': 'Kendala Kerusakan Lainnya'},
  ];

  @override
  void initState() {
    super.initState();
    _loadActiveVehicle();
    _loadHistory();
  }

  @override
  void dispose() {
    _descController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadActiveVehicle() async {
    setState(() {
      _loadingVehicle = true;
      _vehicleError = null;
    });

    try {
      final client = context.read<TripProvider>().tripService.client;
      final res = await client.get('/services/tickets/active-vehicle');
      if (res.data['success'] == true) {
        setState(() {
          _activeVehicle = res.data['data'];
        });
      }
    } on DioException catch (e) {
      setState(() {
        _vehicleError = e.response?.data['message'] ?? 'Gagal memuat kendaraan aktif';
      });
    } catch (e) {
      setState(() {
        _vehicleError = 'Gagal memuat kendaraan aktif';
      });
    } finally {
      setState(() {
        _loadingVehicle = false;
      });
    }
  }

  Future<void> _loadHistory() async {
    setState(() {
      _loadingHistory = true;
      _historyError = null;
    });

    try {
      final client = context.read<TripProvider>().tripService.client;
      final res = await client.get('/services/tickets');
      if (res.data['success'] == true) {
        setState(() {
          _historyTickets = res.data['data'] ?? [];
        });
      }
    } catch (e) {
      setState(() {
        _historyError = 'Gagal memuat riwayat laporan';
      });
    } finally {
      setState(() {
        _loadingHistory = false;
      });
    }
  }

  Future<void> _loadTicketPhotos(dynamic ticketId) async {
    if (_ticketPhotosMap.containsKey(ticketId)) return; // Already cached

    setState(() {
      _loadingPhotosMap[ticketId] = true;
    });

    try {
      final client = context.read<TripProvider>().tripService.client;
      final res = await client.get('/services/tickets/$ticketId');
      if (res.data['success'] == true) {
        if (!mounted) return;
        setState(() {
          _ticketPhotosMap[ticketId] = res.data['data']['photos'] ?? [];
        });
      }
    } catch (e) {
      debugPrint('Error loading photos for ticket $ticketId: $e');
    } finally {
      if (mounted) {
        setState(() {
          _loadingPhotosMap[ticketId] = false;
        });
      }
    }
  }

  Future<void> _pickPhoto() async {
    if (_selectedPhotos.length >= 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maksimal melampirkan 5 foto kerusakan')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Ambil Foto Kamera'),
              onTap: () async {
                Navigator.pop(context);
                final XFile? image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
                if (image != null) {
                  setState(() {
                    _selectedPhotos.add(File(image.path));
                  });
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Pilih dari Galeri'),
              onTap: () async {
                Navigator.pop(context);
                final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
                if (image != null) {
                  setState(() {
                    _selectedPhotos.add(File(image.path));
                  });
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  void _removePhoto(int index) {
    setState(() {
      _selectedPhotos.removeAt(index);
    });
  }

  Future<void> _submitReport() async {
    if (_activeVehicle == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Anda tidak memiliki kendaraan aktif untuk dilaporkan')),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    if (_selectedPhotos.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Wajib melampirkan minimal 1 foto kerusakan')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final client = context.read<TripProvider>().tripService.client;

      final List<MultipartFile> photoUploads = [];
      for (final file in _selectedPhotos) {
        photoUploads.add(await MultipartFile.fromFile(file.path));
      }

      final formData = FormData.fromMap({
        'damage_type': _selectedDamageType,
        'description': _descController.text.trim(),
        'notes': _notesController.text.trim(),
        'photos': photoUploads,
      });

      final res = await client.post('/services/tickets', data: formData);

      if (res.data['success'] == true && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Laporan berhasil dikirim! Tiket: ${res.data['data']['ticket_number']}'),
            backgroundColor: AppTheme.success,
          ),
        );
        
        // Reset Form
        _descController.clear();
        _notesController.clear();
        _selectedPhotos.clear();
        setState(() {
          _selectedDamageType = 'mesin';
        });

        // Reload history
        _loadHistory();
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal mengirim: ${e.response?.data['message'] ?? e.message}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Terjadi kesalahan koneksi server'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _buildStatusBadge(String status) {
    Color bg;
    Color text;
    String label;

    switch (status) {
      case 'pending':
        bg = Colors.orange.shade50;
        text = Colors.orange.shade700;
        label = 'PENDING';
        break;
      case 'approved':
        bg = Colors.blue.shade50;
        text = Colors.blue.shade700;
        label = 'PROSES WO';
        break;
      case 'completed':
        bg = Colors.green.shade50;
        text = Colors.green.shade700;
        label = 'SELESAI';
        break;
      default:
        bg = Colors.grey.shade50;
        text = Colors.grey.shade700;
        label = status.toUpperCase();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(
        label,
        style: TextStyle(color: text, fontSize: 9.5, fontWeight: FontWeight.bold, letterSpacing: 0.5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          title: const Text('Laporan Kerusakan', style: TextStyle(fontWeight: FontWeight.bold)),
          elevation: 0,
          backgroundColor: Colors.white,
          iconTheme: const IconThemeData(color: AppTheme.textPrimary),
          bottom: const TabBar(
            labelColor: AppTheme.primary,
            unselectedLabelColor: Colors.grey,
            indicatorColor: AppTheme.primary,
            indicatorWeight: 3,
            tabs: [
              Tab(text: 'Lapor Baru', icon: Icon(Icons.add_circle_outline, size: 20)),
              Tab(text: 'History Laporan', icon: Icon(Icons.history, size: 20)),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Tab 1: Form Lapor Baru
            _loadingVehicle
                ? const Center(child: CircularProgressIndicator())
                : _vehicleError != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.error_outline_rounded, size: 64, color: Colors.orange.shade300),
                              const SizedBox(height: 16),
                              Text(_vehicleError!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 20),
                              ElevatedButton.icon(
                                onPressed: _loadActiveVehicle,
                                icon: const Icon(Icons.refresh),
                                label: const Text('Muat Ulang'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : Form(
                        key: _formKey,
                        child: ListView(
                          padding: const EdgeInsets.all(20.0),
                          children: [
                            // Active Vehicle Summary card
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.06),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
                              ),
                              child: Row(
                                children: [
                                  const CircleAvatar(
                                    radius: 22,
                                    backgroundColor: AppTheme.primary,
                                    child: Icon(Icons.local_shipping, color: Colors.white),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _activeVehicle?['nopol'] ?? 'Nopol',
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.primaryDark),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${_activeVehicle?['merk']} ${_activeVehicle?['model']}',
                                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                                    child: Text('AKTIF', style: TextStyle(color: Colors.green.shade700, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Damage Type Selection
                            const Text('Jenis Kerusakan *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              value: _selectedDamageType,
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              ),
                              items: _damageTypes.map((t) {
                                return DropdownMenuItem(value: t['value'], child: Text(t['label']!));
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedDamageType = val);
                              },
                            ),
                            const SizedBox(height: 20),

                            // Description
                            const Text('Deskripsi Kerusakan *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _descController,
                              maxLines: 4,
                              decoration: InputDecoration(
                                hintText: 'Tulis deskripsi detail bagian kerusakan (contoh: rem berbunyi decit saat pedal diinjak dalam)',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) return 'Deskripsi wajib diisi';
                                return null;
                              },
                            ),
                            const SizedBox(height: 20),

                            // Notes
                            const Text('Keterangan Tambahan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _notesController,
                              decoration: InputDecoration(
                                hintText: 'Keterangan tambahan (optional)',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Image attachments row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Foto Kerusakan * (Min. 1)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                Text('${_selectedPhotos.length}/5', style: TextStyle(color: Colors.grey.shade500, fontSize: 13, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Grid of photos
                            GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 3,
                                crossAxisSpacing: 10,
                                mainAxisSpacing: 10,
                              ),
                              itemCount: _selectedPhotos.length + (_selectedPhotos.length < 5 ? 1 : 0),
                              itemBuilder: (context, idx) {
                                if (idx == _selectedPhotos.length) {
                                  return InkWell(
                                    onTap: _pickPhoto,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.grey.shade300),
                                      ),
                                      child: const Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.add_photo_alternate_rounded, color: AppTheme.primary, size: 28),
                                          SizedBox(height: 4),
                                          Text('Tambah Foto', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                        ],
                                      ),
                                    ),
                                  );
                                }

                                return Stack(
                                  children: [
                                    Positioned.fill(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.file(_selectedPhotos[idx], fit: BoxFit.cover),
                                      ),
                                    ),
                                    Positioned(
                                      top: 4,
                                      right: 4,
                                      child: GestureDetector(
                                        onTap: () => _removePhoto(idx),
                                        child: Container(
                                          padding: const EdgeInsets.all(4),
                                          decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                          child: const Icon(Icons.close, color: Colors.white, size: 14),
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                            const SizedBox(height: 32),

                            // Submit Button
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: ElevatedButton(
                                onPressed: _submitting ? null : _submitReport,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primary,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  elevation: 2,
                                ),
                                child: _submitting
                                    ? const CircularProgressIndicator(color: Colors.white)
                                    : const Text(
                                        'KIRIM LAPORAN KERUSAKAN',
                                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),

            // Tab 2: History Laporan
            RefreshIndicator(
              onRefresh: _loadHistory,
              color: AppTheme.primary,
              child: _loadingHistory && _historyTickets.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _historyError != null
                      ? ListView(
                          padding: const EdgeInsets.all(24.0),
                          children: [
                            const SizedBox(height: 40),
                            Center(
                              child: Column(
                                children: [
                                  Icon(Icons.error_outline, size: 60, color: Colors.orange.shade300),
                                  const SizedBox(height: 16),
                                  Text(_historyError!, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 16),
                                  ElevatedButton(onPressed: _loadHistory, child: const Text('Muat Ulang')),
                                ],
                              ),
                            ),
                          ],
                        )
                      : _historyTickets.isEmpty
                          ? ListView(
                              padding: const EdgeInsets.all(24.0),
                              children: [
                                const SizedBox(height: 60),
                                Center(
                                  child: Column(
                                    children: [
                                      Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade300),
                                      const SizedBox(height: 16),
                                      const Text(
                                        'Belum ada riwayat laporan',
                                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                      ),
                                      const SizedBox(height: 4),
                                      const Text(
                                        'Laporan kerusakan yang Anda kirim akan muncul di sini',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _historyTickets.length,
                              itemBuilder: (context, index) {
                                final ticket = _historyTickets[index];
                                final ticketId = ticket['id'];
                                final String createdAtStr = ticket['created_at']?.toString() ?? '';
                                final parsedDate = DateTime.tryParse(createdAtStr)?.toLocal();
                                final dateString = parsedDate != null
                                    ? "${parsedDate.day.toString().padLeft(2, '0')}-${parsedDate.month.toString().padLeft(2, '0')}-${parsedDate.year} ${parsedDate.hour.toString().padLeft(2, '0')}:${parsedDate.minute.toString().padLeft(2, '0')}"
                                    : createdAtStr;
                                final damageType = ticket['damage_type']?.toString().toUpperCase() ?? '';

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: Colors.grey.shade200),
                                  ),
                                  child: Theme(
                                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                                    child: ExpansionTile(
                                      key: ValueKey<String>('ticket_$ticketId'),
                                      onExpansionChanged: (expanded) {
                                        if (expanded) {
                                          _loadTicketPhotos(ticketId);
                                        }
                                      },
                                      title: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            ticket['ticket_number']?.toString() ?? '',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace'),
                                          ),
                                          _buildStatusBadge(ticket['status']?.toString() ?? 'pending'),
                                        ],
                                      ),
                                      subtitle: Padding(
                                        padding: const EdgeInsets.only(top: 4.0),
                                        child: Text(
                                          'Jenis: $damageType · $dateString',
                                          style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                                        ),
                                      ),
                                      children: [
                                        Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              const Divider(),
                                              const SizedBox(height: 6),
                                              const Text('Deskripsi Kerusakan:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textPrimary)),
                                              const SizedBox(height: 4),
                                              Text(ticket['description']?.toString() ?? '', style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                                              
                                              if (ticket['notes'] != null && ticket['notes'].toString().isNotEmpty) ...[
                                                const SizedBox(height: 12),
                                                const Text('Keterangan Tambahan:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textPrimary)),
                                                const SizedBox(height: 4),
                                                Text(ticket['notes'].toString(), style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey.shade600)),
                                              ],

                                              const SizedBox(height: 16),
                                              const Text('Foto Lampiran Bukti:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textPrimary)),
                                              const SizedBox(height: 8),

                                              _loadingPhotosMap[ticketId] == true
                                                  ? const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)))
                                                  : _buildPhotosList(ticketId),
                                              const SizedBox(height: 10),
                                            ],
                                          ),
                                        )
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  } // end build()

  Widget _buildPhotosList(dynamic ticketId) {
    final photos = _ticketPhotosMap[ticketId] ?? [];
    if (photos.isEmpty) {
      return Text(
        'Tidak ada foto terlampir.',
        style: TextStyle(color: Colors.grey.shade500, fontSize: 12, fontStyle: FontStyle.italic),
      );
    }

    final String baseUrl = ApiConfig.imageUrl;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: photos.map<Widget>((photo) {
          final String photoUrl = photo['photo_path']?.toString() ?? '';
          if (photoUrl.isEmpty) return const SizedBox();
          final String fullUrl = photoUrl.startsWith('http') ? photoUrl : '$baseUrl$photoUrl';
          return _PhotoThumbnail(url: fullUrl);
        }).toList(),
      ),
    );
  }
}

// ── Isolated photo thumbnail widget ───────────────────────────────────────────
class _PhotoThumbnail extends StatefulWidget {
  final String url;
  const _PhotoThumbnail({required this.url});

  @override
  State<_PhotoThumbnail> createState() => _PhotoThumbnailState();
}

class _PhotoThumbnailState extends State<_PhotoThumbnail> {
  bool _error = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: _error
            ? const Center(child: Icon(Icons.image_outlined, color: Colors.grey, size: 28))
            : Image.network(
                widget.url,
                fit: BoxFit.cover,
                width: 80,
                height: 80,
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.0),
                    ),
                  );
                },
                errorBuilder: (context, error, stack) {
                  // Schedule setState after frame to avoid build-phase conflicts
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted) setState(() => _error = true);
                  });
                  return const Center(child: Icon(Icons.image_outlined, color: Colors.grey, size: 28));
                },
              ),
      ),
    );
  }
}
