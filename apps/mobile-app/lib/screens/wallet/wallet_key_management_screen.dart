import 'package:elliptic/elliptic.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/custodian_key_store.dart';

/// Surfaces the device's real signing identity — the P-256 ECDSA keypair
/// stored in iOS Keychain / Android Keystore — instead of the fake
/// Ethereum address ("0x71C...9A23") and Send/Receive/Copy buttons the
/// screen used to render. The app has no Web3 wallet today; the chain-of-
/// custody key is the real cryptographic identity worth exposing.
class WalletKeyManagementScreen extends StatefulWidget {
  const WalletKeyManagementScreen({super.key});

  @override
  State<WalletKeyManagementScreen> createState() => _WalletKeyManagementScreenState();
}

class _WalletKeyManagementScreenState extends State<WalletKeyManagementScreen> {
  PublicKey? _pubKey;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final priv = await CustodianKeyStore.loadOrCreate();
    if (!mounted) return;
    setState(() => _pubKey = priv.publicKey);
  }

  Future<void> _copyPubkey() async {
    final pub = _pubKey;
    if (pub == null) return;
    await Clipboard.setData(ClipboardData(text: pub.toHex()));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Public key copied')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Device Signing Key'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Your custody identity', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            const Text(
              'Each Origin device holds a single P-256 (NIST256p) ECDSA '
              'key stored in iOS Keychain / Android Keystore. The first '
              'custody handoff binds this key to your user account on the '
              'backend (trust-on-first-use), and every subsequent handoff '
              'is verified against it.',
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Theme.of(context).colorScheme.primary.withAlpha(50)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Public key (P-256)', style: TextStyle(color: Colors.white54)),
                  const SizedBox(height: 8),
                  if (_pubKey == null)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: CircularProgressIndicator(),
                    )
                  else
                    SelectableText(
                      _pubKey!.toHex(),
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                    ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: _pubKey == null ? null : _copyPubkey,
                        icon: const Icon(Icons.copy),
                        label: const Text('Copy'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () => context.push('/backup-recovery'),
                        icon: const Icon(Icons.shield_outlined),
                        label: const Text('Manage / Rotate'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
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
                          'No on-chain wallet',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'There is no end-user crypto wallet (no Ethereum '
                      'address, no token transfers). Bitcoin anchoring is '
                      'done by the backend\'s crypto-service from a key '
                      'managed in Vault, not by individual devices.',
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
