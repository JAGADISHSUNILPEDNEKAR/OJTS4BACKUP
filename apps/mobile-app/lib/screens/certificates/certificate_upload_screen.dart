import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// No backend service currently exposes certificate-management endpoints
/// (issuer upload, lifecycle, anchoring). The screen used to mock-upload a
/// hardcoded "organic_certification_2023.pdf" filename and show a fake
/// success SnackBar. That has been replaced with an honest "not connected"
/// view so users don't believe certificates are being persisted.
///
/// When a certificate-service is added, wire this screen to its upload
/// endpoint (multipart/form-data PDF/image upload, returning the
/// certificate id + anchor status).
class CertificateUploadScreen extends StatelessWidget {
  const CertificateUploadScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Upload Certificate')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _NotConnectedCard(
              title: 'Certificate upload',
              body:
                  'There is no certificate-service in the Origin backend '
                  'today, so this upload form has no destination. Submitting '
                  'a certificate from here would silently discard it.\n\n'
                  'When the service lands, the form should collect: PDF or '
                  'image file, issuer organization, certificate type, '
                  'expiry date, and whether to anchor to Bitcoin. The '
                  'response would be the certificate id + anchor status.',
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'What does work today',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Shipment-level proofs ARE available. After custody '
                      'handoffs commit, GET /api/v1/shipments/{id}/proof/pdf '
                      'returns an anchored PDF — open the shipment details '
                      'screen and tap the proof link.',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => context.go('/shipments'),
                      icon: const Icon(Icons.local_shipping_outlined),
                      label: const Text('Open shipments'),
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

class _NotConnectedCard extends StatelessWidget {
  final String title;
  final String body;
  const _NotConnectedCard({required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.link_off, size: 18, color: Colors.orange.shade300),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 8),
            Text(body, style: const TextStyle(color: Colors.white70)),
          ],
        ),
      ),
    );
  }
}
