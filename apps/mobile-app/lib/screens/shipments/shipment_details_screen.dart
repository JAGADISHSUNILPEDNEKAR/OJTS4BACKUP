import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

class ShipmentDetailsScreen extends StatefulWidget {
  final String shipmentId;

  const ShipmentDetailsScreen({super.key, required this.shipmentId});

  @override
  State<ShipmentDetailsScreen> createState() => _ShipmentDetailsScreenState();
}

class _ShipmentDetailsScreenState extends State<ShipmentDetailsScreen> {
  late Future<Map<String, dynamic>> _shipmentFuture;

  @override
  void initState() {
    super.initState();
    _shipmentFuture = OriginApiClient.instance.fetchShipmentById(widget.shipmentId);
  }

  Future<void> _refresh() async {
    setState(() {
      _shipmentFuture = OriginApiClient.instance.fetchShipmentById(widget.shipmentId);
    });
    await _shipmentFuture;
  }

  String _shortId(String id) => id.length >= 8 ? id.substring(0, 8) : id;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Shipment ${_shortId(widget.shipmentId)}'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
        ],
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _shipmentFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorView(message: snapshot.error.toString(), onRetry: _refresh);
          }
          final shipment = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _StatusHeader(shipment: shipment),
                  const SizedBox(height: 24),
                  Text('Timeline', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  _Timeline(shipment: shipment),
                  const SizedBox(height: 24),
                  Text('Details', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  _DetailsCard(shipment: shipment),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Sensors', style: Theme.of(context).textTheme.titleLarge),
                      TextButton.icon(
                        onPressed: () {
                          context.push('/sensor-details/${widget.shipmentId}');
                        },
                        icon: const Icon(Icons.sensors),
                        label: const Text('Live Sensors'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _MapPlaceholder(),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StatusHeader extends StatelessWidget {
  final Map<String, dynamic> shipment;
  const _StatusHeader({required this.shipment});

  @override
  Widget build(BuildContext context) {
    final status = shipment['status']?.toString() ?? 'unknown';
    final isDelivered = status.toLowerCase() == 'delivered';
    final color = isDelivered ? Colors.green : Colors.orange;
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Current Status',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Text(
                  status,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            Icon(Icons.local_shipping, size: 48, color: color),
          ],
        ),
      ),
    );
  }
}

class _Timeline extends StatelessWidget {
  final Map<String, dynamic> shipment;
  const _Timeline({required this.shipment});

  String _format(String? iso) {
    if (iso == null) return '—';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    final local = dt.toLocal();
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final status = shipment['status']?.toString() ?? 'unknown';
    final createdAt = shipment['created_at']?.toString();
    final updatedAt = shipment['updated_at']?.toString();
    final isDelivered = status.toLowerCase() == 'delivered';

    return Column(
      children: [
        _TimelineTile(
          title: 'Created',
          subtitle: 'Shipment recorded on chain',
          time: _format(createdAt),
          isCompleted: true,
        ),
        _TimelineTile(
          title: 'Last Update',
          subtitle: 'Status: $status',
          time: _format(updatedAt),
          isCompleted: isDelivered,
          isCurrent: !isDelivered,
        ),
        _TimelineTile(
          title: isDelivered ? 'Delivered' : 'Awaiting delivery',
          subtitle: isDelivered ? 'Custody complete' : 'In transit',
          time: isDelivered ? _format(updatedAt) : 'pending',
          isCompleted: isDelivered,
          isLast: true,
        ),
      ],
    );
  }
}

class _TimelineTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final String time;
  final bool isCompleted;
  final bool isCurrent;
  final bool isLast;

  const _TimelineTile({
    required this.title,
    required this.subtitle,
    required this.time,
    required this.isCompleted,
    this.isCurrent = false,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final dotColor = isCompleted
        ? Colors.green
        : (isCurrent ? Colors.orange : Colors.grey.shade400);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: dotColor),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: isCompleted ? Colors.green : Colors.grey.shade300,
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(subtitle, style: TextStyle(color: Colors.grey.shade600))),
                      Text(time, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailsCard extends StatelessWidget {
  final Map<String, dynamic> shipment;
  const _DetailsCard({required this.shipment});

  @override
  Widget build(BuildContext context) {
    final id = shipment['id']?.toString() ?? '—';
    final farmerId = shipment['farmer_id']?.toString() ?? '—';
    final custodianId = shipment['current_custodian_id']?.toString() ?? '—';
    final destination = shipment['destination']?.toString() ?? '—';
    final risk = shipment['risk_score'];
    final manifestUrl = shipment['manifest_url']?.toString();

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _DetailRow(label: 'Shipment ID', value: id),
            const Divider(),
            _DetailRow(label: 'Farmer', value: farmerId),
            const Divider(),
            _DetailRow(label: 'Current Custodian', value: custodianId),
            const Divider(),
            _DetailRow(label: 'Destination', value: destination),
            if (risk is num) ...[
              const Divider(),
              _DetailRow(label: 'Risk Score', value: '${(risk * 100).toStringAsFixed(1)}%'),
            ],
            if (manifestUrl != null && manifestUrl.isNotEmpty) ...[
              const Divider(),
              _DetailRow(label: 'Manifest', value: manifestUrl),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: const TextStyle(color: Colors.grey)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.bold),
              softWrap: true,
            ),
          ),
        ],
      ),
    );
  }
}

class _MapPlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.map_outlined, size: 48, color: Colors.white54),
            SizedBox(height: 8),
            Text('Map view coming soon', style: TextStyle(color: Colors.white54)),
          ],
        ),
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
            const Text(
              'Failed to load shipment',
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
