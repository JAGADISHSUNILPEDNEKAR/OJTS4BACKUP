import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

class VerificationResultScreen extends StatefulWidget {
  /// The shipment ID extracted from the QR (or typed manually). Despite the
  /// name `batchId` (kept for route compatibility), this is a shipment UUID.
  final String batchId;

  const VerificationResultScreen({super.key, required this.batchId});

  @override
  State<VerificationResultScreen> createState() => _VerificationResultScreenState();
}

class _VerificationResultScreenState extends State<VerificationResultScreen> {
  late Future<Map<String, dynamic>> _shipmentFuture;

  @override
  void initState() {
    super.initState();
    _shipmentFuture = OriginApiClient.instance.fetchShipmentById(widget.batchId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verification Result'),
        elevation: 0,
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _shipmentFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _FailureView(batchId: widget.batchId, error: snapshot.error.toString());
          }
          return _SuccessView(shipment: snapshot.data!);
        },
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  final Map<String, dynamic> shipment;
  const _SuccessView({required this.shipment});

  @override
  Widget build(BuildContext context) {
    final id = shipment['id']?.toString() ?? '';
    final destination = shipment['destination']?.toString() ?? '—';
    final status = shipment['status']?.toString() ?? 'unknown';
    final risk = shipment['risk_score'];
    final createdAt = shipment['created_at']?.toString() ?? '—';

    final pdfUrl = OriginApiClient.instance.getProofPdfUrl(id);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          const SizedBox(height: 8),
          const Icon(Icons.verified_user, color: Colors.green, size: 100),
          const SizedBox(height: 20),
          Text(
            'Authentic Shipment',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.greenAccent,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Backend confirmed this shipment exists and you are authorized to view it.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 32),
          _InfoRow(label: 'Shipment ID', value: id),
          _InfoRow(label: 'Destination', value: destination),
          _InfoRow(label: 'Status', value: status),
          _InfoRow(label: 'Created', value: createdAt),
          if (risk is num) _InfoRow(label: 'Risk', value: '${(risk * 100).toStringAsFixed(1)}%'),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                const Icon(Icons.picture_as_pdf_outlined, color: Colors.lightBlueAccent),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Proof PDF', style: TextStyle(fontWeight: FontWeight.bold)),
                      Text(pdfUrl, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.push('/shipment-details/$id'),
              child: const Text('View Full Audit Trail'),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: const TextStyle(color: Colors.grey)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _FailureView extends StatelessWidget {
  final String batchId;
  final String error;
  const _FailureView({required this.batchId, required this.error});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          const SizedBox(height: 8),
          const Icon(Icons.error_outline, color: Colors.red, size: 100),
          const SizedBox(height: 20),
          Text(
            'Verification Failed',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.redAccent,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          const Text(
            'The backend could not confirm this shipment. Either the ID is '
            'wrong, or you are not authorized to view it.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Queried ID', style: TextStyle(color: Colors.red.shade300, fontSize: 12)),
                Text(batchId, style: const TextStyle(fontFamily: 'monospace')),
                const SizedBox(height: 8),
                Text('Server response', style: TextStyle(color: Colors.red.shade300, fontSize: 12)),
                Text(error, style: const TextStyle(fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Try Again'),
            ),
          ),
        ],
      ),
    );
  }
}
