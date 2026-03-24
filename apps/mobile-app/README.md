# Origin Mobile Application

This is the Flutter-based mobile application for the Origin platform.

## Architectural Parity
This application is designed to be a functional mirror of the Origin Web Application.

### API Integration
A centralized `OriginApiClient` is located in `lib/core/api_client.dart`. This client provides the necessary networking hooks for:
- ECDSA-based Custody Handoffs
- Multi-signature Escrow Management
- Real-time ML Risk Assessment visualization

### Development Note
Currently, many screens use UI mocks. To transition to production mode:
1. Initialize the `OriginApiClient` with your local or staging Gateway URL.
2. Replace local state builders in individual screens with `FutureBuilder` calls to the `OriginApiClient`.

## Environment Setup
- **API URL**: Set the base URL in `api_client.dart` or via `--dart-define` at build time.

