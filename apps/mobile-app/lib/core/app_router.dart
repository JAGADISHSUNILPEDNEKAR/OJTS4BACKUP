import 'package:go_router/go_router.dart';
import '../screens/onboarding/value_intro_screen.dart';
import '../screens/onboarding/role_selection_screen.dart';
import '../screens/onboarding/role_identification_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/two_factor_verification_screen.dart';
import '../screens/auth/two_factor_setup_screen.dart';
import '../screens/handover/custody_handoff_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/value-intro',
  routes: [
    GoRoute(
      path: '/value-intro',
      builder: (context, state) => const ValueIntroScreen(),
    ),
    GoRoute(
      path: '/role-identification',
      builder: (context, state) {
        final role = state.extra as String? ?? 'User';
        return RoleIdentificationScreen(role: role);
      },
    ),
    GoRoute(
      path: '/role-selection',
      builder: (context, state) => const RoleSelectionScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/verify-2fa',
      builder: (context, state) => const TwoFactorVerificationScreen(),
    ),
    GoRoute(
      path: '/setup-2fa',
      builder: (context, state) => const TwoFactorSetupScreen(),
    ),
    // Temp placeholder for Handover
    GoRoute(
      path: '/handover',
      builder: (context, state) => const CustodyHandoffScreen(),
    ),
  ],
);
