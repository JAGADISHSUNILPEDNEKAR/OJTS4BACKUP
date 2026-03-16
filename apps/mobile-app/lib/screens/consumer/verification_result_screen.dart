import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class VerificationResultScreen extends StatelessWidget {
  final String batchId;

  const VerificationResultScreen({super.key, required this.batchId});

  @override
  Widget build(BuildContext context) {
    // We mock success status. In a real app it depends on verification.
    bool isSuccess = !batchId.contains('INVALID');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Verification Result'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Icon(
              isSuccess ? Icons.verified_user : Icons.error_outline,
              color: isSuccess ? Colors.green : Colors.red,
              size: 100,
            ),
            const SizedBox(height: 20),
            Text(
              isSuccess ? 'Authentic Product' : 'Verification Failed',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: isSuccess ? Colors.green.shade700 : Colors.red.shade700,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              isSuccess
                  ? 'This product has been verified on the blockchain.'
                  : 'We could not verify the authenticity of this product.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 40),
            if (isSuccess) ...[
              _buildInfoCard('Batch ID', batchId),
              _buildInfoCard('Farm of Origin', 'Sunrise Organic Farms'),
              _buildInfoCard('Harvest Date', '10 Oct 2023'),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.link, color: Colors.blue.shade700),
                        const SizedBox(width: 12),
                        Text(
                          'Anchored on Mock Bitcoin Network',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade900),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text('TXID:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const Text('5e3d9a1b7f2c4e6a8b0d2f4e6a8b0d2f5e3d...a8b0de', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
                    const SizedBox(height: 8),
                    const Text('Merkle Root:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const Text('aabbcc1122334455667788990011aab...bbccdd', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
                  ]
                ),
              ),
              const SizedBox(height: 30),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    // Navigate to full audit trail
                    context.push('/timeline');
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('View Full Audit Trail', style: TextStyle(fontSize: 16)),
                ),
              )
            ] else ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.pop(),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: Colors.red.shade600,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Try Again', style: TextStyle(fontSize: 16)),
                ),
              )
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title,
              style: const TextStyle(fontSize: 16, color: Colors.grey)),
          Text(value,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
