import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  late Future<List<dynamic>> _alertsFuture;

  @override
  void initState() {
    super.initState();
    _alertsFuture = OriginApiClient.instance.fetchAlerts();
  }

  Future<void> _refresh() async {
    setState(() {
      _alertsFuture = OriginApiClient.instance.fetchAlerts();
    });
    await _alertsFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
        ],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _alertsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorView(message: snapshot.error.toString(), onRetry: _refresh);
          }
          final alerts = snapshot.data ?? const <dynamic>[];
          if (alerts.isEmpty) {
            return const _EmptyView();
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.builder(
              itemCount: alerts.length,
              itemBuilder: (context, index) {
                final alert = alerts[index] as Map<String, dynamic>;
                return _AlertTile(alert: alert);
              },
            ),
          );
        },
      ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  final Map<String, dynamic> alert;
  const _AlertTile({required this.alert});

  ({Color color, IconData icon}) _styleFor(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return (color: Colors.red, icon: Icons.error_outline);
      case 'WARNING':
        return (color: Colors.orange, icon: Icons.warning_amber_rounded);
      default:
        return (color: Colors.blue, icon: Icons.info_outline);
    }
  }

  String _relativeTime(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    final diff = DateTime.now().toUtc().difference(dt.toUtc());
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    final severity = alert['severity']?.toString() ?? 'INFO';
    final shipmentId = alert['shipment_id']?.toString() ?? '';
    final score = alert['score'];
    final timestamp = alert['timestamp']?.toString();
    final style = _styleFor(severity);
    final shortId = shipmentId.length >= 8 ? shipmentId.substring(0, 8) : shipmentId;
    final scoreText = score is num ? ' • score ${(score * 100).toStringAsFixed(1)}%' : '';

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      leading: CircleAvatar(
        backgroundColor: style.color.withValues(alpha: 0.2),
        child: Icon(style.icon, color: style.color),
      ),
      title: Text(
        severity,
        style: TextStyle(fontWeight: FontWeight.bold, color: style.color),
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4.0),
        child: Text(
          'Shipment $shortId$scoreText',
          style: const TextStyle(fontSize: 13),
        ),
      ),
      trailing: Text(
        _relativeTime(timestamp),
        style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
      ),
      onTap: shipmentId.isEmpty
          ? null
          : () => context.push('/shipment-details/$shipmentId'),
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
            const Text(
              'Failed to load alerts',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
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

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_none, size: 48, color: Colors.white54),
            SizedBox(height: 12),
            Text('No alerts', style: TextStyle(fontSize: 16)),
            SizedBox(height: 4),
            Text(
              'You\'re all caught up',
              style: TextStyle(color: Colors.white54, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
