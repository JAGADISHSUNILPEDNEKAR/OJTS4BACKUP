import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  bool _isFlashOn = false;

  void _onScanSuccess() {
    // Navigate to the verification result screen passing some mock param
    context.push('/verification-result?batchId=BT-99238');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Mock Camera View
          Positioned.fill(
            child: GestureDetector(
              onTap: _onScanSuccess, // Tap anywhere to mock scan success
              child: Container(
                color: Colors.black87,
                child: const Center(
                  child: Text(
                    'Tap screen to mock scan QR code',
                    style: TextStyle(color: Colors.white54, fontSize: 16),
                  ),
                ),
              ),
            ),
          ),
          
          // App Bar Area (transparent)
          Positioned(
            top: 50,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 30),
                  onPressed: () => context.pop(),
                ),
                IconButton(
                  icon: Icon(
                    _isFlashOn ? Icons.flash_on : Icons.flash_off,
                    color: Colors.white,
                    size: 30,
                  ),
                  onPressed: () {
                    setState(() {
                      _isFlashOn = !_isFlashOn;
                    });
                  },
                ),
              ],
            ),
          ),
          
          // Frame overlay
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.greenAccent, width: 2),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),

          // Bottom instruction text and fallback button
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Column(
              children: [
                const Text(
                  'Align QR code within the frame',
                  style: TextStyle(color: Colors.white, fontSize: 16),
                ),
                const SizedBox(height: 24),
                TextButton(
                  onPressed: () {
                    context.push('/verification-result?batchId=MANUAL-ENTRY');
                  },
                  child: const Text(
                    'Enter code manually',
                    style: TextStyle(color: Colors.greenAccent, fontSize: 16),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
