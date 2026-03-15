import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/otp_input.dart';

class TwoFactorVerificationScreen extends StatelessWidget {
  const TwoFactorVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.lock_clock, color: Theme.of(context).colorScheme.primary, size: 40),
              ),
              const SizedBox(height: 32),
              Text('Two-Factor Authentication', style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 12),
              Text(
                "We've sent a 6-digit verification code to your device ending in ...8832",
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              const OtpInput(),
              const SizedBox(height: 48),
              PrimaryButton(
                text: 'Confirm Identity',
                onPressed: () {
                  context.push('/setup-2fa'); // Mock navigation to setup or dashboard
                },
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text("Didn't receive the code? ", style: Theme.of(context).textTheme.bodyMedium),
                  Text(
                    "Resend in 00:24",
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  )
                ],
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   const Icon(Icons.verified_user, color: Colors.white54, size: 16),
                   const SizedBox(width: 8),
                   Text("Protected by AgriGuard - Secure Encryption", style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white54)),
                ],
              )
            ],
          ),
        ),
      ),
    );
  }
}
