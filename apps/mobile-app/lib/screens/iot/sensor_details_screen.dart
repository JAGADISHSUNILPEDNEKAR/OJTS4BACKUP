import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// iot-ingestion-service today exposes only POST /api/v1/iot/ingest
/// (HMAC-protected, for devices). There is no GET endpoint for the mobile
/// app to read live sensor data. This screen surfaces that honestly instead
/// of rendering fake "Temperature 18.5°C / Humidity 60% / Battery 88%"
/// values that don't come from anywhere.
///
/// When a read endpoint lands (likely on iot-ingestion-service or a separate
/// telemetry-query service), wire this screen to it: a FutureBuilder over
/// the readings for [sensorId], grouped by metric, with optional polling.
class SensorDetailsScreen extends StatelessWidget {
  final String sensorId;

  const SensorDetailsScreen({super.key, required this.sensorId});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text('Sensor / Shipment ${_short(sensorId)}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.sensors, color: colorScheme.primary),
                        const SizedBox(width: 8),
                        const Text(
                          'Live telemetry',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'iot-ingestion-service only accepts device-side writes '
                      '(POST /api/v1/iot/ingest, HMAC-protected). There is '
                      'no read endpoint yet, so per-shipment temperature, '
                      'humidity, vibration, and battery values cannot be '
                      'displayed here without inventing them.',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Identifier: $sensorId',
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.notifications_active_outlined, size: 18, color: Colors.white54),
                        SizedBox(width: 8),
                        Text(
                          'Anomaly alerts',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Telemetry anomalies surface as Alert entries '
                      'after the ML service evaluates the stream. Open the '
                      'Alerts tab to see anything that crossed a threshold.',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => context.go('/alerts'),
                      icon: const Icon(Icons.notifications_outlined),
                      label: const Text('Go to Alerts'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _short(String id) => id.length >= 8 ? id.substring(0, 8) : id;
}
