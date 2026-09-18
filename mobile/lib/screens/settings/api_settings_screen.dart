import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../config/api_config.dart';
import '../../config/theme.dart';

class ApiSettingsScreen extends StatefulWidget {
  const ApiSettingsScreen({super.key});

  @override
  State<ApiSettingsScreen> createState() => _ApiSettingsScreenState();
}

class _ApiSettingsScreenState extends State<ApiSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _urlController;

  bool _isTesting = false;
  String? _testResult;
  bool _testSuccess = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: ApiConfig.baseUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  /// Test koneksi ke URL yang diinput
  Future<void> _testConnection() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
      ));

      // Ping endpoint health check atau root API
      final pingUrl = url.replaceAll(RegExp(r'/api$'), '');
      await dio.get(pingUrl);

      setState(() {
        _testSuccess = true;
        _testResult = '✅ Koneksi berhasil ke $pingUrl';
      });
    } on DioException catch (e) {
      // Jika server membalas (misal 401/404), berarti server memang hidup
      if (e.response != null) {
        setState(() {
          _testSuccess = true;
          _testResult = '✅ Server ditemukan (status ${e.response?.statusCode})';
        });
      } else {
        setState(() {
          _testSuccess = false;
          _testResult = '❌ Gagal terhubung: ${e.message}';
        });
      }
    } catch (e) {
      setState(() {
        _testSuccess = false;
        _testResult = '❌ Error: $e';
      });
    } finally {
      setState(() => _isTesting = false);
    }
  }

  Future<void> _saveAndApply() async {
    if (!_formKey.currentState!.validate()) return;

    final newUrl = _urlController.text.trim();
    await ApiConfig.setBaseUrl(newUrl);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(children: [
          const Icon(Icons.check_circle, color: Colors.white),
          const SizedBox(width: 8),
          Expanded(child: Text('URL API disimpan: ${ApiConfig.hostDisplay}')),
        ]),
        backgroundColor: Colors.green.shade700,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
    Navigator.of(context).pop(true); // return true = ada perubahan
  }

  Future<void> _resetDefault() async {
    await ApiConfig.resetToDefault();
    setState(() {
      _urlController.text = ApiConfig.defaultBaseUrl;
      _testResult = null;
    });
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('URL direset ke default'),
        backgroundColor: Colors.orange.shade700,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Pengaturan API', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Info Card ──────────────────────────────────────
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryDark, Color(0xFF1E3A8A), AppTheme.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withOpacity(0.25),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.dns_rounded, color: Colors.white, size: 24),
                        ),
                        const SizedBox(width: 12),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Server Aktif', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w500)),
                            Text('API Connection', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                          ],
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            ApiConfig.isCustomUrl ? 'CUSTOM' : 'DEFAULT',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      ApiConfig.hostDisplay,
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      ApiConfig.baseUrl,
                      style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // ── Input URL ──────────────────────────────────────
              const Text(
                'URL API Server',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 4),
              Text(
                'Masukkan URL lengkap termasuk port dan path /api',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _urlController,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration: InputDecoration(
                  hintText: 'http://192.168.x.x:5000/api',
                  prefixIcon: const Icon(Icons.link, color: AppTheme.primary),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.clear, color: Colors.grey),
                    onPressed: () => _urlController.clear(),
                  ),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.primary, width: 2),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'URL tidak boleh kosong';
                  if (!val.startsWith('http://') && !val.startsWith('https://')) {
                    return 'URL harus diawali http:// atau https://';
                  }
                  return null;
                },
                onChanged: (_) => setState(() => _testResult = null),
              ),

              const SizedBox(height: 16),

              // ── Quick Fill Buttons ─────────────────────────────
              const Text('Quick Fill:', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _quickFillChip('Emulator', 'http://10.0.2.2:5000/api'),
                  _quickFillChip('Localhost', 'http://localhost:5000/api'),
                  _quickFillChip('Default', ApiConfig.defaultBaseUrl),
                ],
              ),

              const SizedBox(height: 20),

              // ── Test Connection ────────────────────────────────
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _isTesting ? null : _testConnection,
                  icon: _isTesting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.wifi_tethering),
                  label: Text(_isTesting ? 'Mengecek...' : 'Test Koneksi'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primary,
                    side: const BorderSide(color: AppTheme.primary),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),

              if (_testResult != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _testSuccess ? Colors.green.shade50 : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _testSuccess ? Colors.green.shade200 : Colors.red.shade200,
                    ),
                  ),
                  child: Text(
                    _testResult!,
                    style: TextStyle(
                      color: _testSuccess ? Colors.green.shade800 : Colors.red.shade800,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 28),

              // ── Action Buttons ─────────────────────────────────
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _saveAndApply,
                  icon: const Icon(Icons.save_alt_rounded),
                  label: const Text('SIMPAN & TERAPKAN', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 3,
                  ),
                ),
              ),

              const SizedBox(height: 12),

              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: _resetDefault,
                  icon: const Icon(Icons.restore, color: Colors.orange),
                  label: const Text('Reset ke Default', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.w600)),
                ),
              ),

              const SizedBox(height: 28),

              // ── Panduan ────────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue.shade100),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue.shade700, size: 18),
                        const SizedBox(width: 8),
                        Text('Panduan URL', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade700)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _guideRow('📱 Android Emulator', 'http://10.0.2.2:5000/api'),
                    _guideRow('🍎 iOS Simulator', 'http://localhost:5000/api'),
                    _guideRow('📲 Real Device (Wi-Fi)', 'http://<IP-Komputer>:5000/api'),
                    const SizedBox(height: 8),
                    Text(
                      '💡 Cek IP komputer kamu di: Settings → Wi-Fi → Info jaringan',
                      style: TextStyle(color: Colors.blue.shade600, fontSize: 11, fontStyle: FontStyle.italic),
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

  Widget _quickFillChip(String label, String url) {
    final isActive = _urlController.text.trim() == url;
    return ActionChip(
      label: Text(label, style: TextStyle(fontSize: 12, color: isActive ? Colors.white : AppTheme.primary, fontWeight: FontWeight.w600)),
      backgroundColor: isActive ? AppTheme.primary : Colors.white,
      side: BorderSide(color: isActive ? AppTheme.primary : Colors.grey.shade300),
      onPressed: () {
        setState(() {
          _urlController.text = url;
          _testResult = null;
        });
      },
    );
  }

  Widget _guideRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(fontSize: 11, color: Colors.blue.shade700, fontFamily: 'monospace'),
            ),
          ),
        ],
      ),
    );
  }
}
