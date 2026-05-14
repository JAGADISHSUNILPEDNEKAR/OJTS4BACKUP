import 'dart:convert';
import 'package:crypto/crypto.dart' as crypto;
import 'package:ecdsa/ecdsa.dart';
import 'package:elliptic/elliptic.dart';
import 'package:flutter/material.dart';
import 'package:hex/hex.dart';

import '../../core/api_client.dart';
import '../../core/custodian_key_store.dart';

class CustodyHandoffScreen extends StatefulWidget {
  /// Optional pre-filled shipment ID. When null the user has to type one.
  final String? shipmentId;
  const CustodyHandoffScreen({super.key, this.shipmentId});

  @override
  State<CustodyHandoffScreen> createState() => _CustodyHandoffScreenState();
}

class _CustodyHandoffScreenState extends State<CustodyHandoffScreen> {
  late final TextEditingController _shipmentIdController;
  final _newCustodianIdController = TextEditingController();
  String _statusMessage = '';
  bool _isStatusError = false;
  bool _isLoading = false;

  PrivateKey? _privKey;
  PublicKey? _pubKey;

  @override
  void initState() {
    super.initState();
    _shipmentIdController = TextEditingController(text: widget.shipmentId ?? '');
    _loadKeys();
  }

  Future<void> _loadKeys() async {
    final priv = await CustodianKeyStore.loadOrCreate();
    if (!mounted) return;
    setState(() {
      _privKey = priv;
      _pubKey = priv.publicKey;
    });
  }

  Future<void> _signAndSync() async {
    final shipmentId = _shipmentIdController.text.trim();
    final newCustodianId = _newCustodianIdController.text.trim();

    if (shipmentId.isEmpty || newCustodianId.isEmpty) {
      setState(() {
        _statusMessage = 'Enter both shipment ID and new custodian ID.';
        _isStatusError = true;
      });
      return;
    }

    final privKey = _privKey;
    final pubKey = _pubKey;
    if (privKey == null || pubKey == null) {
      setState(() {
        _statusMessage = 'Device key not ready yet — try again in a moment.';
        _isStatusError = true;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _statusMessage = 'Signing payload offline...';
      _isStatusError = false;
    });

    try {
      // Message format must match the backend (services/shipment-service/main.py
      // around line 188): f"{shipment_id}:{custodian_id}" encoded as UTF-8.
      final message = utf8.encode('$shipmentId:$newCustodianId');

      // python-ecdsa's VerifyingKey.verify() defaults to hashfunc=sha1, so
      // we hash here and pass the 20-byte digest into the Dart signer
      // (which treats its input as the pre-hashed digest).
      final digest = crypto.sha1.convert(message).bytes;

      final sig = signature(privKey, digest);
      final sigHex = HEX.encode(sig.toDER());

      setState(() => _statusMessage = 'Signed. Syncing to Origin API...');

      final result = await OriginApiClient.instance.handoffCustody(
        shipmentId: shipmentId,
        custodianId: newCustodianId,
        ecdsaSignatureHex: sigHex,
        publicKeyHex: pubKey.toHex(),
      );

      if (!mounted) return;
      setState(() {
        _statusMessage = 'Handoff verified by backend.\n'
            'Status: ${result['status']}\n'
            'Sig: ${sigHex.substring(0, 20)}...';
        _isStatusError = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _statusMessage = e.toString();
        _isStatusError = true;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _shipmentIdController.dispose();
    _newCustodianIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Custody Handoff'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _shipmentIdController,
              decoration: const InputDecoration(
                labelText: 'Shipment ID (UUID)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.local_shipping_outlined),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _newCustodianIdController,
              decoration: const InputDecoration(
                labelText: 'New Custodian ID (UUID)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 24),
            if (_pubKey != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white24),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Your device pubkey (P-256)',
                      style: TextStyle(color: Colors.white54, fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_pubKey!.toHex().substring(0, 32)}…',
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _isLoading ? null : _signAndSync,
              icon: _isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.fingerprint),
              label: Text(_isLoading ? 'Signing...' : 'Sign & Transfer Custody'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            if (_statusMessage.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (_isStatusError ? Colors.redAccent : Colors.greenAccent)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _statusMessage,
                  style: TextStyle(
                    color: _isStatusError ? Colors.redAccent : Colors.greenAccent,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
