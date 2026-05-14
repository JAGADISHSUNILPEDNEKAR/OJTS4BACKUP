import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

class FraudReviewScreen extends StatefulWidget {
  const FraudReviewScreen({super.key});

  @override
  State<FraudReviewScreen> createState() => _FraudReviewScreenState();
}

class _FraudReviewScreenState extends State<FraudReviewScreen> {
  late Future<List<dynamic>> _auditsFuture;

  @override
  void initState() {
    super.initState();
    _auditsFuture = OriginApiClient.instance.fetchAudits();
  }

  Future<void> _refresh() async {
    setState(() {
      _auditsFuture = OriginApiClient.instance.fetchAudits();
    });
    await _auditsFuture;
  }

  ({Color color, IconData icon}) _styleFor(String status) {
    switch (status) {
      case 'Failed':
        return (color: Colors.red, icon: Icons.warning);
      case 'Warning':
        return (color: Colors.orange, icon: Icons.error_outline);
      case 'Passed':
        return (color: Colors.green, icon: Icons.check_circle_outline);
      default:
        return (color: Colors.blue, icon: Icons.info_outline);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Audit Trail'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
        ],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _auditsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorView(message: snapshot.error.toString(), onRetry: _refresh);
          }
          final audits = snapshot.data ?? const <dynamic>[];
          if (audits.isEmpty) {
            return _EmptyView(onRequest: () => context.push('/audit-submission'));
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.builder(
              itemCount: audits.length,
              itemBuilder: (context, index) {
                final audit = audits[index] as Map<String, dynamic>;
                final style = _styleFor(audit['status']?.toString() ?? '');
                final entity = audit['entity']?.toString() ?? '—';
                final type = audit['type']?.toString() ?? '';
                final auditId = audit['id']?.toString() ?? '';
                final auditor = audit['auditor']?.toString() ?? '';
                final timestamp = audit['timestamp']?.toString() ?? '';
                final findings = audit['findings'];

                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: ExpansionTile(
                    leading: Icon(style.icon, color: style.color),
                    title: Text(type, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('$auditId • shipment $entity'),
                    trailing: Text(
                      audit['status']?.toString() ?? '',
                      style: TextStyle(color: style.color, fontWeight: FontWeight.bold),
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _kv('Auditor', auditor),
                            _kv('Recorded at', timestamp),
                            if (findings is num) _kv('Findings', findings.toString()),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                if (entity.isNotEmpty && entity != 'N/A')
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () =>
                                          context.push('/shipment-details/$entity'),
                                      icon: const Icon(Icons.local_shipping_outlined),
                                      label: const Text('Shipment'),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/audit-submission'),
        icon: const Icon(Icons.add),
        label: const Text('Request Audit'),
      ),
    );
  }

  Widget _kv(String key, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 110, child: Text(key, style: const TextStyle(color: Colors.grey))),
          Expanded(child: Text(value)),
        ],
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
              'Failed to load audit trail',
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
  final VoidCallback onRequest;
  const _EmptyView({required this.onRequest});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.policy_outlined, size: 48, color: Colors.white54),
            const SizedBox(height: 12),
            const Text('No audit events yet', style: TextStyle(fontSize: 16)),
            const SizedBox(height: 4),
            const Text(
              'Audit logs appear here as services emit them',
              style: TextStyle(color: Colors.white54, fontSize: 12),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRequest,
              icon: const Icon(Icons.add),
              label: const Text('Request Audit'),
            ),
          ],
        ),
      ),
    );
  }
}
