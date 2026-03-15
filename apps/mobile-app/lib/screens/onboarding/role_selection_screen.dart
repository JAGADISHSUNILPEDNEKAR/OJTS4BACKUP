import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/role_card.dart';

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  String? _selectedRole;

  void _selectRole(String role) {
    setState(() {
      _selectedRole = role;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              // Pagination Header Line (blue and grey segments)
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Text(
                'Welcome to Origin',
                style: Theme.of(context).textTheme.displayMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Select your role in the supply chain to tailor your workspace.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.white70,
                ),
              ),
              const SizedBox(height: 32),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      RoleCard(
                        icon: Icons.agriculture_outlined,
                        title: 'Farmer/Producer',
                        description: 'Register crops and log harvest data.',
                        isSelected: _selectedRole == 'Farmer',
                        onTap: () => _selectRole('Farmer'),
                      ),
                      RoleCard(
                        icon: Icons.local_shipping_outlined,
                        title: 'Logistics/Carrier',
                        description: 'Update shipment status and logs.',
                        isSelected: _selectedRole == 'Logistics',
                        onTap: () => _selectRole('Logistics'),
                      ),
                      RoleCard(
                        icon: Icons.storefront_outlined,
                        title: 'Buyer/Corporation',
                        description: 'Verify sourcing and manage contracts.',
                        isSelected: _selectedRole == 'Buyer',
                        onTap: () => _selectRole('Buyer'),
                      ),
                      RoleCard(
                        icon: Icons.verified_user_outlined,
                        title: 'Auditor/Regulator',
                        description: 'View compliance reports and audits.',
                        isSelected: _selectedRole == 'Auditor',
                        onTap: () => _selectRole('Auditor'),
                      ),
                      RoleCard(
                        icon: Icons.qr_code_scanner_outlined,
                        title: 'Consumer',
                        description: 'Scan product QR codes for provenance.',
                        isSelected: _selectedRole == 'Consumer',
                        onTap: () => _selectRole('Consumer'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                text: 'Continue',
                onPressed: _selectedRole != null 
                    ? () {
                        context.push('/role-identification', extra: _selectedRole);
                      }
                    : null, // Disable if no role selected
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
