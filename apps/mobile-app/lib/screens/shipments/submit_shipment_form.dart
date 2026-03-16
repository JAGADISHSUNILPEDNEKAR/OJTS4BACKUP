import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SubmitShipmentForm extends StatefulWidget {
  const SubmitShipmentForm({super.key});

  @override
  State<SubmitShipmentForm> createState() => _SubmitShipmentFormState();
}

class _SubmitShipmentFormState extends State<SubmitShipmentForm> {
  int _currentStep = 0;
  final _formKey1 = GlobalKey<FormState>();
  final _formKey2 = GlobalKey<FormState>();

  String? _scannedBarcode;
  
  void _scanBarcode() {
    setState(() {
      _scannedBarcode = 'ITEM-8823901-XYZ';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Shipment')),
      body: Stepper(
        currentStep: _currentStep,
        onStepContinue: () {
          if (_currentStep == 0) {
            if (_formKey1.currentState!.validate()) {
              setState(() => _currentStep += 1);
            }
          } else if (_currentStep == 1) {
            if (_formKey2.currentState!.validate()) {
              setState(() => _currentStep += 1);
            }
          } else {
            // Final submit
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Shipment created successfully!')),
            );
            context.pop();
          }
        },
        onStepCancel: () {
          if (_currentStep > 0) {
            setState(() => _currentStep -= 1);
          } else {
            context.pop();
          }
        },
        steps: [
          Step(
            title: const Text('Basic Information'),
            isActive: _currentStep >= 0,
            content: Form(
              key: _formKey1,
              child: Column(
                children: [
                  TextFormField(
                    decoration: const InputDecoration(labelText: 'Destination Warehouse'),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  TextFormField(
                    decoration: const InputDecoration(labelText: 'Expected Delivery Date'),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                ],
              ),
            ),
          ),
          Step(
            title: const Text('Item Scanning'),
            isActive: _currentStep >= 1,
            content: Form(
              key: _formKey2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ElevatedButton.icon(
                    onPressed: _scanBarcode,
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Scan Package Barcode'),
                  ),
                  const SizedBox(height: 16),
                  if (_scannedBarcode != null)
                    ListTile(
                      leading: const Icon(Icons.check_circle, color: Colors.green),
                      title: Text(_scannedBarcode!),
                      subtitle: const Text('Successfully added'),
                    ),
                  // Hidden field just for validation logic mock
                  TextFormField(
                    readOnly: true,
                    controller: TextEditingController(text: _scannedBarcode),
                    decoration: const InputDecoration(border: InputBorder.none),
                    validator: (v) => (v == null || v.isEmpty) ? 'Must scan at least 1 item' : null,
                    style: const TextStyle(fontSize: 0, height: 0),
                  ),
                ],
              ),
            ),
          ),
          Step(
            title: const Text('Confirmation'),
            isActive: _currentStep >= 2,
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Review shipment details before generating MOCK-PSBT.'),
                const SizedBox(height: 16),
                const Text('Items: 1', style: TextStyle(fontWeight: FontWeight.bold)),
                Text('Barcode: ${_scannedBarcode ?? "None"}'),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  color: Colors.orange.shade50,
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('System Mode: MOCK BLOCKCHAIN', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                      Text('Escrow Amount: 18500.00 USD (0.2073 BTC)'),
                      Text('Network Fee: Simulated'),
                    ]
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
