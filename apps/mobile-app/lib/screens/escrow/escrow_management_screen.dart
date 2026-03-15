import 'package:flutter/material.dart';

class EscrowManagementScreen extends StatefulWidget {
  const EscrowManagementScreen({super.key});

  @override
  State<EscrowManagementScreen> createState() => _EscrowManagementScreenState();
}

class _EscrowManagementScreenState extends State<EscrowManagementScreen> {
  // Mock data for transactions
  final List<Map<String, dynamic>> _transactions = [
    {
      'id': 'TXN-1029',
      'amount': '5,000 USDC',
      'status': 'Completed',
      'date': 'Oct 24, 2023',
    },
    {
      'id': 'TXN-1030',
      'amount': '2,500 USDC',
      'status': 'Pending',
      'date': 'Oct 25, 2023',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Escrow Management'),
        backgroundColor: colorScheme.surface,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Dashboard Balance Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24.0),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    colorScheme.primary,
                    colorScheme.primary.withOpacity(0.8),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: colorScheme.primary.withOpacity(0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Funds in Escrow',
                    style: textTheme.titleMedium?.copyWith(
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '12,500.00 USDC',
                    style: textTheme.displayMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            // Release payment action
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Payment Released successfully')),
                            );
                          },
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text('Release'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: colorScheme.primary,
                            minimumSize: const Size(0, 48),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            // Raise dispute action
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Dispute Raised')),
                            );
                          },
                          icon: const Icon(Icons.warning_amber_rounded),
                          label: const Text('Dispute'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white54),
                            minimumSize: const Size(0, 48),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            
            // Transaction History
            Text(
              'Recent Transactions',
              style: textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _transactions.length,
              itemBuilder: (context, index) {
                final txn = _transactions[index];
                final isCompleted = txn['status'] == 'Completed';

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  color: colorScheme.surface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: CircleAvatar(
                      backgroundColor: isCompleted 
                          ? colorScheme.secondary.withOpacity(0.2)
                          : colorScheme.primary.withOpacity(0.2),
                      child: Icon(
                        isCompleted ? Icons.check : Icons.hourglass_empty,
                        color: isCompleted ? colorScheme.secondary : colorScheme.primary,
                      ),
                    ),
                    title: Text(
                      txn['id'],
                      style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      txn['date'],
                      style: textTheme.bodyMedium,
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          txn['amount'],
                          style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          txn['status'],
                          style: textTheme.bodySmall?.copyWith(
                            color: isCompleted ? colorScheme.secondary : colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                    onTap: () {
                      // Detail view if needed
                    },
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
