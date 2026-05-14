import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Thrown by [OriginApiClient.login] when the backend reports the user has
/// TOTP enabled and the request was missing a `totp_code`. Callers should
/// catch this and route to the 2FA screen to collect the 6-digit code.
class TotpRequiredException implements Exception {
  @override
  String toString() => 'TotpRequiredException';
}

/// API Client for the Origin Mobile Application.
/// Singleton with ChangeNotifier-based auth state.
/// Access via `OriginApiClient.instance`.
class OriginApiClient extends ChangeNotifier {
  OriginApiClient._();
  static final OriginApiClient instance = OriginApiClient._();

  // Mac LAN IP — phone reaches backend over Wi-Fi.
  // Change this if the laptop's IP changes (e.g. new Wi-Fi network).
  static const String baseUrl = 'http://10.110.156.5/api/v1';

  String? _accessToken;
  String? get accessToken => _accessToken;
  bool get isAuthenticated => _accessToken != null;

  /// Decodes the JWT's `sub` claim, which auth-service populates with the
  /// user's UUID (services/auth-service/main.py uses subject=str(user.id) on
  /// create_access_token). Returns null when there's no token or the JWT
  /// can't be parsed. Does NOT verify the signature — we trust whatever the
  /// server handed us.
  String? get currentUserId => _claim('sub');

  /// Decodes the JWT's `role` claim populated by auth-service in
  /// create_access_token. One of: SUPERADMIN, COMPANY, AUDITOR, FARMER,
  /// LOGISTICS, RETAILER, GOVERNMENT, CONSUMER, USER. Returns "USER" when
  /// missing so callers can always switch on a non-null value.
  String get currentRole {
    final raw = _claim('role');
    if (raw == null || raw.isEmpty) return 'USER';
    return raw.toUpperCase();
  }

  /// Initial landing route for the logged-in user's role. Used by the login
  /// screen so that e.g. an AUDITOR doesn't get dropped into the FARMER
  /// dashboard. Keep in sync with the role->tab mapping in
  /// MainLayoutScreen.
  String get homeRouteForRole {
    switch (currentRole) {
      case 'FARMER':
        return '/origin-dashboard';
      case 'AUDITOR':
      case 'GOVERNMENT':
        return '/auditor-dashboard';
      case 'LOGISTICS':
        return '/distributor-dashboard';
      case 'COMPANY':
      case 'RETAILER':
      case 'SUPERADMIN':
        return '/admin-dashboard';
      case 'CONSUMER':
        return '/consumer-home';
      default:
        return '/origin-dashboard';
    }
  }

  String? _claim(String name) {
    final token = _accessToken;
    if (token == null) return null;
    final parts = token.split('.');
    if (parts.length != 3) return null;
    try {
      var payload = parts[1];
      payload = payload.padRight(payload.length + (4 - payload.length % 4) % 4, '=');
      final decoded = utf8.decode(base64Url.decode(payload));
      final claims = jsonDecode(decoded) as Map<String, dynamic>;
      final v = claims[name];
      return v?.toString();
    } catch (_) {
      return null;
    }
  }

  // Authentication
  ///
  /// Calls POST /api/v1/auth/login. The backend supports an optional TOTP
  /// challenge: if the user has totp_secret set, the first attempt without
  /// [totpCode] returns 401 with detail "TOTP code required". The caller
  /// should catch [TotpRequiredException] and prompt for a 6-digit code,
  /// then call login() again with [totpCode] populated.
  Future<Map<String, dynamic>> login(
    String email,
    String password, {
    String? totpCode,
  }) async {
    final body = <String, dynamic>{'email': email, 'password': password};
    if (totpCode != null && totpCode.isNotEmpty) {
      body['totp_code'] = totpCode;
    }

    final http.Response response;
    try {
      response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
    } on http.ClientException {
      // Demo-mode fallback: when the backend is unreachable (no LAN access,
      // no tunnel, etc.) synthesize a successful login so the public APK
      // doesn't dead-end at the sign-in page. Downstream screens that hit
      // real services will still surface their own errors.
      _accessToken = _stubDemoJwt(email);
      notifyListeners();
      return {'access_token': _accessToken, 'demo_mode': true};
    } on Exception {
      // Same fallback for SocketException / no route to host — these don't
      // surface as ClientException on Android.
      _accessToken = _stubDemoJwt(email);
      notifyListeners();
      return {'access_token': _accessToken, 'demo_mode': true};
    }

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      _accessToken = data['access_token'] as String?;
      notifyListeners();
      return data;
    }

    // Try to extract the backend's structured error detail.
    String detail = response.body;
    try {
      final parsed = jsonDecode(response.body);
      if (parsed is Map && parsed['detail'] is String) {
        detail = parsed['detail'] as String;
      }
    } catch (_) {/* keep raw body */}

    if (response.statusCode == 401 && detail.contains('TOTP code required')) {
      throw TotpRequiredException();
    }
    throw Exception('Login failed (${response.statusCode}): $detail');
  }

  void logout() {
    _accessToken = null;
    notifyListeners();
  }

  // Builds an unsigned JWT with a deterministic `sub` derived from the email,
  // so currentUserId works in demo mode. Not accepted by any real backend.
  // Role is inferred from the email so RBAC routing works offline.
  static String _stubDemoJwt(String email) {
    String b64(String s) =>
        base64Url.encode(utf8.encode(s)).replaceAll('=', '');
    final header = b64('{"alg":"none","typ":"JWT"}');
    final sub = 'demo-${email.hashCode.toUnsigned(32).toRadixString(16)}';
    final iat = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final role = _roleFromEmail(email);
    final payload =
        b64('{"sub":"$sub","email":"$email","role":"$role","iat":$iat}');
    return '$header.$payload.${b64("demo")}';
  }

  // Crude keyword match — demo only. Real role comes from the backend JWT.
  static String _roleFromEmail(String email) {
    final e = email.toLowerCase();
    if (e.contains('superadmin') || e.contains('admin')) return 'SUPERADMIN';
    if (e.contains('auditor') || e.contains('regulator')) return 'AUDITOR';
    if (e.contains('government') || e.contains('gov')) return 'GOVERNMENT';
    if (e.contains('logistic') || e.contains('carrier') || e.contains('distributor')) {
      return 'LOGISTICS';
    }
    if (e.contains('retailer')) return 'RETAILER';
    if (e.contains('company') || e.contains('buyer') || e.contains('corp')) {
      return 'COMPANY';
    }
    if (e.contains('consumer')) return 'CONSUMER';
    if (e.contains('farmer') || e.contains('producer')) return 'FARMER';
    return 'USER';
  }

  // Generic Authenticated Request
  Future<http.Response> _authGet(String path) async {
    return http.get(
      Uri.parse('$baseUrl/$path'),
      headers: {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      },
    );
  }

  // Shipments
  Future<List<dynamic>> fetchShipments() async {
    final response = await _authGet('shipments');
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception('Failed to fetch shipments (${response.statusCode})');
    }
  }

  Future<Map<String, dynamic>> createShipment({
    required String destination,
    String? farmerId,
  }) async {
    final fid = farmerId ?? currentUserId;
    if (fid == null) {
      throw Exception('No farmer ID available — log in first or provide one explicitly');
    }
    final response = await http.post(
      Uri.parse('$baseUrl/shipments'),
      headers: {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'farmer_id': fid, 'destination': destination}),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to create shipment (${response.statusCode}): ${response.body}');
    }
  }

  Future<Map<String, dynamic>> fetchShipmentById(String id) async {
    final response = await _authGet('shipments/$id');
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to fetch shipment $id (${response.statusCode})');
    }
  }

  Future<Map<String, dynamic>> fetchShipmentRisk(String id) async {
    final response = await _authGet('shipments/$id/risk');
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to fetch risk for $id (${response.statusCode})');
    }
  }

  // Escrow actions. The escrow-service exposes no list/status endpoint
  // today, so there is no fetchEscrows() — only the action methods below.

  Future<Map<String, dynamic>> flagDispute(String shipmentId) async {
    final uri = Uri.parse('$baseUrl/escrow/dispute').replace(
      queryParameters: {'shipment_id': shipmentId},
    );
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to flag dispute (${response.statusCode}): ${response.body}');
    }
  }

  /// POST /api/v1/shipments/{id}/custody — submit a chain-of-custody event
  /// signed by the device's ECDSA key. Backend verifies the signature against
  /// the registered custodian pubkey (trust-on-first-use binds on first
  /// handoff).
  Future<Map<String, dynamic>> handoffCustody({
    required String shipmentId,
    required String custodianId,
    required String ecdsaSignatureHex,
    required String publicKeyHex,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/shipments/$shipmentId/custody'),
      headers: {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'custodian_id': custodianId,
        'ecdsa_signature': ecdsaSignatureHex,
        'public_key': publicKeyHex,
      }),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Handoff failed (${response.statusCode}): ${response.body}');
    }
  }

  Future<Map<String, dynamic>> initEscrow({
    required String shipmentId,
    required String buyerId,
    required String buyerPubkey,
    required String sellerPubkey,
    required double amountUsd,
    required double amountBtc,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/shipments/$shipmentId/escrow/init'),
      headers: {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'buyer_id': buyerId,
        'buyer_pubkey': buyerPubkey,
        'seller_pubkey': sellerPubkey,
        'amount_usd': amountUsd,
        'amount_btc': amountBtc,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to init escrow (${response.statusCode}): ${response.body}');
    }
  }

  // Users
  Future<Map<String, dynamic>> fetchMyProfile() async {
    final response = await _authGet('users/me');
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to fetch profile (${response.statusCode})');
    }
  }

  /// PUT /api/v1/users/me. Pass any subset of {email, displayName, isActive,
  /// preferences}. The server rejects self role-changes (403).
  Future<Map<String, dynamic>> updateMyProfile({
    String? email,
    String? displayName,
    bool? isActive,
    Map<String, dynamic>? preferences,
  }) async {
    final body = <String, dynamic>{};
    if (email != null) body['email'] = email;
    if (displayName != null) body['display_name'] = displayName;
    if (isActive != null) body['is_active'] = isActive;
    if (preferences != null) body['preferences'] = preferences;

    final response = await http.put(
      Uri.parse('$baseUrl/users/me'),
      headers: {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to update profile (${response.statusCode}): ${response.body}');
    }
  }

  Future<void> logoutBackend() async {
    final token = _accessToken;
    _accessToken = null;
    notifyListeners();
    if (token == null) return;
    // Fire-and-forget the backend revoke — even if the network fails the
    // local token is already cleared.
    try {
      await http.post(
        Uri.parse('$baseUrl/auth/logout'),
        headers: {'Authorization': 'Bearer $token'},
      );
    } catch (_) {/* best effort */}
  }

  // Audits
  Future<List<dynamic>> fetchAudits() async {
    final response = await _authGet('audits/');
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception('Failed to fetch audits (${response.statusCode})');
    }
  }

  Future<Map<String, dynamic>> requestAudit(String shipmentId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/audits/'),
      headers: {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'shipment_id': shipmentId}),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to request audit (${response.statusCode}): ${response.body}');
    }
  }

  // Alerts
  Future<List<dynamic>> fetchAlerts() async {
    final response = await _authGet('alerts');
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception('Failed to fetch alerts (${response.statusCode})');
    }
  }

  // Proofs
  String getProofPdfUrl(String shipmentId) {
    return '$baseUrl/shipments/$shipmentId/proof/pdf';
  }
}
