import 'package:flutter/material.dart';
import '../../core/api_client.dart';

class AuditorDashboardScreen extends StatelessWidget {
  const AuditorDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final role = OriginApiClient.instance.currentRole;
    return Scaffold(
      appBar: AppBar(
        title: Text('Auditor Dashboard · $role'),
        automaticallyImplyLeading: false,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Text('Pending Audits', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          _buildAuditTile(context, 'Farm Batch #8042', 'Pending Review', Colors.orange),
          _buildAuditTile(context, 'Logistics #112', 'Flagged', Colors.red),
          _buildAuditTile(context, 'Corp Receiving #99', 'Verified', Colors.green),
        ],
      ),
    );
  }

  Widget _buildAuditTile(BuildContext context, String title, String status, Color statusColor) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(Icons.assignment, color: Theme.of(context).colorScheme.primary),
        title: Text(title),
        subtitle: Text('Status: $status', style: TextStyle(color: statusColor)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {},
      ),
    );
  }
}
