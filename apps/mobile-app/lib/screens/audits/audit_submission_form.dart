import 'package:flutter/material.dart';

class AuditSubmissionForm extends StatefulWidget {
  const AuditSubmissionForm({super.key});

  @override
  State<AuditSubmissionForm> createState() => _AuditSubmissionFormState();
}

class _AuditSubmissionFormState extends State<AuditSubmissionForm> {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();
  final _signatureController = TextEditingController();
  
  bool _isCompliant = false;
  bool _hasWarning = false;

  @override
  void dispose() {
    _notesController.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  void _submitAudit() {
    if (_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Audit report submitted successfully')),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Submit Audit Report'),
        backgroundColor: colorScheme.surface,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Audit Findings',
                style: textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'Please provide detailed observations from your inspection.',
                style: textTheme.bodyMedium?.copyWith(color: Colors.white70),
              ),
              const SizedBox(height: 24),
              
              // Compliance switches
              Card(
                color: colorScheme.surface,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Column(
                    children: [
                      SwitchListTile(
                        title: const Text('Meets Quality Standards'),
                        subtitle: const Text('Product meets all specified quality requirements.'),
                        value: _isCompliant,
                        onChanged: (val) {
                          setState(() {
                            _isCompliant = val;
                          });
                        },
                        activeColor: colorScheme.secondary,
                      ),
                      const Divider(height: 1, indent: 16, endIndent: 16),
                      SwitchListTile(
                        title: const Text('Requires Warning / Follow-up'),
                        subtitle: const Text('Minor issues found that require attention.'),
                        value: _hasWarning,
                        onChanged: (val) {
                          setState(() {
                            _hasWarning = val;
                          });
                        },
                        activeColor: Colors.orangeAccent,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Image Upload Placeholder
              Text(
                'Evidence (Photos/Documents)',
                style: textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () {
                  // Simulate image upload
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  height: 120,
                  decoration: BoxDecoration(
                    color: colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: colorScheme.primary.withOpacity(0.5),
                      width: 1.5,
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.cloud_upload_outlined, size: 40, color: colorScheme.primary),
                      const SizedBox(height: 8),
                      Text('Tap to upload photos', style: textTheme.bodyMedium),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Detailed Notes
              TextFormField(
                controller: _notesController,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Detailed Notes',
                  hintText: 'Enter specific observations or issues found...',
                  alignLabelWithHint: true,
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter detailed notes.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // Digital Signature Signature
              TextFormField(
                controller: _signatureController,
                decoration: const InputDecoration(
                  labelText: 'Digital Signature (Type Full Name)',
                  prefixIcon: Icon(Icons.edit_document),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Signature is required.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 40),

              // Submit Button
              ElevatedButton(
                onPressed: _submitAudit,
                child: const Text('Submit Final Report'),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
