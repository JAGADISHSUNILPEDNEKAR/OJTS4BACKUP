import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/feature_card.dart';

class ValueIntroScreen extends StatelessWidget {
  const ValueIntroScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      const SizedBox(height: 32),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.agriculture, // Closest material icon to tractor
                          color: Colors.white,
                          size: 40,
                        ),
                      ),
                      const SizedBox(height: 32),
                      Text(
                        'Welcome to Origin',
                        style: Theme.of(context).textTheme.displayMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Eliminating fraud from seed to sale with trustless verification.',
                        style: Theme.of(context).textTheme.bodyLarge,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 40),
                      const FeatureCard(
                        icon: Icons.security,
                        title: 'Secure Provenance',
                        description: 'Trace agricultural assets immutably on the blockchain.',
                      ),
                      const FeatureCard(
                        icon: Icons.hub, // Using hub for ML/network
                        title: 'Automated ML Audits',
                        description: 'AI-driven detection of anomalies in supply data.',
                      ),
                      const FeatureCard(
                        icon: Icons.currency_bitcoin,
                        title: 'Bitcoin Escrow',
                        description: 'Smart contract payments released upon verification.',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Pagination Dots
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildDot(context, isActive: true),
                  _buildDot(context, isActive: false),
                  _buildDot(context, isActive: false),
                ],
              ),
              const SizedBox(height: 32),
              PrimaryButton(
                text: 'Get Started',
                onPressed: () {
                  context.push('/role-selection');
                },
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Already have an account? ',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  GestureDetector(
                    onTap: () {
                      context.push('/login');
                    },
                    child: Text(
                      'Log in',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDot(BuildContext context, {required bool isActive}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      height: 8,
      width: 8,
      decoration: BoxDecoration(
        color: isActive 
          ? Theme.of(context).colorScheme.primary 
          : Colors.white.withOpacity(0.2),
        shape: BoxShape.circle,
      ),
    );
  }
}
