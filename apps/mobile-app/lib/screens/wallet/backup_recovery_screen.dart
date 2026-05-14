import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/custodian_key_store.dart';

/// The original screen rendered a hardcoded 12-word BIP-39-style seed
/// phrase ("apple bridge crystal deny ...") that backed up nothing — the
/// app does not actually use a BIP-39 wallet. The real device key is a
/// single P-256 private key stored in iOS Keychain / Android Keystore;
/// "backup" boils down to either re-registering after reinstall or
/// rotating to a fresh key after device loss. This screen now exposes
/// those operations honestly instead of pretending to walk through a seed
/// phrase backup.
class BackupRecoveryScreen extends StatefulWidget {
  const BackupRecoveryScreen({super.key});

  @override
  State<BackupRecoveryScreen> createState() => _BackupRecoveryScreenState();
}

class _BackupRecoveryScreenState extends State<BackupRecoveryScreen> {
  bool _isRotating = false;

  Future<void> _rotateKey() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rotate device key?'),
        content: const Text(
          'This generates a NEW P-256 keypair on the device. Custody '
          'handoffs from this device will be rejected by the backend '
          'until an operator re-registers the new public key against '
          'your user account. Continue?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Rotate', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() => _isRotating = true);
    await CustodianKeyStore.rotate();
    // loadOrCreate() on the next access will generate a fresh key.
    await CustodianKeyStore.loadOrCreate();
    if (!mounted) return;
    setState(() => _isRotating = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('New device key generated. View it under Wallet.')),
    );
    context.go('/wallet');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Device Key Management')),
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
                    const Row(
                      children: [
                        Icon(Icons.lock_outline, size: 18, color: Colors.white54),
                        SizedBox(width: 8),
                        Text('How keys are stored',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your P-256 ECDSA private key never leaves this '
                      'device. On Android it lives in Keystore-encrypted '
                      'shared preferences. On iOS it lives in the Keychain '
                      'with KeychainAccessibility.first_unlock_this_device. '
                      'There is no 12-word seed phrase to write down — '
                      'this is a single-device key, not a BIP-39 wallet.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
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
                        Icon(Icons.warning_amber_rounded, size: 18, color: Colors.orange),
                        SizedBox(width: 8),
                        Text('Lost device?',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'If this device is lost or stolen, an operator '
                      'must rotate your registered custodian pubkey on '
                      'the backend before further handoffs from a '
                      'replacement device will be accepted '
                      '(services/shipment-service custody check). The '
                      'mobile app has no remote-wipe; security relies on '
                      'the device unlock screen.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _isRotating ? null : _rotateKey,
              icon: _isRotating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh),
              label: Text(_isRotating ? 'Rotating...' : 'Rotate device key'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.redAccent,
                foregroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.go('/wallet'),
              icon: const Icon(Icons.visibility_outlined),
              label: const Text('View current public key'),
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
