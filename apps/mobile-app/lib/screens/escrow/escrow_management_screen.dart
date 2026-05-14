import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../widgets/primary_button.dart';

class EscrowManagementScreen extends StatefulWidget {
  const EscrowManagementScreen({super.key});

  @override
  State<EscrowManagementScreen> createState() => _EscrowManagementScreenState();
}

class _EscrowManagementScreenState extends State<EscrowManagementScreen> {
  final _shipmentIdController = TextEditingController();
  bool _isFlagging = false;
  String? _lastResult;
  bool _lastResultIsError = false;

  Future<void> _flagDispute() async {
    final shipmentId = _shipmentIdController.text.trim();
    if (shipmentId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a shipment ID first')),
      );
      return;
    }
    setState(() {
      _isFlagging = true;
      _lastResult = null;
    });
    try {
      final res = await OriginApiClient.instance.flagDispute(shipmentId);
      if (!mounted) return;
      setState(() {
        _lastResult = 'Dispute flagged. Status: ${res['status']}';
        _lastResultIsError = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _lastResult = e.toString();
        _lastResultIsError = true;
      });
    } finally {
      if (mounted) setState(() => _isFlagging = false);
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
        title: const Text('Escrow Actions'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Flag a Dispute', style: textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'Mark a shipment as disputed. The backend will halt the escrow '
              'release pending review.',
              style: textTheme.bodyMedium?.copyWith(color: Colors.white70),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _shipmentIdController,
              decoration: const InputDecoration(
                labelText: 'Shipment ID',
                hintText: 'UUID',
                prefixIcon: Icon(Icons.local_shipping_outlined),
              ),
            ),
            const SizedBox(height: 16),
            PrimaryButton(
              text: 'Flag Dispute',
              isLoading: _isFlagging,
              onPressed: _flagDispute,
            ),
            if (_lastResult != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (_lastResultIsError ? Colors.red : Colors.green)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      _lastResultIsError ? Icons.error_outline : Icons.check_circle_outline,
                      color: _lastResultIsError ? Colors.red : Colors.green,
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_lastResult!)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 16),
            Text('Other Actions', style: textTheme.titleLarge),
            const SizedBox(height: 8),
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
                          'PSBT multisig flow',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Triggering / signing a PSBT (Partially Signed Bitcoin '
                      'Transaction) is a multi-party flow that requires '
                      'buyer/seller keys and per-shipment context. The mobile '
                      'app does not surface that flow yet — it lives in the '
                      'web operator dashboard.',
                      style: textTheme.bodySmall?.copyWith(color: Colors.white70),
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
                        Icon(Icons.account_balance_outlined, size: 18, color: Colors.white54),
                        SizedBox(width: 8),
                        Text(
                          'Balance & history',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'escrow-service does not yet expose a list endpoint, '
                      'so per-user balance and transaction history are not '
                      'displayed here. They will appear once the backend '
                      'adds GET /api/v1/escrow.',
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
