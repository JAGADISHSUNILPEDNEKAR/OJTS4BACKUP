import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class CertificateUploadScreen extends StatefulWidget {
  const CertificateUploadScreen({super.key});

  @override
  State<CertificateUploadScreen> createState() =>
      _CertificateUploadScreenState();
}

class _CertificateUploadScreenState extends State<CertificateUploadScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _anchorToBlockchain = true;
  bool _isUploading = false;
  String? _selectedFileName;

  void _pickFile() {
    // Mock file picking
    setState(() {
      _selectedFileName = 'organic_certification_2023.pdf';
    });
  }

  void _uploadCertificate() async {
    if (_formKey.currentState!.validate() && _selectedFileName != null) {
      setState(() {
        _isUploading = true;
      });

      // Mock upload process
      await Future.delayed(const Duration(seconds: 2));

      setState(() {
        _isUploading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Certificate Uploaded Successfully')),
        );
        context.pop();
      }
    } else if (_selectedFileName == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a file to upload')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Upload Certificate')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GestureDetector(
                onTap: _pickFile,
                child: Container(
                  height: 150,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    border: Border.all(color: Colors.grey.shade400, style: BorderStyle.none),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.upload_file, size: 50, color: Colors.blue.shade300),
                      const SizedBox(height: 10),
                      Text(
                        _selectedFileName ?? 'Tap to select PDF/Image',
                        style: TextStyle(
                            color: _selectedFileName != null ? Colors.black : Colors.grey.shade600,
                            fontWeight: _selectedFileName != null ? FontWeight.bold : FontWeight.normal),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Issuer Name',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.business),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Certificate Type',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.category),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Expiry Date (YYYY-MM-DD)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.date_range),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 24),
              SwitchListTile(
                title: const Text('Anchor to Blockchain'),
                subtitle: const Text('Provides cryptographic proof of existence'),
                value: _anchorToBlockchain,
                activeTrackColor: Colors.blue.shade200,
                activeThumbColor: Colors.blue,
                onChanged: (val) {
                  setState(() {
                    _anchorToBlockchain = val;
                  });
                },
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isUploading ? null : _uploadCertificate,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isUploading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Upload Certificate', style: TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
