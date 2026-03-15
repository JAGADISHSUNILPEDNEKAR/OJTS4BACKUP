import 'package:flutter/material.dart';

class ShipmentDetailsScreen extends StatelessWidget {
  final String shipmentId;

  const ShipmentDetailsScreen({super.key, required this.shipmentId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Shipment $shipmentId'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusHeader(context),
            const SizedBox(height: 24),
            Text('Timeline', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            _buildTimelineEvents(),
            const SizedBox(height: 24),
            Text('Details', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            _buildDetailsCard(),
            const SizedBox(height: 24),
            Text('Map', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            _buildMapPlaceholder(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHeader(BuildContext context) {
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
                Text('Current Status', style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.grey)),
                const SizedBox(height: 4),
                Text('In Transit', style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.orange, fontWeight: FontWeight.bold)),
              ],
            ),
            const Icon(Icons.local_shipping, size: 48, color: Colors.orange),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineEvents() {
    return Column(
      children: [
        _buildTimelineTile('Origin: Farm A', 'Packed and sealed', 'Oct 24, 08:00 AM', true),
        _buildTimelineTile('Checkpoint X', 'Quality Check Passed', 'Oct 24, 11:30 AM', true),
        _buildTimelineTile('In Transit', 'Driver: John Doe', 'Oct 24, 12:45 PM', false, isCurrent: true),
        _buildTimelineTile('Destination', 'Pending Arrival', 'Est: Oct 25', false, isLast: true),
      ],
    );
  }

  Widget _buildTimelineTile(String title, String subtitle, String time, bool isCompleted, {bool isCurrent = false, bool isLast = false}) {
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
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isCompleted ? Colors.green : (isCurrent ? Colors.orange : Colors.grey.shade400),
                  ),
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
                      Text(subtitle, style: TextStyle(color: Colors.grey.shade600)),
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

  Widget _buildDetailsCard() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailRow('Product', 'Organic Coffee Beans'),
            const Divider(),
            _buildDetailRow('Quantity', '500 kg'),
            const Divider(),
            _buildDetailRow('Batch No.', 'BCH-2023-8821'),
            const Divider(),
            _buildDetailRow('Carrier', 'FastFreight Ltd.'),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildMapPlaceholder() {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.map, size: 48, color: Colors.grey),
            SizedBox(height: 8),
            Text('Map View (Placeholder)', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
