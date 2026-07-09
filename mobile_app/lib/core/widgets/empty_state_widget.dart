import 'package:flutter/material.dart';
import '../widgets/app_button.dart';

class EmptyStateWidget extends StatelessWidget {
  final String title;
  final String message;
  final String buttonText;
  final VoidCallback? onAction;

  const EmptyStateWidget({
    Key? key,
    required this.title,
    required this.message,
    this.buttonText = 'Refresh',
    this.onAction,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            if (onAction != null) ...[
              const SizedBox(height: 20),
              AppButton(
                label: buttonText,
                onPressed: onAction!,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
