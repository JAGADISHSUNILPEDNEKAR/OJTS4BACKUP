import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// Onboarding & Auth
import '../screens/onboarding/value_intro_screen.dart';
import '../screens/onboarding/role_selection_screen.dart';
import '../screens/onboarding/role_identification_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/two_factor_verification_screen.dart';
import '../screens/auth/two_factor_setup_screen.dart';

// Handover
import '../screens/handover/custody_handoff_screen.dart';

// Main Layout & Dashboards
import '../screens/main_layout_screen.dart';
import '../screens/dashboard/origin_dashboard_screen.dart';
import '../screens/dashboard/auditor_dashboard_screen.dart';
import '../screens/wallet/wallet_key_management_screen.dart';

// Phase 3
import '../screens/shipments/shipment_list_screen.dart';
import '../screens/shipments/shipment_details_screen.dart';
import '../screens/alerts/alerts_screen.dart';
import '../screens/profile/profile_settings_screen.dart';

// Phase 5
import '../screens/iot/sensor_details_screen.dart';
import '../screens/escrow/escrow_management_screen.dart';
import '../screens/audits/audit_submission_form.dart';

// Phase 6
import '../screens/consumer/qr_scanner_screen.dart';
import '../screens/consumer/verification_result_screen.dart';

// Phase 7
import '../screens/certificates/certificate_upload_screen.dart';
import '../screens/certificates/certificate_verification_screen.dart';
import '../screens/certificates/certificate_authenticity_proof.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/value-intro',
  routes: [
    // Onboarding routes
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
    
    // Auth routes
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
    
    // Auth-protected Dashboard nested routing
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return MainLayoutScreen(navigationShell: navigationShell);
      },
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/origin-dashboard',
              builder: (context, state) => const OriginDashboardScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/auditor-dashboard',
              builder: (context, state) => const AuditorDashboardScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/shipments',
              builder: (context, state) => const ShipmentListScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/wallet',
              builder: (context, state) => const WalletKeyManagementScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/alerts',
              builder: (context, state) => const AlertsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfileSettingsScreen(),
            ),
          ],
        ),
      ],
    ),

    // Temp placeholder for Handover
    GoRoute(
      path: '/handover',
      builder: (context, state) => const CustodyHandoffScreen(),
    ),
    
    // Shipment Details
    GoRoute(
      path: '/shipment-details/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return ShipmentDetailsScreen(shipmentId: id);
      },
    ),
    
    // Sensor Details
    GoRoute(
      path: '/sensor-details/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return SensorDetailsScreen(sensorId: id);
      },
    ),
    
    // Escrow Management
    GoRoute(
      path: '/escrow',
      builder: (context, state) => const EscrowManagementScreen(),
    ),
    
    // Audit Submission
    GoRoute(
      path: '/audit-submission',
      builder: (context, state) => const AuditSubmissionForm(),
    ),
    
    // Phase 6 - Consumer Flow
    GoRoute(
      path: '/qr-scanner',
      builder: (context, state) => const QRScannerScreen(),
    ),
    GoRoute(
      path: '/verification-result',
      builder: (context, state) {
        final batchId = state.uri.queryParameters['batchId'] ?? 'UNKNOWN';
        return VerificationResultScreen(batchId: batchId);
      },
    ),
    
    // Phase 7 - Certificate Lifecycle
    GoRoute(
      path: '/certificate-upload',
      builder: (context, state) => const CertificateUploadScreen(),
    ),
    GoRoute(
      path: '/certificate-verification',
      builder: (context, state) => const CertificateVerificationScreen(),
    ),
    GoRoute(
      path: '/certificate-proof/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? 'UNKNOWN';
        return CertificateAuthenticityProofScreen(certificateId: id);
      },
    ),
  ],
);
