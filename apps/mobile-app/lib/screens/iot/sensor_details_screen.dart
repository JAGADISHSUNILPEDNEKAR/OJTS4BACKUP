import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SensorDetailsScreen extends StatefulWidget {
  final String sensorId;

  const SensorDetailsScreen({super.key, required this.sensorId});

  @override
  State<SensorDetailsScreen> createState() => _SensorDetailsScreenState();
}

class _SensorDetailsScreenState extends State<SensorDetailsScreen> {
  // Mock Real-time stats
  double _temperature = 18.5;
  final double _humidity = 60.0;
  bool _alertThresholdExceeded = false;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('Sensor: ${widget.sensorId}'),
        backgroundColor: colorScheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_suggest_outlined),
            onPressed: () {
              // Threshold Configuration
              showModalBottomSheet(
                context: context,
                builder: (context) => const ThresholdConfigSheet(),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Status Banner
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _alertThresholdExceeded ? colorScheme.error.withValues(alpha: 0.1) : colorScheme.secondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _alertThresholdExceeded ? colorScheme.error : colorScheme.secondary,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _alertThresholdExceeded ? Icons.warning_rounded : Icons.check_circle_outline,
                    color: _alertThresholdExceeded ? colorScheme.error : colorScheme.secondary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _alertThresholdExceeded ? 'Temperature threshold exceeded!' : 'All metrics within normal range.',
                      style: textTheme.bodyMedium?.copyWith(
                        color: _alertThresholdExceeded ? colorScheme.error : colorScheme.secondary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            
            // Real-time Metrics
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                _buildMetricCard(
                  title: 'Temperature',
                  val: '$_temperature°C',
                  icon: Icons.thermostat,
                  color: _alertThresholdExceeded ? colorScheme.error : colorScheme.primary,
                ),
                _buildMetricCard(
                  title: 'Humidity',
                  val: '$_humidity%',
                  icon: Icons.water_drop,
                  color: Colors.lightBlue,
                ),
                _buildMetricCard(
                  title: 'Vibration',
                  val: 'Low',
                  icon: Icons.vibration,
                  color: Colors.orangeAccent,
                ),
                _buildMetricCard(
                  title: 'Battery',
                  val: '88%',
                  icon: Icons.battery_charging_full,
                  color: colorScheme.secondary,
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Live Chart Placeholder
            Text('Historical Chart', style: textTheme.titleLarge),
            const SizedBox(height: 16),
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white12),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.show_chart, size: 48, color: colorScheme.primary),
                    const SizedBox(height: 8),
                    const Text('Live Chart View (Placeholder)'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // Simulate an alert
          setState(() {
            _alertThresholdExceeded = !_alertThresholdExceeded;
            if (_alertThresholdExceeded) {
              _temperature = 26.0; // Above typical range
            } else {
              _temperature = 18.5; // Normal
            }
          });
        },
        label: Text(_alertThresholdExceeded ? 'Resolve Alert' : 'Simulate Anomaly'),
        icon: Icon(_alertThresholdExceeded ? Icons.health_and_safety : Icons.bug_report),
        backgroundColor: _alertThresholdExceeded ? colorScheme.secondary : colorScheme.error,
      ),
    );
  }

  Widget _buildMetricCard({required String title, required String val, required IconData icon, required Color color}) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      color: colorScheme.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Colors.white10),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 36, color: color),
            const SizedBox(height: 12),
            Text(
              val,
              style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: textTheme.bodySmall?.copyWith(color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}

class ThresholdConfigSheet extends StatefulWidget {
  const ThresholdConfigSheet({super.key});

  @override
  State<ThresholdConfigSheet> createState() => _ThresholdConfigSheetState();
}

class _ThresholdConfigSheetState extends State<ThresholdConfigSheet> {
  double _tempMax = 25.0;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(24.0),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Alert Thresholds', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          Text('Max Temperature: ${_tempMax.toStringAsFixed(1)}°C'),
          Slider(
            value: _tempMax,
            min: -10,
            max: 40,
            divisions: 50,
            label: _tempMax.toStringAsFixed(1),
            onChanged: (val) {
              setState(() {
                _tempMax = val;
              });
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                context.pop();
              },
              child: const Text('Save Configuration'),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
