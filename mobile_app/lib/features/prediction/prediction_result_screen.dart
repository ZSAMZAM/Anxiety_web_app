import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/assessment_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/cards.dart';

class PredictionResultScreen extends StatefulWidget {
  const PredictionResultScreen({Key? key}) : super(key: key);

  @override
  State<PredictionResultScreen> createState() => _PredictionResultScreenState();
}

class _PredictionResultScreenState extends State<PredictionResultScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<AssessmentProvider>();
      if (provider.predictionResult != null && provider.recommendations.isEmpty) {
        provider.loadRecommendations();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(AppStrings.predictionResult)),
      body: Consumer<AssessmentProvider>(
        builder: (context, provider, _) {
          final prediction = provider.predictionResult;
          if (prediction == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final status = prediction.status;
          final normalized = status.toLowerCase();
          final isCritical = normalized.contains('anxiety') || normalized.contains('depression');
          final isDepression = normalized.contains('depression');
          final confidence = _confidence(prediction.details['confidence']);
          final risk = isDepression ? 'High attention' : isCritical ? 'Moderate risk' : 'Stable';
          final color = isDepression ? AppColors.lightDanger : isCritical ? AppColors.lightWarning : AppColors.lightSuccess;
          final gradient = isDepression ? AppColors.dangerGradient : isCritical ? AppColors.warningGradient : AppColors.successGradient;

          return RefreshIndicator(
            onRefresh: provider.loadRecommendations,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(22, 10, 22, 30),
              children: [
                GradientCard(
                  colors: gradient,
                  borderRadius: 34,
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(20)),
                            child: Icon(isCritical ? Icons.health_and_safety_rounded : Icons.spa_rounded, color: Colors.white),
                          ),
                          const Spacer(),
                          _ConfidenceRing(value: confidence / 100),
                        ],
                      ),
                      const SizedBox(height: 22),
                      Text(status.toUpperCase(), style: Theme.of(context).textTheme.displaySmall?.copyWith(color: Colors.white)),
                      const SizedBox(height: 8),
                      Text('$risk • $confidence% confidence', style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white.withOpacity(0.9))),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                CustomCard(
                  borderRadius: 30,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _IconTile(icon: Icons.analytics_rounded, color: color),
                          const SizedBox(width: 12),
                          Expanded(child: Text('Clinical insight', style: Theme.of(context).textTheme.titleLarge)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        isCritical
                            ? 'Your response suggests symptoms that may benefit from professional support and continued monitoring.'
                            : 'Your response appears stable today. Continue healthy routines and check in again when your mood changes.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 16),
                      _MetricBar(label: 'Confidence', value: confidence / 100, color: color),
                      const SizedBox(height: 12),
                      _MetricBar(label: 'Care priority', value: isCritical ? 0.74 : 0.34, color: color),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                CustomCard(
                  borderRadius: 30,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(AppStrings.recommendations, style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      if (provider.isLoading)
                        const Padding(
                          padding: EdgeInsets.all(18),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (provider.recommendations.isEmpty)
                        Text(provider.error ?? prediction.recommendation, style: Theme.of(context).textTheme.bodyMedium)
                      else
                        ...provider.recommendations.take(5).map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(Icons.check_circle_rounded, color: Theme.of(context).colorScheme.primary, size: 20),
                                    const SizedBox(width: 10),
                                    Expanded(child: Text(item, style: Theme.of(context).textTheme.bodyMedium)),
                                  ],
                                ),
                              ),
                            ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                if (isCritical)
                  GradientButton(label: 'Find a therapist', onPressed: () => context.push('/doctors'))
                else
                  GradientButton(label: 'Back to dashboard', onPressed: () => context.go('/dashboard')),
                const SizedBox(height: 12),
                SecondaryButton(label: 'View history', onPressed: () => context.push('/prediction_history')),
              ],
            ),
          );
        },
      ),
    );
  }

  int _confidence(dynamic value) {
    if (value is num) {
      final raw = value.toDouble();
      return raw <= 1 ? (raw * 100).round() : raw.round();
    }
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}

class _ConfidenceRing extends StatelessWidget {
  final double value;

  const _ConfidenceRing({required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 68,
      height: 68,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: value.clamp(0, 1),
            strokeWidth: 7,
            backgroundColor: Colors.white.withOpacity(0.18),
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
          ),
          Text('${(value * 100).round()}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13)),
        ],
      ),
    );
  }
}

class _MetricBar extends StatelessWidget {
  final String label;
  final double value;
  final Color color;

  const _MetricBar({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            const Spacer(),
            Text('${(value * 100).round()}%', style: Theme.of(context).textTheme.labelMedium),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: value.clamp(0, 1),
            minHeight: 9,
            backgroundColor: color.withOpacity(0.12),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}

class _IconTile extends StatelessWidget {
  final IconData icon;
  final Color color;

  const _IconTile({required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(16)),
      child: Icon(icon, color: color),
    );
  }
}
