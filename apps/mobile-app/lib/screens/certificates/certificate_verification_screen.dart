import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class CertificateVerificationScreen extends StatefulWidget {
  const CertificateVerificationScreen({super.key});

  @override
  State<CertificateVerificationScreen> createState() =>
      _CertificateVerificationScreenState();
}

class _CertificateVerificationScreenState
    extends State<CertificateVerificationScreen> {
  String _searchQuery = '';

  final List<Map<String, dynamic>> _certificates = [
    {
      'id': 'CERT-9921',
      'type': 'Organic Handling',
      'issuer': 'Global Organic Trust',
      'status': 'Valid',
    },
    {
      'id': 'CERT-8834',
      'type': 'Fair Trade',
      'issuer': 'FairTrade Org',
      'status': 'Expired',
    },
    {
      'id': 'CERT-7712',
      'type': 'Quality Assurance',
      'issuer': 'QA Intl',
      'status': 'Revoked',
    },
  ];

  @override
  Widget build(BuildContext context) {
    var filteredCerts = _certificates
        .where((c) =>
            c['id'].toLowerCase().contains(_searchQuery.toLowerCase()) ||
            c['type'].toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Verify Certificates')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search by ID or Type',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (val) {
                setState(() {
                  _searchQuery = val;
                });
              },
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filteredCerts.length,
              itemBuilder: (context, index) {
                final cert = filteredCerts[index];
                return _buildCertCard(cert);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCertCard(Map<String, dynamic> cert) {
    Color statusColor;
    IconData statusIcon;

    switch (cert['status']) {
      case 'Valid':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'Expired':
        statusColor = Colors.orange;
        statusIcon = Icons.access_time;
        break;
      case 'Revoked':
      default:
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        break;
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: ListTile(
        leading: Icon(Icons.workspace_premium, size: 40, color: Colors.blue.shade700),
        title: Text(cert['type'], style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('Issuer: ${cert['issuer']}\nID: ${cert['id']}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(statusIcon, color: statusColor),
            const SizedBox(height: 4),
            Text(
              cert['status'],
              style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ],
        ),
        onTap: () {
          if (cert['status'] == 'Valid') {
            context.push('/certificate-proof/${cert['id']}');
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Cannot verify ${cert['status'].toLowerCase()} certificate.')),
            );
          }
        },
      ),
    );
  }
}
