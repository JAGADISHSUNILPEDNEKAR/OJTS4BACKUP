import 'package:flutter/material.dart';

class OtpInput extends StatelessWidget {
  final int length;

  const OtpInput({super.key, this.length = 6});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(length, (index) {
        // Mocking an active state for the 3rd box just like Figma
        bool isActive = index == 2;
        bool hasValue = index < 2;

        return Container(
          width: 48,
          height: 56,
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isActive 
                 ? Theme.of(context).colorScheme.primary 
                 : Colors.white.withOpacity(0.05),
              width: isActive ? 2 : 1,
            ),
          ),
          child: Center(
            child: Text(
              hasValue ? '5' : (isActive ? '|' : '-'), 
              style: TextStyle(
                fontSize: 24, 
                color: hasValue ? Colors.white : Colors.white24,
                fontWeight: hasValue ? FontWeight.bold : FontWeight.normal
              ),
            ),
          ),
        );
      }),
    );
  }
}
