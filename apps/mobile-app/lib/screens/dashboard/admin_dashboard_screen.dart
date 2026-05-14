import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final role = OriginApiClient.instance.currentRole;
    final isSuper = role == 'SUPERADMIN';
    return Scaffold(
      appBar: AppBar(
        title: Text('${isSuper ? 'Admin' : _title(role)} Dashboard · $role'),
        automaticallyImplyLeading: false,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome back, ${_title(role)}',
                style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 24),
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  _Tile(
                    icon: Icons.local_shipping,
                    label: 'Shipments',
                    onTap: () => context.go('/shipments'),
                  ),
                  _Tile(
                    icon: Icons.notifications,
                    label: 'Alerts',
                    onTap: () => context.go('/alerts'),
                  ),
                  _Tile(
                    icon: Icons.account_balance_wallet,
                    label: 'Escrow',
                    onTap: () => context.push('/escrow'),
                  ),
                  _Tile(
                    icon: Icons.report_problem_outlined,
                    label: 'Fraud Review',
                    onTap: () => context.push('/fraud-review'),
                  ),
                  if (isSuper)
                    _Tile(
                      icon: Icons.verified_user,
                      label: 'Audits',
                      onTap: () => context.push('/audit-submission'),
                    ),
                  _Tile(
                    icon: Icons.workspace_premium_outlined,
                    label: 'Certificates',
                    onTap: () => context.push('/certificate-verification'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _title(String role) {
    switch (role) {
      case 'SUPERADMIN':
        return 'Administrator';
      case 'COMPANY':
        return 'Company';
      case 'RETAILER':
        return 'Retailer';
      default:
        return 'Operator';
    }
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _Tile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 12),
              Text(label,
                  style: Theme.of(context).textTheme.bodyLarge,
                  textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
