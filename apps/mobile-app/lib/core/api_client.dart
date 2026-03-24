import 'dart:convert';
import 'package:http/http.dart' as http;

/// API Client for the Origin Mobile Application.
/// Provides architectural parity with the Web App's api.ts.
class OriginApiClient {
  static const String baseUrl = 'http://localhost/api/v1';
  String? _accessToken;

  // Authentication
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      _accessToken = data['access_token'];
      return data;
    } else {
      throw Exception('Login failed: ${response.body}');
    }
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
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch shipments');
    }
  }

  // Escrows
  Future<List<dynamic>> fetchEscrows() async {
    final response = await _authGet('escrows');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      // In parity with the hardened web-app, we throw here instead of returning mocks
      throw Exception('Failed to fetch escrows');
    }
  }

  // Alerts
  Future<List<dynamic>> fetchAlerts() async {
    final response = await _authGet('alerts');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch alerts');
    }
  }

  // Proofs
  String getProofPdfUrl(String shipmentId) {
    return '$baseUrl/shipments/$shipmentId/proof/pdf';
  }
}
