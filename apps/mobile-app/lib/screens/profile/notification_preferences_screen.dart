import 'package:flutter/material.dart';

class NotificationPreferencesScreen extends StatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  State<NotificationPreferencesScreen> createState() =>
      _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState
    extends State<NotificationPreferencesScreen> {
  // Global toggles
  bool _pushEnabled = true;
  bool _emailEnabled = false;
  bool _smsEnabled = false;

  // Granular settings
  bool _notifyNewShipment = true;
  bool _notifyFraudAlert = true;
  bool _notifyPaymentReceived = true;
  bool _notifySystemUpdates = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notification Preferences')),
      body: ListView(
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              'Delivery Methods',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue),
            ),
          ),
          SwitchListTile(
            title: const Text('Push Notifications'),
            subtitle: const Text('Receive alerts on your device'),
            value: _pushEnabled,
            onChanged: (val) => setState(() => _pushEnabled = val),
          ),
          SwitchListTile(
            title: const Text('Email Notifications'),
            subtitle: const Text('Daily summaries and critical alerts via email'),
            value: _emailEnabled,
            onChanged: (val) => setState(() => _emailEnabled = val),
          ),
          SwitchListTile(
            title: const Text('SMS Text Messages'),
            subtitle: const Text('For urgent alerts (carrier fees may apply)'),
            value: _smsEnabled,
            onChanged: (val) => setState(() => _smsEnabled = val),
          ),
          const Divider(height: 32),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Text(
              'Event Types',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue),
            ),
          ),
          CheckboxListTile(
            title: const Text('New Shipments'),
            subtitle: const Text('When you are added to a shipment flow'),
            value: _notifyNewShipment,
            onChanged: (val) => setState(() => _notifyNewShipment = val ?? false),
          ),
          CheckboxListTile(
            title: const Text('Fraud & Anomalies'),
            subtitle: const Text('Geofence drops, temperature spikes, or policy violations'),
            value: _notifyFraudAlert,
            onChanged: (val) => setState(() => _notifyFraudAlert = val ?? false),
          ),
          CheckboxListTile(
            title: const Text('Payments Received'),
            subtitle: const Text('When funds clear your wallet'),
            value: _notifyPaymentReceived,
            onChanged: (val) => setState(() => _notifyPaymentReceived = val ?? false),
          ),
          CheckboxListTile(
            title: const Text('System Updates'),
            subtitle: const Text('App updates and scheduled maintenance'),
            value: _notifySystemUpdates,
            onChanged: (val) => setState(() => _notifySystemUpdates = val ?? false),
          ),
        ],
      ),
    );
  }
}
