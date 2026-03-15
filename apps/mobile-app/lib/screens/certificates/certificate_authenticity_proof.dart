import 'package:flutter/material.dart';

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
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.verified, color: Colors.green.shade700, size: 40),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Valid Anchored Record',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green.shade900),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Cert ID: $certificateId',
                          style: TextStyle(color: Colors.green.shade800),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'Proof Data',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildProofRow('Leaf Hash', '0x2a9b3c4...88d1e'),
            _buildProofRow('Merkle Root', '0xff12da...cc2a1'),
            _buildProofRow('Network', 'Bitcoin (Mainnet)'),
            _buildProofRow('Block Height', '809,112'),
            const SizedBox(height: 24),
            InkWell(
              onTap: () {
                // Mock link to block explorer
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Opening Block Explorer...')),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.link, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('BTC Transaction ID', style: TextStyle(fontWeight: FontWeight.bold)),
                          Text('ce3f...91aa', style: TextStyle(color: Colors.grey.shade700)),
                        ],
                      ),
                    ),
                    const Icon(Icons.open_in_new, color: Colors.grey, size: 20),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            const Text(
               'Merkle Branch',
               style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            // Mock visualization of Merkle Tree
            Center(
              child: Container(
                height: 150,
                width: 300,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.account_tree, size: 50, color: Colors.grey),
                      const SizedBox(height: 8),
                      Text('Tree Visualization Graphic', style: TextStyle(color: Colors.grey.shade600))
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProofRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
          ),
          const SizedBox(width: 16),
          Expanded(child: Text(value, style: const TextStyle(fontFamily: 'monospace'))),
        ],
      ),
    );
  }
}
