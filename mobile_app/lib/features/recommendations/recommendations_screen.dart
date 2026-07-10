import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/cards.dart';
import '../../core/widgets/buttons.dart';
import '../../core/providers/assessment_provider.dart';

class RecommendationsScreen extends StatefulWidget {
  const RecommendationsScreen({Key? key}) : super(key: key);

  @override
  State<RecommendationsScreen> createState() => _RecommendationsScreenState();
}

class _RecommendationsScreenState extends State<RecommendationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AssessmentProvider>().loadRecommendations();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.recommendations),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Consumer<AssessmentProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return Center(child: CircularProgressIndicator());
          }

          final recommendations = provider.recommendations;

          return RefreshIndicator(
            onRefresh: provider.loadRecommendations,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),
                  _RecommendationsIntro(count: recommendations.length),
                  const SizedBox(height: 20),
                  if (recommendations.isEmpty) ...[
                    Text(
                      provider.error ?? 'No recommendations available at the moment.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 16),
                    GradientButton(
                      label: 'Retry recommendations',
                      onPressed: provider.loadRecommendations,
                    ),
                  ] else ...[
                    ...recommendations.asMap().entries.map(
                          (entry) => _RecommendationItem(
                            index: entry.key + 1,
                            item: entry.value,
                          ),
                        ),
                    const SizedBox(height: 8),
                    const _WellnessNote(),
                  ],
                  const SizedBox(height: 16),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _RecommendationsIntro extends StatelessWidget {
  final int count;

  const _RecommendationsIntro({required this.count});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return CustomCard(
      padding: const EdgeInsets.all(18),
      marginBottom: EdgeInsets.zero,
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: AppColors.primaryGradient),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.spa_rounded, color: Colors.white),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Your wellness plan',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  count > 0
                      ? '$count personalized steps you can practice today.'
                      : 'Complete an assessment to receive personalized guidance.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.lightMutedText,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RecommendationItem extends StatelessWidget {
  final int index;
  final String item;

  const _RecommendationItem({required this.index, required this.item});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return CustomCard(
      padding: const EdgeInsets.all(16),
      marginBottom: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.lightSuccess.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$index',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: AppColors.lightSuccess,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              item,
              style: theme.textTheme.bodyLarge?.copyWith(height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}

class _WellnessNote extends StatelessWidget {
  const _WellnessNote();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.lightPrimary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.lightPrimary.withOpacity(0.14)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_rounded, color: AppColors.lightPrimary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'These recommendations support daily wellbeing. If symptoms feel urgent or overwhelming, contact a qualified professional.',
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
