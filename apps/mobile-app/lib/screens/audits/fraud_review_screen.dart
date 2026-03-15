import 'package:flutter/material.dart';

class FraudReviewScreen extends StatefulWidget {
  const FraudReviewScreen({super.key});

  @override
  State<FraudReviewScreen> createState() => _FraudReviewScreenState();
}

class _FraudReviewScreenState extends State<FraudReviewScreen> {
  final List<Map<String, dynamic>> _alerts = [
    {
      'id': 'ALT-0992',
      'type': 'Geofence Deviation',
      'severity': 'High',
      'time': '2 hours ago',
      'details': 'Shipment SHP-1002 left the predefined route by 50km.',
      'status': 'Pending',
    },
    {
      'id': 'ALT-0985',
      'type': 'Temperature Spike',
      'severity': 'Critical',
      'time': '1 day ago',
      'details': 'Temperature exceeded 8°C for 45 minutes.',
      'status': 'Pending',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Fraud & Anomaly Review')),
      body: ListView.builder(
        itemCount: _alerts.length,
        itemBuilder: (context, index) {
          final alert = _alerts[index];
          if (alert['status'] != 'Pending') return const SizedBox.shrink();
          
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: ExpansionTile(
              leading: Icon(
                alert['severity'] == 'Critical' ? Icons.warning : Icons.error_outline,
                color: alert['severity'] == 'Critical' ? Colors.red : Colors.orange,
              ),
              title: Text(alert['type'], style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('ID: ${alert['id']} • ${alert['time']}'),
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(alert['details'], style: const TextStyle(fontSize: 16)),
                      const SizedBox(height: 16),
                      // Mock Evidence Section
                      const Text('Evidence Logs', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        color: Colors.grey.shade100,
                        width: double.infinity,
                        child: const Text(
                          '14:23:44Z GPS: 34.0522 N, 118.2437 W\n14:24:10Z WARNING: Route Deviation',
                          style: TextStyle(fontFamily: 'monospace', fontSize: 12),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _updateStatus(index, 'Dismissed'),
                              style: OutlinedButton.styleFrom(foregroundColor: Colors.grey.shade700),
                              child: const Text('Dismiss'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                _showConfirmationDialog(index);
                              },
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                              child: const Text('Confirm Fraud', style: TextStyle(color: Colors.white)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () => _updateStatus(index, 'Escalated'),
                          child: const Text('Escalate for Review'),
                        ),
                      ),
                    ],
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  void _updateStatus(int index, String newStatus) {
    setState(() {
      _alerts[index]['status'] = newStatus;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Alert marked as $newStatus')));
  }

  void _showConfirmationDialog(int index) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Fraud?'),
        content: const Text('This action will freeze the associated shipment and trigger an investigation workflow. Proceed?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _updateStatus(index, 'Confirmed Fraud');
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Confirm', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
