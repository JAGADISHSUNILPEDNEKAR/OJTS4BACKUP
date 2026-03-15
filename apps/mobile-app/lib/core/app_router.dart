import 'package:go_router/go_router.dart';
import '../screens/handover/custody_handoff_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const CustodyHandoffScreen(), // Temp placeholder root
    ),
    // Additional routes will be added here
  ],
);
