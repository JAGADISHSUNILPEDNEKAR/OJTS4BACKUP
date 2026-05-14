import 'package:elliptic/elliptic.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the device's ECDSA signing key in iOS Keychain / Android Keystore.
///
/// Uses NIST P-256 (a.k.a. secp256r1 / prime256v1) to match the backend's
/// signature verification, which imports `NIST256p` from python-ecdsa (see
/// services/shipment-service/main.py). Older builds used secp256k1; that
/// curve is incompatible with the server and any previously stored key
/// would always fail verification — loadOrCreate() detects an unparseable
/// blob and silently regenerates.
class CustodianKeyStore {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  static const _privKeyHexKey = 'origin.custodian.priv_hex_p256';

  /// Returns the persisted P-256 private key, or generates and stores a new
  /// one on first run. Subsequent calls return the same key.
  static Future<PrivateKey> loadOrCreate() async {
    final ec = getP256();
    final stored = await _storage.read(key: _privKeyHexKey);
    if (stored != null && stored.isNotEmpty) {
      try {
        return PrivateKey.fromHex(ec, stored);
      } catch (_) {
        // Stored blob isn't a valid P-256 key (most likely a secp256k1 key
        // from an older build). Wipe and regenerate.
      }
    }
    final fresh = ec.generatePrivateKey();
    await _storage.write(key: _privKeyHexKey, value: fresh.toHex());
    return fresh;
  }

  /// Wipe the persisted key. Surfaced so a user-initiated "reset device
  /// identity" flow can rotate the key without uninstalling.
  static Future<void> rotate() async {
    await _storage.delete(key: _privKeyHexKey);
  }
}
