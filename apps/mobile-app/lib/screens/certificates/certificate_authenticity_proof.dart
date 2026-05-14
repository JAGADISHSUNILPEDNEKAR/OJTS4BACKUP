import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Previously showed a fabricated "Leaf Hash 0x2a9b3c4...88d1e / Merkle
/// Root 0xff12da...cc2a1 / Block Height 809,112 / TXID ce3f...91aa"
/// proof for any `certificateId`. None of those values came from
/// anywhere. The certificate concept has no backing service today, so
/// there is nothing to derive a real proof from.
///
/// When a certificate-service lands, it should expose
/// GET /api/v1/certificates/{id}/proof returning {leaf_hash, merkle_root,
/// tx_id, block_height, network} so this screen can render the live
/// values + link out to a block explorer.
class CertificateAuthenticityProofScreen extends StatelessWidget {
  final String certificateId;

  const CertificateAuthenticityProofScreen({super.key, required this.certificateId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cryptographic Proof')),
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
                          'No proof available',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'There is no certificate service to derive a Merkle '
                      'inclusion proof from for "$certificateId". Once a '
                      'certificate-service ships, this screen will render '
                      'the leaf hash, Merkle root, anchored Bitcoin txid, '
                      'and a deep link to a block explorer.',
                      style: const TextStyle(color: Colors.white70),
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
                      'Anchored proofs that DO exist',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'The crypto-service builds a Merkle tree from custody '
                      'events on a tick and anchors the root to Bitcoin via '
                      'an OP_RETURN. Each shipment has a downloadable proof '
                      'PDF at /api/v1/shipments/{id}/proof/pdf which carries '
                      'the same cryptographic guarantees.',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => context.go('/shipments'),
                      icon: const Icon(Icons.local_shipping_outlined),
                      label: const Text('Browse shipments'),
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
