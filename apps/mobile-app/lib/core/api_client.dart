import 'dart:async';
import 'dart:convert';
import 'dart:io';
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

  /// Set by the onboarding RoleIdentificationScreen so demo-mode logins use
  /// the role the user just picked, rather than guessing from the email.
  /// One of the backend role enum values (FARMER, AUDITOR, LOGISTICS,
  /// COMPANY, RETAILER, GOVERNMENT, CONSUMER, SUPERADMIN). Ignored when the
  /// backend is reachable — real JWTs are authoritative.
  String? _pendingDemoRole;
  void setPendingDemoRole(String role) {
    _pendingDemoRole = role.toUpperCase();
  }

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
      _accessToken = _stubDemoJwt(email, _pendingDemoRole);
      notifyListeners();
      return {'access_token': _accessToken, 'demo_mode': true};
    } on Exception {
      // Same fallback for SocketException / no route to host — these don't
      // surface as ClientException on Android.
      _accessToken = _stubDemoJwt(email, _pendingDemoRole);
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
  // Role is taken from the explicit demo override when set (onboarding choice)
  // and falls back to email-keyword inference.
  static String _stubDemoJwt(String email, String? override) {
    String b64(String s) =>
        base64Url.encode(utf8.encode(s)).replaceAll('=', '');
    final header = b64('{"alg":"none","typ":"JWT"}');
    final sub = 'demo-${email.hashCode.toUnsigned(32).toRadixString(16)}';
    final iat = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final role = (override != null && override.isNotEmpty)
        ? override
        : _roleFromEmail(email);
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

  // Network errors (no LAN, no tunnel, connection refused) get swallowed and
  // each fetch/mutation falls back to a demo payload below. Non-2xx responses
  // from a reachable backend still surface as exceptions.
  static bool _isOffline(Object e) =>
      e is SocketException ||
      e is http.ClientException ||
      e is TimeoutException;

  // Shipments
  Future<List<dynamic>> fetchShipments() async {
    try {
      final response = await _authGet('shipments');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
      throw Exception('Failed to fetch shipments (${response.statusCode})');
    } catch (e) {
      if (_isOffline(e)) return _mockShipments();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createShipment({
    required String destination,
    String? farmerId,
  }) async {
    final fid = farmerId ?? currentUserId ?? 'demo-farmer';
    try {
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
      }
      throw Exception('Failed to create shipment (${response.statusCode}): ${response.body}');
    } catch (e) {
      if (_isOffline(e)) {
        return {
          'id': _mockUuid('shp'),
          'farmer_id': fid,
          'destination': destination,
          'status': 'created',
          'demo_mode': true,
        };
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchShipmentById(String id) async {
    try {
      final response = await _authGet('shipments/$id');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception('Failed to fetch shipment $id (${response.statusCode})');
    } catch (e) {
      if (_isOffline(e)) return _mockShipmentDetail(id);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchShipmentRisk(String id) async {
    try {
      final response = await _authGet('shipments/$id/risk');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception('Failed to fetch risk for $id (${response.statusCode})');
    } catch (e) {
      if (_isOffline(e)) {
        return {
          'shipment_id': id,
          'risk_score': 0.12,
          'classification': 'LOW',
          'demo_mode': true,
        };
      }
      rethrow;
    }
  }

  // Escrow actions. The escrow-service exposes no list/status endpoint
  // today, so there is no fetchEscrows() — only the action methods below.

  Future<Map<String, dynamic>> flagDispute(String shipmentId) async {
    final uri = Uri.parse('$baseUrl/escrow/dispute').replace(
      queryParameters: {'shipment_id': shipmentId},
    );
    try {
      final response = await http.post(
        uri,
        headers: {
          'Authorization': 'Bearer $_accessToken',
          'Content-Type': 'application/json',
        },
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception('Failed to flag dispute (${response.statusCode}): ${response.body}');
    } catch (e) {
      if (_isOffline(e)) {
        return {
          'shipment_id': shipmentId,
          'status': 'disputed',
          'demo_mode': true,
        };
      }
      rethrow;
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
    try {
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
      }
      throw Exception('Handoff failed (${response.statusCode}): ${response.body}');
    } catch (e) {
      if (_isOffline(e)) {
        return {
          'shipment_id': shipmentId,
          'custodian_id': custodianId,
          'status': 'verified',
          'demo_mode': true,
        };
      }
      rethrow;
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
    try {
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
      }
      throw Exception('Failed to init escrow (${response.statusCode}): ${response.body}');
    } catch (e) {
      if (_isOffline(e)) {
        return {
          'shipment_id': shipmentId,
          'escrow_id': _mockUuid('esc'),
          'status': 'pending',
          'amount_usd': amountUsd,
          'amount_btc': amountBtc,
          'demo_mode': true,
        };
      }
      rethrow;
    }
  }

  // Users
  Future<Map<String, dynamic>> fetchMyProfile() async {
    try {
      final response = await _authGet('users/me');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception('Failed to fetch profile (${response.statusCode})');
    } catch (e) {
      if (_isOffline(e)) return _mockProfile();
      rethrow;
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

    try {
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
      }
      throw Exception('Failed to update profile (${response.statusCode}): ${response.body}');
    } catch (e) {
      if (_isOffline(e)) {
        final stub = _mockProfile();
        return {...stub, ...body, 'demo_mode': true};
      }
      rethrow;
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
    try {
      final response = await _authGet('audits/');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
      throw Exception('Failed to fetch audits (${response.statusCode})');
    } catch (e) {
      if (_isOffline(e)) return _mockAudits();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestAudit(String shipmentId) async {
    try {
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
      }
      throw Exception('Failed to request audit (${response.statusCode}): ${response.body}');
    } catch (e) {
      if (_isOffline(e)) {
        return {
          'id': _mockUuid('aud'),
          'shipment_id': shipmentId,
          'status': 'requested',
          'demo_mode': true,
        };
      }
      rethrow;
    }
  }

  // Alerts
  Future<List<dynamic>> fetchAlerts() async {
    try {
      final response = await _authGet('alerts');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
      throw Exception('Failed to fetch alerts (${response.statusCode})');
    } catch (e) {
      if (_isOffline(e)) return _mockAlerts();
      rethrow;
    }
  }

  // Proofs
  String getProofPdfUrl(String shipmentId) {
    return '$baseUrl/shipments/$shipmentId/proof/pdf';
  }

  // ---------------------------------------------------------------------------
  // Demo-mode payloads — used when the device can't reach the backend so the
  // UI still has something to render. None of these round-trip to a real
  // service.
  // ---------------------------------------------------------------------------

  static String _mockUuid(String prefix) {
    final ts = DateTime.now().microsecondsSinceEpoch.toRadixString(16);
    return '$prefix-${ts.padLeft(12, '0')}';
  }

  Map<String, dynamic> _mockProfile() {
    final sub = currentUserId ?? 'demo-user';
    final role = currentRole;
    return {
      'id': sub,
      'email': 'demo@origin.local',
      'display_name': 'Demo User',
      'role': role,
      'organization_id': 'demo-org',
      'is_active': true,
      'preferences': {},
      'demo_mode': true,
    };
  }

  List<dynamic> _mockShipments() {
    return [
      {
        'id': 'demo-0001-coffee-lot-a',
        'farmer_id': currentUserId ?? 'demo-farmer',
        'destination': 'Bangalore Warehouse',
        'status': 'in_transit',
        'risk_score': 0.08,
      },
      {
        'id': 'demo-0002-tea-lot-b',
        'farmer_id': currentUserId ?? 'demo-farmer',
        'destination': 'Mumbai Port',
        'status': 'delivered',
        'risk_score': 0.02,
      },
      {
        'id': 'demo-0003-spice-lot-c',
        'farmer_id': currentUserId ?? 'demo-farmer',
        'destination': 'Chennai Hub',
        'status': 'created',
        'risk_score': 0.41,
      },
    ];
  }

  Map<String, dynamic> _mockShipmentDetail(String id) {
    return {
      'id': id,
      'farmer_id': currentUserId ?? 'demo-farmer',
      'destination': 'Bangalore Warehouse',
      'status': 'in_transit',
      'risk_score': 0.08,
      'created_at': DateTime.now().toUtc().toIso8601String(),
      'demo_mode': true,
    };
  }

  List<dynamic> _mockAlerts() {
    final now = DateTime.now().toUtc();
    return [
      {
        'id': 'demo-alert-1',
        'severity': 'CRITICAL',
        'shipment_id': 'demo-0003-spice-lot-c',
        'score': 0.91,
        'timestamp': now.subtract(const Duration(minutes: 12)).toIso8601String(),
      },
      {
        'id': 'demo-alert-2',
        'severity': 'WARNING',
        'shipment_id': 'demo-0001-coffee-lot-a',
        'score': 0.62,
        'timestamp': now.subtract(const Duration(hours: 2)).toIso8601String(),
      },
      {
        'id': 'demo-alert-3',
        'severity': 'INFO',
        'shipment_id': 'demo-0002-tea-lot-b',
        'score': 0.18,
        'timestamp': now.subtract(const Duration(days: 1)).toIso8601String(),
      },
    ];
  }

  List<dynamic> _mockAudits() {
    final now = DateTime.now().toUtc();
    return [
      {
        'id': 'AUD-1042',
        'type': 'Quality Inspection',
        'status': 'Passed',
        'entity': 'demo-0001-coffee-lot-a',
        'auditor': 'demo-auditor',
        'timestamp': now.subtract(const Duration(hours: 6)).toIso8601String(),
        'findings': 0,
      },
      {
        'id': 'AUD-1041',
        'type': 'Custody Review',
        'status': 'Warning',
        'entity': 'demo-0003-spice-lot-c',
        'auditor': 'demo-auditor',
        'timestamp': now.subtract(const Duration(days: 1)).toIso8601String(),
        'findings': 2,
      },
      {
        'id': 'AUD-1039',
        'type': 'Risk Sweep',
        'status': 'Failed',
        'entity': 'demo-0002-tea-lot-b',
        'auditor': 'demo-auditor',
        'timestamp': now.subtract(const Duration(days: 3)).toIso8601String(),
        'findings': 5,
      },
    ];
  }
}
