import 'package:flutter/material.dart';
import 'core/theme.dart';
import 'core/app_router.dart';

void main() {
  runApp(const OriginMobileApp());
}

class OriginMobileApp extends StatelessWidget {
  const OriginMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Origin Mobile',
      theme: OriginTheme.darkTheme,
      routerConfig: appRouter,
    );
  }
}
