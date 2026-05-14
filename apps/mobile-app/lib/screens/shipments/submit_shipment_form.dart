import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../widgets/primary_button.dart';

class SubmitShipmentForm extends StatefulWidget {
  const SubmitShipmentForm({super.key});

  @override
  State<SubmitShipmentForm> createState() => _SubmitShipmentFormState();
}

class _SubmitShipmentFormState extends State<SubmitShipmentForm> {
  final _formKey = GlobalKey<FormState>();
  final _destinationController = TextEditingController();
  final _farmerIdController = TextEditingController();
  bool _useMyId = true;
  bool _isLoading = false;
  String? _errorBanner;

  @override
  void initState() {
    super.initState();
    final myId = OriginApiClient.instance.currentUserId;
    if (myId == null) {
      _useMyId = false;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorBanner = null;
    });
    try {
      final result = await OriginApiClient.instance.createShipment(
        destination: _destinationController.text.trim(),
        farmerId: _useMyId ? null : _farmerIdController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Shipment ${result['id']?.toString().substring(0, 8) ?? ''} created')),
      );
      context.go('/shipments');
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorBanner = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _destinationController.dispose();
    _farmerIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final myId = OriginApiClient.instance.currentUserId;
    return Scaffold(
      appBar: AppBar(title: const Text('New Shipment')),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Create a shipment', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                'POST /api/v1/shipments only requires a farmer and a '
                'destination today. Item-level scans, expected dates, and '
                'escrow setup are separate steps that land in their own '
                'flows once those endpoints exist.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _destinationController,
                decoration: const InputDecoration(
                  labelText: 'Destination',
                  hintText: 'Warehouse / city / address',
                  prefixIcon: Icon(Icons.place_outlined),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                value: _useMyId && myId != null,
                onChanged: myId == null ? null : (v) => setState(() => _useMyId = v),
                title: const Text('I am the farmer'),
                subtitle: Text(
                  myId == null
                      ? 'Not logged in — enter a farmer UUID below'
                      : 'Use my user ID (${myId.substring(0, 8)}…)',
                ),
              ),
              if (!_useMyId || myId == null) ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: _farmerIdController,
                  decoration: const InputDecoration(
                    labelText: 'Farmer ID (UUID)',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (v) {
                    if (_useMyId && myId != null) return null;
                    return (v == null || v.trim().isEmpty) ? 'Required' : null;
                  },
                ),
              ],
              const SizedBox(height: 32),
              PrimaryButton(
                text: 'Create Shipment',
                isLoading: _isLoading,
                onPressed: _submit,
              ),
              if (_errorBanner != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_errorBanner!)),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
