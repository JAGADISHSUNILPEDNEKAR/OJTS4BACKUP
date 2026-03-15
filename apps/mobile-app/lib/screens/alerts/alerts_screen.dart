import 'package:flutter/material.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            onPressed: () {
              // mark all as read
            },
          )
        ],
      ),
      body: ListView.builder(
        itemCount: 15,
        itemBuilder: (context, index) {
          final isUnread = index < 3;
          return Container(
            color: isUnread ? Colors.blue.withOpacity(0.05) : null,
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              leading: Stack(
                children: [
                  CircleAvatar(
                    backgroundColor: _getAlertColor(index).withOpacity(0.2),
                    child: Icon(_getAlertIcon(index), color: _getAlertColor(index)),
                  ),
                  if (isUnread)
                    Positioned(
                      right: 0,
                      top: 0,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: const BoxDecoration(
                          color: Colors.blue,
                          shape: BoxShape.circle,
                          border: Border.fromBorderSide(BorderSide(color: Colors.white, width: 2)),
                        ),
                      ),
                    ),
                ],
              ),
              title: Text(
                _getAlertTitle(index),
                style: TextStyle(fontWeight: isUnread ? FontWeight.bold : FontWeight.normal),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text(_getAlertSubtitle(index)),
              ),
              trailing: Text(
                '${index * 2 + 1}h ago',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
              onTap: () {
                // view alert details or jump to shipment
              },
            ),
          );
        },
      ),
    );
  }

  Color _getAlertColor(int index) {
    if (index % 4 == 0) return Colors.red;
    if (index % 4 == 1) return Colors.orange;
    if (index % 4 == 2) return Colors.green;
    return Colors.blue;
  }

  IconData _getAlertIcon(int index) {
    if (index % 4 == 0) return Icons.error_outline;
    if (index % 4 == 1) return Icons.warning_amber_rounded;
    if (index % 4 == 2) return Icons.check_circle_outline;
    return Icons.info_outline;
  }

  String _getAlertTitle(int index) {
    if (index % 4 == 0) return 'Temperature Exceeded';
    if (index % 4 == 1) return 'Shipment Delayed';
    if (index % 4 == 2) return 'Shipment Delivered';
    return 'New Policy Update';
  }

  String _getAlertSubtitle(int index) {
    if (index % 4 == 0) return 'Shipment #100$index exceeded safe temperature limits.';
    if (index % 4 == 1) return 'Shipment #100$index expected to be delayed by 2 hours.';
    if (index % 4 == 2) return 'Shipment #100$index has been successfully delivered to Destination.';
    return 'Please review the updated safety guidelines for transits.';
  }
}
