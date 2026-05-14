import 'package:flutter/material.dart';
import '../../core/api_client.dart';

/// Reads and writes the `preferences.notifications` sub-map on the user
/// row via /api/v1/users/me. UserResponse.preferences is Optional[Dict[str,
/// Any]] in user-service/schemas.py — there is no enforced sub-schema, so
/// we own the key set on the client.
class NotificationPreferencesScreen extends StatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  State<NotificationPreferencesScreen> createState() => _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends State<NotificationPreferencesScreen> {
  static const _keys = [
    ('push_enabled', 'Push notifications', 'Receive alerts on this device'),
    ('email_enabled', 'Email', 'Daily summaries and critical alerts'),
    ('sms_enabled', 'SMS', 'For urgent alerts (carrier fees may apply)'),
    ('notify_new_shipment', 'New shipments', 'When you are added to a shipment'),
    ('notify_fraud_alert', 'Fraud / anomalies', 'Geofence, temperature, policy violations'),
    ('notify_payment_received', 'Payments received', 'When funds clear escrow'),
    ('notify_system_updates', 'System updates', 'App releases and maintenance'),
  ];

  late Future<Map<String, dynamic>> _profileFuture;
  Map<String, bool> _values = {};
  bool _isSaving = false;
  String? _resultBanner;
  bool _resultIsError = false;

  @override
  void initState() {
    super.initState();
    _profileFuture = OriginApiClient.instance.fetchMyProfile().then((p) {
      final prefs = (p['preferences'] as Map<String, dynamic>?) ?? const {};
      final notifs = (prefs['notifications'] as Map<String, dynamic>?) ?? const {};
      _values = {
        for (final (k, _, _) in _keys) k: (notifs[k] as bool?) ?? _defaultFor(k),
      };
      return p;
    });
  }

  bool _defaultFor(String key) {
    // Off by default for SMS + system updates; everything else on.
    if (key == 'sms_enabled' || key == 'notify_system_updates') return false;
    return true;
  }

  Future<void> _save(Map<String, dynamic> currentProfile) async {
    setState(() {
      _isSaving = true;
      _resultBanner = null;
    });
    try {
      final existing = (currentProfile['preferences'] as Map<String, dynamic>?) ?? {};
      final merged = Map<String, dynamic>.from(existing);
      merged['notifications'] = _values;
      await OriginApiClient.instance.updateMyProfile(preferences: merged);
      if (!mounted) return;
      setState(() {
        _resultBanner = 'Notification preferences saved.';
        _resultIsError = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _resultBanner = e.toString();
        _resultIsError = true;
      });
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notification Preferences')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _profileFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Colors.red),
                    const SizedBox(height: 12),
                    Text(snapshot.error.toString(), textAlign: TextAlign.center),
                  ],
                ),
              ),
            );
          }
          return ListView(
            children: [
              for (final (k, title, subtitle) in _keys)
                SwitchListTile(
                  title: Text(title),
                  subtitle: Text(subtitle),
                  value: _values[k] ?? false,
                  onChanged: _isSaving ? null : (v) => setState(() => _values[k] = v),
                ),
              const Divider(),
              if (_resultBanner != null)
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: (_resultIsError ? Colors.red : Colors.green).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _resultIsError ? Icons.error_outline : Icons.check_circle_outline,
                          color: _resultIsError ? Colors.red : Colors.green,
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_resultBanner!)),
                      ],
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: ElevatedButton.icon(
                  onPressed: _isSaving ? null : () => _save(snapshot.data!),
                  icon: _isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(Icons.save_outlined),
                  label: Text(_isSaving ? 'Saving...' : 'Save preferences'),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
