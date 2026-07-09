import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
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
                Text(
                  'Personalized wellness recommendations for you',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
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
                ] else ...recommendations.map((item) => _RecommendationItem(item: item)),
                const SizedBox(height: 24),
                GradientButton(
                  label: 'Book a Doctor for More Support',
                  onPressed: () {
                    context.push('/doctors');
                  },
                ),
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

class _RecommendationItem extends StatelessWidget {
  final String item;

  const _RecommendationItem({required this.item});

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      padding: EdgeInsets.all(16),
      marginBottom: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.check_circle,
            size: 20,
            color: AppColors.lightSuccess,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              item,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
