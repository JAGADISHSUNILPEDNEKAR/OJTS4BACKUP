import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Manual-entry verifier. A real QR camera scanner needs a native plugin
/// (e.g. `mobile_scanner`) and runtime camera permissions, which aren't
/// wired up in this app. Until they are, the user pastes or types a
/// shipment UUID and hits "Verify", which navigates to the result screen
/// where the actual GET /shipments/{id} call happens.
class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  final _idController = TextEditingController();

  @override
  void dispose() {
    _idController.dispose();
    super.dispose();
  }

  void _verify() {
    final id = _idController.text.trim();
    if (id.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a shipment ID')),
      );
      return;
    }
    context.push('/verification-result?batchId=$id');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify Shipment')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 16),
            Icon(
              Icons.qr_code_2,
              size: 96,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'Enter Shipment ID',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Paste the UUID from a Origin QR code, or enter it manually.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _idController,
              decoration: const InputDecoration(
                labelText: 'Shipment ID (UUID)',
                prefixIcon: Icon(Icons.fingerprint),
              ),
              onSubmitted: (_) => _verify(),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _verify,
              icon: const Icon(Icons.verified_outlined),
              label: const Text('Verify'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            const SizedBox(height: 32),
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
                          'Camera scanner',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Live camera QR decoding is not built into this app '
                      'yet (would need the mobile_scanner plugin and '
                      'runtime camera permissions). Manual entry hits the '
                      'same backend GET /shipments/{id} call that a scanned '
                      'code would.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70),
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
