import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  late Future<Map<String, dynamic>> _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = OriginApiClient.instance.fetchMyProfile();
  }

  Future<void> _refresh() async {
    setState(() {
      _profileFuture = OriginApiClient.instance.fetchMyProfile();
    });
    await _profileFuture;
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You will need to enter your credentials again to continue.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Log out', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    await OriginApiClient.instance.logoutBackend();
    if (!mounted) return;
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _profileFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorView(message: snapshot.error.toString(), onRetry: _refresh);
          }
          final profile = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              children: [
                const SizedBox(height: 24),
                _ProfileHeader(profile: profile),
                const SizedBox(height: 32),
                const _SectionHeader('Account'),
                _kv('Email', profile['email']?.toString() ?? '—'),
                _kv('Display name', profile['display_name']?.toString() ?? '—'),
                _kv('Role', profile['role']?.toString() ?? '—'),
                _kv('User ID', profile['id']?.toString() ?? '—'),
                _kv('Organization', profile['organization_id']?.toString() ?? '—'),
                const Divider(height: 32),
                const _SectionHeader('Settings'),
                ListTile(
                  leading: const Icon(Icons.notifications_outlined),
                  title: const Text('Notification preferences'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/notification-preferences'),
                ),
                ListTile(
                  leading: const Icon(Icons.vpn_key_outlined),
                  title: const Text('Device signing key'),
                  subtitle: const Text('P-256 ECDSA used for custody handoffs'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/wallet'),
                ),
                ListTile(
                  leading: const Icon(Icons.security),
                  title: const Text('Set up 2FA'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/setup-2fa'),
                ),
                const Divider(height: 32),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: OutlinedButton.icon(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout, color: Colors.red),
                    label: const Text('Log Out', style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _kv(String key, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(key, style: const TextStyle(color: Colors.grey))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final Map<String, dynamic> profile;
  const _ProfileHeader({required this.profile});

  String _initials() {
    final name = profile['display_name']?.toString() ?? profile['email']?.toString() ?? '?';
    final parts = name.split(RegExp(r'[\s@]+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final email = profile['email']?.toString() ?? '';
    final displayName = profile['display_name']?.toString();
    final role = profile['role']?.toString() ?? '';
    return Column(
      children: [
        CircleAvatar(
          radius: 48,
          backgroundColor: Colors.blueAccent,
          child: Text(_initials(),
              style: const TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(height: 16),
        Text(
          displayName ?? email,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(role, style: const TextStyle(fontSize: 14, color: Colors.white70)),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            const Text('Failed to load profile',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
