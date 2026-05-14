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
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

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
