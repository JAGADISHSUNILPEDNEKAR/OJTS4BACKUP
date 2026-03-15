import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../widgets/primary_button.dart';

class RoleIdentificationScreen extends StatefulWidget {
  final String role;
  
  const RoleIdentificationScreen({super.key, required this.role});

  @override
  State<RoleIdentificationScreen> createState() => _RoleIdentificationScreenState();
}

class _RoleIdentificationScreenState extends State<RoleIdentificationScreen> {
  final TextEditingController _businessIdController = TextEditingController();

  @override
  void dispose() {
    _businessIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Identification'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Pagination Header Line (stage 3)
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
                        color: Theme.of(context).colorScheme.primary,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Text(
                'Identify Yourself',
                style: Theme.of(context).textTheme.displayMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'You selected ${widget.role}. Please provide your Business Registration Number or connect your Wallet.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.white70,
                ),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _businessIdController,
                decoration: const InputDecoration(
                  labelText: 'Business Registration ID (Optional)',
                  prefixIcon: Icon(Icons.business_outlined),
                ),
              ),
              const SizedBox(height: 16),
              const Center(child: Text('OR', style: TextStyle(color: Colors.white54))),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () {
                  // Connect Wallet logic placeholder
                },
                icon: const Icon(Icons.account_balance_wallet_outlined),
                label: const Text('Connect Web3 Wallet'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(56),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
              const Spacer(),
              PrimaryButton(
                text: 'Complete Setup',
                onPressed: () {
                  // Complete onboarding and go to login
                  context.go('/login');
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
