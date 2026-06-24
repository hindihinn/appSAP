import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../config/theme.dart';
import '../config/routes.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final initials = user?.name.split(' ').map((n) => n.isNotEmpty ? n[0] : '').join('').take(2).toUpperCase() ?? 'U';

    return Drawer(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.white,
      child: Column(
        children: [
          // Custom Premium Header
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 24,
              bottom: 24,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primaryDark, AppTheme.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 4))
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.grey.shade100,
                    child: Text(
                      initials,
                      style: const TextStyle(
                        color: AppTheme.primaryDark,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
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
                          color: Colors.white,
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
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          (user?.roleDisplayName ?? 'Staff').toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
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
          
          const SizedBox(height: 12),
          
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _buildMenuItem(
                  context,
                  icon: Icons.dashboard_rounded,
                  title: 'Dashboard',
                  route: AppRoutes.dashboard,
                  // Currently we don't have a reliable way to get current route easily in this setup without a RouteObserver,
                  // so for now we'll just not force isSelected:true statically, or we can check ModalRoute.
                  isSelected: ModalRoute.of(context)?.settings.name == AppRoutes.dashboard,
                ),
                
                if (user?.roleId == 4) ...[
                  const SizedBox(height: 16),
                  _buildSectionHeader('Operasional Gudang'),
                  _buildMenuItem(context, icon: Icons.add_box_rounded, title: 'Buat Order Dinas', route: AppRoutes.createOrder),
                  _buildMenuItem(context, icon: Icons.list_alt_rounded, title: 'History Order', route: null),
                ],

                if (user?.roleId == 5) ...[
                  const SizedBox(height: 16),
                  _buildSectionHeader('Tugas Driver'),
                  _buildMenuItem(context, icon: Icons.local_shipping_rounded, title: 'Tugas Perjalanan', route: AppRoutes.driverTasks),
                  _buildMenuItem(context, icon: Icons.history_rounded, title: 'History Perjalanan', route: null),
                ],
              ],
            ),
          ),
          
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: _buildMenuItem(
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
          ),
          SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
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
          fontWeight: FontWeight.w700,
          color: Colors.grey.shade500,
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
    // If it's the current route, we consider it selected.
    final bool currentlySelected = isSelected || (route != null && ModalRoute.of(context)?.settings.name == route);
    
    final Color contentColor = currentlySelected
        ? Colors.white
        : isDanger
            ? Colors.redAccent
            : AppTheme.textPrimary;

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: currentlySelected ? AppTheme.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        boxShadow: currentlySelected
            ? [BoxShadow(color: AppTheme.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 3))]
            : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTapOverride ?? () {
            if (route != null) {
              if (currentlySelected) {
                Navigator.pop(context); // just close drawer if already on this screen
              } else {
                Navigator.of(context).pushReplacementNamed(route);
              }
            } else {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$title is coming soon')));
            }
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(icon, color: contentColor, size: 22),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      color: contentColor,
                      fontWeight: currentlySelected ? FontWeight.w600 : FontWeight.w500,
                      fontSize: 15,
                    ),
                  ),
                ),
                if (!currentlySelected && !isDanger)
                  Icon(Icons.chevron_right, color: Colors.grey.shade300, size: 18),
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
