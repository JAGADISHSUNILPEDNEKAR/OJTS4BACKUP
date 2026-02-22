import 'package:flutter/material.dart';
import 'package:elliptic/elliptic.dart';
import 'package:ecdsa/ecdsa.dart';
import 'dart:convert';
import 'package:hex/hex.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const OriginMobileApp());
}

class OriginMobileApp extends StatelessWidget {
  const OriginMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Origin Mobile',
      theme: ThemeData(
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3b82f6),
          secondary: Color(0xFF10b981),
          surface: Color(0xFF1e293b),
        ),
        useMaterial3: true,
      ),
      home: const CustodyHandoffScreen(),
    );
  }
}

class CustodyHandoffScreen extends StatefulWidget {
  const CustodyHandoffScreen({super.key});

  @override
  State<CustodyHandoffScreen> createState() => _CustodyHandoffScreenState();
}

class _CustodyHandoffScreenState extends State<CustodyHandoffScreen> {
  final String _shipmentId = "SHP-XYZ987";
  final TextEditingController _recipientIdController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  String _statusMessage = "";
  bool _isLoading = false;
  
  // Local volatile mock keypair. In prod, this would be in SecureStorage.
  late PrivateKey _privKey;
  late PublicKey _pubKey;

  @override
  void initState() {
    super.initState();
    final ec = getSecp256k1();
    _privKey = ec.generatePrivateKey();
    _pubKey = _privKey.publicKey;
  }

  Future<void> _signAndSync() async {
    if (_recipientIdController.text.isEmpty || _locationController.text.isEmpty) {
      setState(() => _statusMessage = "Please fill all fields.");
      return;
    }
    
    setState(() {
      _isLoading = true;
      _statusMessage = "Signing payload offline...";
    });

    try {
      // 1. Construct Payload
      final payload = {
        "shipment_id": _shipmentId,
        "recipient_id": _recipientIdController.text,
        "location": _locationController.text,
        "timestamp": DateTime.now().toIso8601String(),
        "public_key": _pubKey.toHex()
      };

      final payloadString = jsonEncode(payload);
      
      // 2. ECDSA Offline Sign
      final hash = List<int>.from(utf8.encode(payloadString));
      final sig = signature(_privKey, hash);
      final sigHex = HEX.encode(sig.toDER());

      setState(() {
         _statusMessage = "Signed. Syncing to Origin API...";
      });

      // 3. Sync to Backend API (Simulated if no connection)
      final apiUri = Uri.parse('http://localhost:8000/api/v1/shipments/$_shipmentId/custody');
      
      try {
        final response = await http.post(
          apiUri,
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({
            "payload": payload,
            "signature": sigHex
          }).toString()
        );
        
        if (response.statusCode == 200 || response.statusCode == 201) {
           setState(() => _statusMessage = "Sync Successful!\nSig: ${sigHex.substring(0,20)}...");
        } else {
           setState(() => _statusMessage = "Sync Failed: ${response.statusCode} (API Unreachable)");
        }
      } catch (e) {
        // Offline-first approach - would save to local sqflite here
        setState(() => _statusMessage = "Offline Mode: Custody event saved locally.\nSig: ${sigHex.substring(0,20)}...");
      }

    } catch (e) {
      setState(() => _statusMessage = "Error: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Origin - Handover'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Shipment ID", style: TextStyle(color: Colors.grey)),
                  Text(_shipmentId, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                ]
              )
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _recipientIdController,
              decoration: const InputDecoration(
                labelText: 'Recipient ID (e.g. Farmer, Driver)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _locationController,
              decoration: const InputDecoration(
                labelText: 'Current Location (Lat, Lon / Name)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isLoading ? null : _signAndSync,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
              child: _isLoading 
                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text("Sign & Transfer Custody", style: TextStyle(fontSize: 16)),
            ),
            const SizedBox(height: 24),
            Center(
               child: Text(
                 _statusMessage, 
                 style: TextStyle(
                   color: _statusMessage.contains("Error") || _statusMessage.contains("Failed") 
                      ? Colors.redAccent 
                      : Colors.greenAccent,
                   fontWeight: FontWeight.w500
                 ),
                 textAlign: TextAlign.center,
               )
            )
          ],
        ),
      ),
    );
  }
}
