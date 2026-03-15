import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/otp_input.dart';

class TwoFactorSetupScreen extends StatelessWidget {
  const TwoFactorSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Security Setup'),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Progress Bar
              Row(
                children: [
                   Expanded(child: Container(height: 4, color: Theme.of(context).colorScheme.primary)),
                   const SizedBox(width: 8),
                   Expanded(child: Container(height: 4, color: Theme.of(context).colorScheme.primary)),
                   const SizedBox(width: 8),
                   Expanded(child: Container(height: 4, color: Theme.of(context).colorScheme.primary)),
                   const SizedBox(width: 8),
                   Expanded(child: Container(height: 4, color: Colors.white.withOpacity(0.2))),
                ],
              ),
              const SizedBox(height: 8),
              Text('Step 3 of 4', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white54)),
              const SizedBox(height: 24),
              
              // Key Icon
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.security, color: Theme.of(context).colorScheme.primary, size: 32),
              ),
              const SizedBox(height: 24),

              Text('Secure Your Account', style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 12),
              Text(
                'To prevent fraud in the supply chain, please enable Two-Factor Authentication. Scan the QR code below with your authenticator app.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // QR Code Graphic Placeholder
              Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                   color: const Color(0xFFF3C99F), // Base color from figma illustration
                   borderRadius: BorderRadius.circular(16),
                ),
                child: Center(
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: const BoxDecoration(
                      color: Color(0xFF1E3A3A),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.qr_code_2, color: Colors.white, size: 64),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.key, color: Colors.blue, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'Unable to scan? Copy setup key',
                    style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Text('Enter the 6-digit code from your app', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 16),
              const OtpInput(),
              const SizedBox(height: 32),
              PrimaryButton(
                text: 'Enable 2FA',
                onPressed: () {
                   // Mock flow continues
                   context.push('/');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
