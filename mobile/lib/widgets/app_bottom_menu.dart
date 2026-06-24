import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../config/theme.dart';
import '../config/routes.dart';

class AppBottomMenu extends StatelessWidget {
  const AppBottomMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final initials = user?.name.split(' ').map((n) => n.isNotEmpty ? n[0] : '').join('').take(2).toUpperCase() ?? 'U';

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          
          // User Info Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                  child: Text(
                    initials,
                    style: const TextStyle(
                      color: AppTheme.primaryDark,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? 'Unknown User',
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          (user?.roleDisplayName ?? 'Staff').toUpperCase(),
                          style: const TextStyle(
                            color: AppTheme.primaryDark,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const Divider(),
          
          // Menu Items
          Flexible(
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                _buildMenuItem(
                  context,
                  icon: Icons.dashboard_rounded,
                  title: 'Dashboard',
                  route: AppRoutes.dashboard,
                  isSelected: ModalRoute.of(context)?.settings.name == AppRoutes.dashboard,
                ),
                
                if (user?.roleId == 4) ...[
                  const SizedBox(height: 12),
                  _buildSectionHeader('Operasional Gudang'),
                  _buildMenuItem(context, icon: Icons.add_box_rounded, title: 'Buat Order Dinas', route: AppRoutes.createOrder),
                  _buildMenuItem(context, icon: Icons.list_alt_rounded, title: 'History Order', route: null),
                ],

                if (user?.roleId == 5) ...[
                  const SizedBox(height: 12),
                  _buildSectionHeader('Tugas Driver'),
                  _buildMenuItem(context, icon: Icons.local_shipping_rounded, title: 'Tugas Perjalanan', route: AppRoutes.driverTasks),
                  _buildMenuItem(context, icon: Icons.history_rounded, title: 'History Perjalanan', route: null),
                ],
                
                const SizedBox(height: 16),
                const Divider(),
                
                _buildMenuItem(
                  context,
                  icon: Icons.logout_rounded,
                  title: 'Logout',
                  route: null,
                  isDanger: true,
                  onTapOverride: () async {
                    final authProvider = Provider.of<AuthProvider>(context, listen: false);
                    await authProvider.logout();
                    if (context.mounted) {
                      Navigator.of(context).pushReplacementNamed(AppRoutes.login);
                    }
                  },
                ),
              ],
            ),
          ),
          SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, top: 8, bottom: 8, right: 16),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: Colors.grey.shade400,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String? route,
    bool isSelected = false,
    bool isDanger = false,
    VoidCallback? onTapOverride,
  }) {
    final bool currentlySelected = isSelected || (route != null && ModalRoute.of(context)?.settings.name == route);
    
    final Color contentColor = currentlySelected
        ? Colors.white
        : isDanger
            ? Colors.redAccent
            : AppTheme.textPrimary;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: currentlySelected ? AppTheme.primary : (isDanger ? Colors.red.shade50 : Colors.grey.shade50),
        borderRadius: BorderRadius.circular(16),
        boxShadow: currentlySelected
            ? [BoxShadow(color: AppTheme.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 3))]
            : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTapOverride ?? () {
            Navigator.pop(context); // Always close the bottom sheet first
            
            if (route != null && !currentlySelected) {
              if (route == AppRoutes.dashboard) {
                // If going to dashboard, clear the stack to prevent infinite stacking
                Navigator.of(context).pushNamedAndRemoveUntil(route, (r) => false);
              } else {
                // Push new screen so it has a back button
                Navigator.of(context).pushNamed(route);
              }
            } else if (route == null) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$title is coming soon')));
            }
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              children: [
                Icon(icon, color: contentColor, size: 24),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      color: contentColor,
                      fontWeight: currentlySelected || isDanger ? FontWeight.bold : FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                ),
                if (!currentlySelected && !isDanger)
                  Icon(Icons.chevron_right, color: Colors.grey.shade300, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

extension StringExtension on String {
  String take(int n) {
    if (length <= n) return this;
    return substring(0, n);
  }
}
