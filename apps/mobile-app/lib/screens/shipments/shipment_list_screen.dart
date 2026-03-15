import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ShipmentListScreen extends StatelessWidget {
  const ShipmentListScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shipments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {},
          )
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: 10,
        itemBuilder: (context, index) {
          final isDelivered = index % 3 == 0;
          return Card(
            margin: const EdgeInsets.only(bottom: 12.0),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16.0),
              leading: const CircleAvatar(
                backgroundColor: Colors.blueAccent,
                child: Icon(Icons.local_shipping, color: Colors.white),
              ),
              title: Text('Shipment #100${index}', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  const Text('Origin: Farm A\nDestination: Processing Plant X'),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDelivered ? Colors.green.withOpacity(0.2) : Colors.orange.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      isDelivered ? 'Delivered' : 'In Transit',
                      style: TextStyle(
                        color: isDelivered ? Colors.green : Colors.orange,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              trailing: const Icon(Icons.chevron_right),
              isThreeLine: true,
              onTap: () {
                context.push('/shipment-details/100${index}');
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Add new shipment
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
