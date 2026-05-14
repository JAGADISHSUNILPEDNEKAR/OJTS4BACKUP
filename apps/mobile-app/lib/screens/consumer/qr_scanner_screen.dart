import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Live camera QR verifier. Decodes QR codes via `mobile_scanner` and
/// extracts a shipment UUID from either a bare UUID or a URL containing
/// `/shipments/{uuid}` / `?batchId={uuid}` / `?id={uuid}`. Falls back to
/// manual entry if the camera isn't available or the user wants to type
/// the ID.
class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  final _idController = TextEditingController();
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );

  bool _handled = false;
  bool _torchOn = false;
  String? _cameraError;

  @override
  void dispose() {
    _idController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue?.trim();
      if (raw == null || raw.isEmpty) continue;
      final id = _extractShipmentId(raw);
      if (id != null) {
        _handled = true;
        _scannerController.stop();
        // Pop the scanner stack frame and push the result. Using context.push
        // keeps the consumer flow back-navigable to the home tab.
        if (!mounted) return;
        context.push('/verification-result?batchId=$id');
        return;
      }
    }
  }

  /// Accepts:
  /// - bare UUID (`8-4-4-4-12` hex with dashes)
  /// - demo IDs from `_mockShipments` (e.g. `demo-0001-coffee-lot-a`)
  /// - URLs containing `/shipments/{id}` or query params `batchId` / `id`
  static String? _extractShipmentId(String raw) {
    final uuidRe = RegExp(
      r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
    );
    final uuidMatch = uuidRe.firstMatch(raw);
    if (uuidMatch != null) return uuidMatch.group(0);

    // URL with shipment path or query param.
    final uri = Uri.tryParse(raw);
    if (uri != null) {
      final qp = uri.queryParameters;
      if (qp['batchId']?.isNotEmpty == true) return qp['batchId'];
      if (qp['id']?.isNotEmpty == true) return qp['id'];
      final segs = uri.pathSegments;
      final idx = segs.indexOf('shipments');
      if (idx >= 0 && idx + 1 < segs.length) return segs[idx + 1];
    }

    // Demo IDs and any other non-empty short string — accept as last resort
    // so the consumer-facing demo QR codes (which encode `demo-...`) still
    // round-trip to the verification screen.
    if (raw.length <= 64 && !raw.contains('\n')) return raw;
    return null;
  }

  void _verifyManual() {
    final id = _idController.text.trim();
    if (id.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a shipment ID')),
      );
      return;
    }
    context.push('/verification-result?batchId=$id');
  }

  Future<void> _toggleTorch() async {
    await _scannerController.toggleTorch();
    if (!mounted) return;
    setState(() => _torchOn = !_torchOn);
  }

  Future<void> _switchCamera() async {
    await _scannerController.switchCamera();
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify Shipment'),
        actions: [
          IconButton(
            tooltip: _torchOn ? 'Torch on' : 'Torch off',
            icon: Icon(_torchOn ? Icons.flash_on : Icons.flash_off),
            onPressed: _cameraError == null ? _toggleTorch : null,
          ),
          IconButton(
            tooltip: 'Switch camera',
            icon: const Icon(Icons.cameraswitch_outlined),
            onPressed: _cameraError == null ? _switchCamera : null,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Camera preview with scan reticle overlay.
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: AspectRatio(
                aspectRatio: 1.0,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    MobileScanner(
                      controller: _scannerController,
                      onDetect: _onDetect,
                      errorBuilder: (context, error, child) {
                        // Permission denied, no camera, plugin init error etc.
                        // Record the first message and surface it below the
                        // preview so manual entry remains usable.
                        _cameraError ??= error.errorDetails?.message ??
                            error.errorCode.name;
                        return Container(
                          color: Colors.black,
                          alignment: Alignment.center,
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.no_photography_outlined,
                                    size: 48, color: Colors.white54),
                                const SizedBox(height: 12),
                                Text(
                                  'Camera unavailable',
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _cameraError!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    // Decorative reticle so the user knows where to aim.
                    IgnorePointer(
                      child: Center(
                        child: Container(
                          width: 220,
                          height: 220,
                          decoration: BoxDecoration(
                            border: Border.all(color: primary, width: 3),
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _cameraError == null
                  ? 'Point your camera at an Origin QR code'
                  : 'Camera disabled — use manual entry below',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            const Row(
              children: [
                Expanded(child: Divider(color: Colors.white24)),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('OR', style: TextStyle(color: Colors.white54)),
                ),
                Expanded(child: Divider(color: Colors.white24)),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _idController,
              decoration: const InputDecoration(
                labelText: 'Shipment ID (UUID)',
                hintText: 'Paste or type the shipment ID',
                prefixIcon: Icon(Icons.fingerprint),
              ),
              onSubmitted: (_) => _verifyManual(),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _verifyManual,
              icon: const Icon(Icons.verified_outlined),
              label: const Text('Verify Manually'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
