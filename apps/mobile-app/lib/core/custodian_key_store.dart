import 'package:elliptic/elliptic.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the device's ECDSA signing key in iOS Keychain / Android Keystore.
///
/// Before this existed, custody_handoff_screen generated a fresh secp256k1
/// keypair on every initState — which means each app launch produced a
/// different "custodian" pubkey. Backend signature verification (item #26)
/// can't tell a real handoff from a replay if the device's identity rotates
/// every launch.
class CustodianKeyStore {
  // iOS: protect with first-unlock-this-device-only so the key stays accessible
  // to background sync after the user unlocks once, but never leaves the device.
  // Android: encrypted by Keystore, only readable by this app.
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  static const _privKeyHexKey = 'origin.custodian.priv_hex';

  /// Returns the persisted private key, or generates and stores a new one
  /// on first run. Subsequent calls return the same key.
  static Future<PrivateKey> loadOrCreate() async {
    final stored = await _storage.read(key: _privKeyHexKey);
    if (stored != null && stored.isNotEmpty) {
      return PrivateKey.fromHex(getSecp256k1(), stored);
    }
    final ec = getSecp256k1();
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
