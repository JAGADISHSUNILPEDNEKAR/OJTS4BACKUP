import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../widgets/primary_button.dart';

class AuditSubmissionForm extends StatefulWidget {
  const AuditSubmissionForm({super.key});

  @override
  State<AuditSubmissionForm> createState() => _AuditSubmissionFormState();
}

class _AuditSubmissionFormState extends State<AuditSubmissionForm> {
  final _shipmentIdController = TextEditingController();
  bool _isLoading = false;
  String? _resultBanner;
  bool _resultIsError = false;

  Future<void> _submit() async {
    final shipmentId = _shipmentIdController.text.trim();
    if (shipmentId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a shipment ID')),
      );
      return;
    }
    setState(() {
      _isLoading = true;
      _resultBanner = null;
    });
    try {
      final res = await OriginApiClient.instance.requestAudit(shipmentId);
      if (!mounted) return;
      setState(() {
        _resultBanner = 'Audit ${res['auditId']} requested for ${res['shipmentId']}.';
        _resultIsError = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _resultBanner = e.toString();
        _resultIsError = true;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _shipmentIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Request Audit'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Open a new audit', style: textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'Logs an audit.request.created event against this shipment. '
              'Auditors and government users see it in their audit list.',
              style: textTheme.bodyMedium?.copyWith(color: Colors.white70),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _shipmentIdController,
              decoration: const InputDecoration(
                labelText: 'Shipment ID (UUID)',
                prefixIcon: Icon(Icons.local_shipping_outlined),
              ),
            ),
            const SizedBox(height: 24),
            PrimaryButton(
              text: 'Request Audit',
              isLoading: _isLoading,
              onPressed: _submit,
            ),
            if (_resultBanner != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (_resultIsError ? Colors.red : Colors.green)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      _resultIsError ? Icons.error_outline : Icons.check_circle_outline,
                      color: _resultIsError ? Colors.red : Colors.green,
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_resultBanner!)),
                  ],
                ),
              ),
              if (!_resultIsError) ...[
                const SizedBox(height: 12),
                TextButton.icon(
                  onPressed: () => context.go('/fraud-review'),
                  icon: const Icon(Icons.list_alt),
                  label: const Text('View all audits'),
                ),
              ],
            ],
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.info_outline, size: 18, color: Colors.white54),
                        SizedBox(width: 8),
                        Text(
                          'Audit findings & evidence',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'audit-reporting-service only accepts {shipment_id} '
                      'today. Compliance flags, photo evidence, and a typed '
                      'digital signature need new endpoints before the form '
                      'can collect and submit them — those fields were '
                      'removed to avoid suggesting they are recorded.',
                      style: textTheme.bodySmall?.copyWith(color: Colors.white70),
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
}
