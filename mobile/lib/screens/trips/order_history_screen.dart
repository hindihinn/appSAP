import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/trip_provider.dart';
import '../../services/trip_service.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  String _searchQuery = '';
  String? _selectedStatus;
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text;
      });
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOrders();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    final requesterId = context.read<AuthProvider>().user?.id;
    if (requesterId != null) {
      await context.read<TripProvider>().fetchMyOrders(requesterId);
    }
  }

  Future<void> _confirmWithdraw(BuildContext context, TripOrder order) async {
    final authProvider = context.read<AuthProvider>();
    final tripProvider = context.read<TripProvider>();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Tarik Order?', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text('Apakah Anda yakin ingin menarik order ${order.orderNumber}? Tindakan ini tidak dapat dibatalkan.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal', style: TextStyle(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.danger,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              elevation: 0,
            ),
            child: const Text('Ya, Tarik', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final scaffoldMessenger = ScaffoldMessenger.of(context);
      try {
        await tripProvider.withdrawOrder(order.id, authProvider.user!.id);
        if (mounted) {
          scaffoldMessenger.showSnackBar(
            const SnackBar(
              content: Text('Order berhasil ditarik'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          scaffoldMessenger.showSnackBar(
            SnackBar(
              content: Text(e.toString()),
              backgroundColor: AppTheme.danger,
            ),
          );
        }
      }
    }
  }

  void _showFilterBottomSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final formattedDate = _selectedDate != null
                ? DateFormat('dd MMM yyyy').format(_selectedDate!)
                : null;

            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Filter Order',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      TextButton(
                        onPressed: () {
                          setModalState(() {
                            _selectedStatus = null;
                            _selectedDate = null;
                          });
                        },
                        child: const Text('Reset', style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const Divider(),
                  const SizedBox(height: 12),
                  const Text(
                    'Status Order',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildFilterChip(setModalState, 'Semua', null),
                      _buildFilterChip(setModalState, 'Menunggu', 'pending'),
                      _buildFilterChip(setModalState, 'Review Admin', 'admin_review'),
                      _buildFilterChip(setModalState, 'Review HRGA', 'waiting_hrga'),
                      _buildFilterChip(setModalState, 'Disetujui', 'approved'),
                      _buildFilterChip(setModalState, 'Berjalan', 'in_progress'),
                      _buildFilterChip(setModalState, 'Selesai', 'completed'),
                      _buildFilterChip(setModalState, 'Ditolak / Batal', 'rejected'),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Tanggal Rencana Berangkat',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 10),
                  InkWell(
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate ?? DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2030),
                      );
                      if (date != null) {
                        setModalState(() {
                          _selectedDate = date;
                        });
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today_outlined, size: 18, color: AppTheme.textSecondary),
                          const SizedBox(width: 10),
                          Text(
                            formattedDate ?? 'Pilih Tanggal',
                            style: TextStyle(
                              color: formattedDate != null ? AppTheme.textPrimary : AppTheme.textMuted,
                              fontWeight: formattedDate != null ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                          const Spacer(),
                          if (formattedDate != null)
                            GestureDetector(
                              onTap: () {
                                setModalState(() {
                                  _selectedDate = null;
                                });
                              },
                              child: const Icon(Icons.close, size: 18, color: AppTheme.danger),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {}); // Rebuild screen list
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text(
                        'Terapkan Filter',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildFilterChip(StateSetter setModalState, String label, String? status) {
    final isSelected = _selectedStatus == status;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setModalState(() {
          _selectedStatus = status;
        });
      },
      selectedColor: AppTheme.primary.withOpacity(0.15),
      labelStyle: TextStyle(
        color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: isSelected ? AppTheme.primary : const Color(0xFFCBD5E1)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TripProvider>();
    final allOrders = provider.trips;

    // Filter by Search Query & Selected Status & Selected Date
    final filteredOrders = allOrders.where((order) {
      // 1. Search Query filter (matches order number, destination, items)
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final orderNoMatches = order.orderNumber.toLowerCase().contains(query);
        final destMatches = order.destination.toLowerCase().contains(query);
        final itemsMatches = (order.itemsDescription ?? '').toLowerCase().contains(query);
        if (!orderNoMatches && !destMatches && !itemsMatches) {
          return false;
        }
      }

      // 2. Status filter
      if (_selectedStatus != null && order.status != _selectedStatus) {
        return false;
      }

      // 3. Date filter
      if (_selectedDate != null) {
        if (order.plannedDeparture == null) return false;
        final orderDateStr = order.plannedDeparture!.split('T').first;
        final filterDateStr = DateFormat('yyyy-MM-dd').format(_selectedDate!);
        if (orderDateStr != filterDateStr) {
          return false;
        }
      }

      return true;
    }).toList();

    // Filter active orders vs completed/rejected/cancelled history
    final activeOrders = filteredOrders.where((t) => t.status != 'completed' && t.status != 'rejected' && t.status != 'cancelled').toList();
    final historyOrders = filteredOrders.where((t) => t.status == 'completed' || t.status == 'rejected' || t.status == 'cancelled').toList();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          title: const Text('Riwayat Order Dinas', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
          elevation: 0,
          backgroundColor: Colors.white,
          iconTheme: const IconThemeData(color: AppTheme.textPrimary),
          bottom: const TabBar(
            indicatorColor: AppTheme.primary,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.textSecondary,
            labelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            tabs: [
              Tab(text: 'Order Aktif'),
              Tab(text: 'Selesai & Batal'),
            ],
          ),
        ),
        body: provider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  // Search & Filter Row
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 42,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: TextField(
                              key: const ValueKey('history_search_field'),
                              controller: _searchController,
                              focusNode: _searchFocusNode,
                              onChanged: (value) {
                                setState(() {
                                  _searchQuery = value;
                                });
                              },
                              decoration: InputDecoration(
                                hintText: 'Cari order, tujuan, muatan...',
                                hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                                prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textMuted, size: 20),
                                suffixIcon: _searchQuery.isNotEmpty
                                    ? IconButton(
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        icon: const Icon(Icons.clear_rounded, color: AppTheme.textMuted, size: 18),
                                        onPressed: () {
                                          _searchController.clear();
                                          setState(() {
                                            _searchQuery = '';
                                          });
                                        },
                                      )
                                    : null,
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                              style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              height: 42,
                              width: 42,
                              decoration: BoxDecoration(
                                color: (_selectedStatus != null || _selectedDate != null)
                                    ? AppTheme.primary.withOpacity(0.1)
                                    : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: (_selectedStatus != null || _selectedDate != null)
                                      ? AppTheme.primary
                                      : Colors.transparent,
                                  width: 1,
                                ),
                              ),
                              child: IconButton(
                                icon: Icon(
                                  Icons.filter_list_rounded,
                                  color: (_selectedStatus != null || _selectedDate != null)
                                      ? AppTheme.primary
                                      : AppTheme.textSecondary,
                                  size: 20,
                                ),
                                onPressed: _showFilterBottomSheet,
                              ),
                            ),
                            if (_selectedStatus != null || _selectedDate != null)
                              Positioned(
                                top: -2,
                                right: -2,
                                child: Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: AppTheme.danger,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // TabBarView List
                  Expanded(
                    child: TabBarView(
                      children: [
                        _buildList(activeOrders, isActive: true),
                        _buildList(historyOrders, isActive: false),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildList(List<TripOrder> orders, {required bool isActive}) {
    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isActive ? Icons.pending_actions_rounded : Icons.history_toggle_off_rounded,
              size: 64,
              color: AppTheme.textMuted.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              isActive ? 'Belum ada order dinas aktif' : 'Belum ada riwayat order',
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 16, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOrders,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final order = orders[index];
          
          Color badgeColor;
          switch (order.status) {
            case 'pending':
              badgeColor = AppTheme.warning;
              break;
            case 'admin_review':
            case 'waiting_hrga':
            case 'approved':
            case 'in_progress':
              badgeColor = AppTheme.info;
              break;
            case 'completed':
              badgeColor = AppTheme.success;
              break;
            case 'rejected':
            default:
              badgeColor = AppTheme.danger;
              break;
          }

          return OrderHistoryCard(
            order: order,
            badgeColor: badgeColor,
            onWithdraw: () => _confirmWithdraw(context, order),
          );
        },
      ),
    );
  }
}

class OrderHistoryCard extends StatefulWidget {
  final TripOrder order;
  final Color badgeColor;
  final VoidCallback onWithdraw;

  const OrderHistoryCard({
    super.key,
    required this.order,
    required this.badgeColor,
    required this.onWithdraw,
  });

  @override
  State<OrderHistoryCard> createState() => _OrderHistoryCardState();
}

class _OrderHistoryCardState extends State<OrderHistoryCard> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final badgeColor = widget.badgeColor;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(
                color: badgeColor,
                width: 5,
              ),
            ),
          ),
          child: InkWell(
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Row: Order Number & Status
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        order.spdNumber ?? order.orderNumber,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primary,
                          fontSize: 14,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: badgeColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          order.statusLabel,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: badgeColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Dates and Collapsible indicator
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined, size: 14, color: AppTheme.textMuted),
                      const SizedBox(width: 8),
                      Text(
                        order.plannedDeparture != null
                            ? DateFormat('dd MMM yyyy').format(DateTime.parse(order.plannedDeparture!))
                            : '-',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        _isExpanded ? 'Tutup Detail' : 'Lihat Detail',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        _isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        size: 18,
                        color: AppTheme.primary,
                      ),
                    ],
                  ),

                  // Collapsible Section using AnimatedCrossFade
                  AnimatedCrossFade(
                    firstChild: const SizedBox.shrink(),
                    secondChild: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Divider(height: 24, color: Color(0xFFE2E8F0)),
                        
                        // Destination
                        const Text(
                          'Tujuan:',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          order.destination,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 12),

                        // Muatan
                        const Text(
                          'Barang / Muatan:',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          order.itemsDescription ?? 'Detail muatan kosong',
                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                        ),
                        const SizedBox(height: 12),

                        // Keterangan
                        if (order.purpose.isNotEmpty) ...[
                          const Text(
                            'Keterangan Keperluan:',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            order.purpose,
                            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                          ),
                          const SizedBox(height: 12),
                        ],

                        // Kendaraan
                        const Text(
                          'Kendaraan & Nopol:',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.local_shipping_outlined, size: 16, color: AppTheme.textMuted),
                            const SizedBox(width: 8),
                            Text(
                              order.nopol ?? 'Belum ada kendaraan',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: order.nopol != null ? AppTheme.textSecondary : AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),

                        // Tarik Order Button
                        if (order.status == 'pending') ...[
                          const Divider(height: 24, color: Color(0xFFE2E8F0)),
                          SizedBox(
                            width: double.infinity,
                            height: 38,
                            child: OutlinedButton.icon(
                              onPressed: widget.onWithdraw,
                              icon: const Icon(Icons.undo_rounded, size: 16, color: AppTheme.danger),
                              label: const Text(
                                'Tarik Order',
                                style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppTheme.danger),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ]
                      ],
                    ),
                    crossFadeState: _isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                    duration: const Duration(milliseconds: 200),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

