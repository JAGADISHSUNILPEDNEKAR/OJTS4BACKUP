import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/api_client.dart';

class _Tab {
  final int branchIndex;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _Tab(this.branchIndex, this.icon, this.activeIcon, this.label);
}

/// Branch index map for the StatefulShellRoute in app_router.dart. Keep these
/// in sync — if you reorder the branches there, fix these constants.
const int _branchOrigin = 0;
const int _branchAuditor = 1;
const int _branchShipments = 2;
const int _branchWallet = 3;
const int _branchAlerts = 4;
const int _branchProfile = 5;
const int _branchDistributor = 6;
const int _branchAdmin = 7;
const int _branchConsumer = 8;

const _tabOrigin = _Tab(_branchOrigin, Icons.dashboard_outlined, Icons.dashboard, 'Origin');
const _tabAuditor = _Tab(_branchAuditor, Icons.verified_user_outlined, Icons.verified_user, 'Audits');
const _tabShipments = _Tab(_branchShipments, Icons.local_shipping_outlined, Icons.local_shipping, 'Shipments');
const _tabWallet = _Tab(_branchWallet, Icons.account_balance_wallet_outlined, Icons.account_balance_wallet, 'Wallet');
const _tabAlerts = _Tab(_branchAlerts, Icons.notifications_outlined, Icons.notifications, 'Alerts');
const _tabProfile = _Tab(_branchProfile, Icons.person_outline, Icons.person, 'Profile');
const _tabDistributor = _Tab(_branchDistributor, Icons.dashboard_outlined, Icons.dashboard, 'Logistics');
const _tabAdmin = _Tab(_branchAdmin, Icons.admin_panel_settings_outlined, Icons.admin_panel_settings, 'Admin');
const _tabConsumerHome = _Tab(_branchConsumer, Icons.qr_code_scanner_outlined, Icons.qr_code_scanner, 'Scan');

List<_Tab> _tabsForRole(String role) {
  switch (role) {
    case 'FARMER':
      return const [_tabOrigin, _tabShipments, _tabAlerts, _tabProfile];
    case 'LOGISTICS':
      return const [_tabDistributor, _tabShipments, _tabWallet, _tabProfile];
    case 'AUDITOR':
    case 'GOVERNMENT':
      return const [_tabAuditor, _tabShipments, _tabAlerts, _tabProfile];
    case 'COMPANY':
    case 'RETAILER':
      return const [_tabAdmin, _tabShipments, _tabAlerts, _tabWallet, _tabProfile];
    case 'SUPERADMIN':
      return const [
        _tabAdmin,
        _tabOrigin,
        _tabAuditor,
        _tabShipments,
        _tabAlerts,
        _tabProfile,
      ];
    case 'CONSUMER':
      return const [_tabConsumerHome, _tabProfile];
    default:
      return const [_tabOrigin, _tabShipments, _tabAlerts, _tabProfile];
  }
}

class MainLayoutScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const MainLayoutScreen({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    final role = OriginApiClient.instance.currentRole;
    final tabs = _tabsForRole(role);
    final currentBranch = navigationShell.currentIndex;

    // Visible index of the current branch. If the current branch isn't in the
    // role's tab list (e.g. somebody deep-linked), highlight nothing by
    // clamping to 0 — the StatefulShellRoute still owns the actual route.
    int visibleIndex = tabs.indexWhere((t) => t.branchIndex == currentBranch);
    if (visibleIndex < 0) visibleIndex = 0;

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: visibleIndex,
        onTap: (i) {
          final target = tabs[i].branchIndex;
          navigationShell.goBranch(
            target,
            initialLocation: target == navigationShell.currentIndex,
          );
        },
        type: BottomNavigationBarType.fixed,
        backgroundColor: Theme.of(context).colorScheme.surface,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: Colors.white54,
        items: [
          for (final t in tabs)
            BottomNavigationBarItem(
              icon: Icon(t.icon),
              activeIcon: Icon(t.activeIcon),
              label: t.label,
            ),
        ],
      ),
    );
  }
}
