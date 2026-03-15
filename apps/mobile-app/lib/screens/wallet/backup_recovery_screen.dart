import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class BackupRecoveryScreen extends StatefulWidget {
  const BackupRecoveryScreen({super.key});

  @override
  State<BackupRecoveryScreen> createState() => _BackupRecoveryScreenState();
}

class _BackupRecoveryScreenState extends State<BackupRecoveryScreen> {
  final List<String> _seedPhrase = [
    'apple', 'bridge', 'crystal', 'deny',
    'elephant', 'focus', 'ghost', 'hotel',
    'island', 'jury', 'keep', 'lemon'
  ];

  bool _isBackedUp = false;

  void _verifyBackup() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Verify Backup'),
        content: const Text('Are you sure you have written down the 12-word seed phrase?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _isBackedUp = true;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Recovery phrase backed up successfully')),
              );
              context.pop();
            },
            child: const Text('Yes, I have it'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Backup Recovery Phrase')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Icon(Icons.security, size: 64, color: Colors.blue),
            const SizedBox(height: 16),
            const Text(
              'Secure Your Wallet',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              'Write down these 12 words in order. Do not share them with anyone. They are the ONLY way to recover your assets and identity.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _seedPhrase.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 2.5,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemBuilder: (context, index) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Text('${index + 1}.', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(_seedPhrase[index], style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isBackedUp ? null : _verifyBackup,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: _isBackedUp ? Colors.green : Colors.blue,
                ),
                child: Text(
                  _isBackedUp ? 'Backed Up' : 'I Saved My Phrase',
                  style: const TextStyle(fontSize: 16, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
