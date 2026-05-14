import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Hardcoded "CERT-9921 / CERT-8834 / CERT-7712" search list previously
/// pretended to verify certificates. There is no backend endpoint for any
/// of those. Replaced with an honest pointer to the shipment proof flow,
/// which is the real verification surface the system supports today.
class CertificateVerificationScreen extends StatelessWidget {
  const CertificateVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify Certificates')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.link_off, size: 18, color: Colors.orange.shade300),
                        const SizedBox(width: 8),
                        const Text(
                          'Certificate registry not deployed',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'There is no certificate service in the Origin '
                      'backend yet — no registry to look up by ID, no '
                      'issuer database, no revocation list. The search '
                      'list this screen used to render was hardcoded.',
                      style: TextStyle(color: Colors.white70),
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
                    const Text(
                      'What you can verify today',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Shipment provenance: scan a shipment QR (or paste '
                      'its UUID) to call GET /shipments/{id} and pull '
                      "the chain-of-custody record. That's the real "
                      'verification path the platform supports today.',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => context.go('/qr-scanner'),
                      icon: const Icon(Icons.qr_code_2),
                      label: const Text('Verify a shipment'),
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
