import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_strings.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/providers/assessment_provider.dart';
import '../../core/providers/dashboard_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/cards.dart';
import '../../core/widgets/dialogs.dart';
import '../../providers/prediction_provider.dart';

class AssessmentScreen extends StatefulWidget {
  const AssessmentScreen({Key? key}) : super(key: key);

  @override
  State<AssessmentScreen> createState() => _AssessmentScreenState();
}

class _AssessmentScreenState extends State<AssessmentScreen> {
  final _textController = TextEditingController();
  int _step = 0;
  String _mood = 'Calm';

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _handleAnalyze() async {
    final provider = context.read<AssessmentProvider>();
    if (provider.isLoading) return;

    final text = _textController.text.trim();
    if (text.length < 20) {
      showErrorSnackbar(context, context.tr('minimumAssessmentText'));
      return;
    }

    final prompt = 'Current mood: $_mood. $text';
    final success = await provider.submitAssessment(prompt);
    if (!mounted) return;
    if (success) {
      await context.read<PredictionProvider>().loadHistory();
      if (mounted) {
        await context.read<DashboardProvider>().loadDashboard(silent: true);
      }
      if (!mounted) return;
      context.push('/prediction_result');
    } else {
      showErrorSnackbar(context, provider.error ?? AppStrings.errorOccurred);
      if (provider.requiresLogin) {
        context.go('/login');
      }
    }
  }

  void _next() {
    if (_step == 0) {
      setState(() => _step = 1);
      return;
    }
    _handleAnalyze();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _step == 0 ? 0.45 : (_textController.text.trim().length / 120).clamp(0.55, 1.0);
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('assessment'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 10, 22, 30),
          children: [
            _AssessmentHero(progress: progress.toDouble()),
            const SizedBox(height: 22),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 260),
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(begin: const Offset(0.04, 0), end: Offset.zero).animate(animation),
                  child: child,
                ),
              ),
              child: _step == 0
                  ? _MoodStep(key: const ValueKey('mood'), selected: _mood, onChanged: (value) => setState(() => _mood = value))
                  : _ReflectionStep(
                      key: const ValueKey('reflection'),
                      controller: _textController,
                      onChanged: () => setState(() {}),
                    ),
            ),
            const SizedBox(height: 20),
            Consumer<AssessmentProvider>(
              builder: (context, provider, _) {
                final disabled = _step == 1 && _textController.text.trim().length < 20;
                return GradientButton(
                  label: _step == 0 ? context.tr('continue') : context.tr('analyze'),
                  onPressed: disabled ? () {} : _next,
                  isLoading: provider.isLoading,
                  colors: disabled ? [AppColors.lightGrey, AppColors.lightGrey] : AppColors.primaryGradient,
                );
              },
            ),
            if (_step == 1) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => setState(() => _step = 0),
                child: Text(context.tr('backToMood')),
              ),
            ],
            const SizedBox(height: 20),
            _ClinicalNotice(),
          ],
        ),
      ),
    );
  }
}

class _AssessmentHero extends StatelessWidget {
  final double progress;

  const _AssessmentHero({required this.progress});

  @override
  Widget build(BuildContext context) {
    return GradientCard(
      colors: const [Color(0xFF3B82F6), Color(0xFF14B8A6)],
      borderRadius: 32,
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(18)),
                child: const Icon(Icons.psychology_alt_rounded, color: Colors.white),
              ),
              const Spacer(),
              Text('${(progress * 100).round()}%', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white)),
            ],
          ),
          const SizedBox(height: 18),
          Text('A calmer way to check in', style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
          const SizedBox(height: 8),
          Text('Answer two short prompts. Your results are private and saved to your health history.', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.86))),
          const SizedBox(height: 18),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 9,
              backgroundColor: Colors.white.withOpacity(0.18),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _MoodStep extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onChanged;

  const _MoodStep({Key? key, required this.selected, required this.onChanged}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final moods = <Map<String, dynamic>>[
      {'label': 'Calm', 'icon': Icons.spa_rounded, 'color': AppColors.lightSuccess},
      {'label': 'Stressed', 'icon': Icons.bolt_rounded, 'color': AppColors.lightWarning},
      {'label': 'Anxious', 'icon': Icons.air_rounded, 'color': AppColors.lightDanger},
      {'label': 'Low', 'icon': Icons.cloud_rounded, 'color': AppColors.lightSecondary},
    ];
    return CustomCard(
      borderRadius: 30,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('How are you feeling right now?', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text('Choose the closest match. You can explain more on the next step.', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 18),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.35,
            children: moods.map((item) {
              final label = item['label'] as String;
              final icon = item['icon'] as IconData;
              final color = item['color'] as Color;
              final isSelected = selected == label;
              return InkWell(
                borderRadius: BorderRadius.circular(22),
                onTap: () => onChanged(label),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: color.withOpacity(isSelected ? 0.16 : 0.08),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: isSelected ? color : Theme.of(context).colorScheme.outline),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Icon(icon, color: color),
                      Text(label, style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _ReflectionStep extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onChanged;

  const _ReflectionStep({Key? key, required this.controller, required this.onChanged}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final count = controller.text.trim().length;
    return CustomCard(
      borderRadius: 30,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tell us what has been happening', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text('Include sleep, worry, mood, focus, body tension, or anything else you noticed.', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 18),
          TextField(
            controller: controller,
            maxLines: 8,
            maxLength: 500,
            onChanged: (_) => onChanged(),
            decoration: const InputDecoration(
              hintText: 'Example: I have been worrying at night, sleeping less, and feeling tense...',
              counterText: '',
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(value: (count / 120).clamp(0, 1), minHeight: 8),
                ),
              ),
              const SizedBox(width: 12),
              Text('$count/500', style: Theme.of(context).textTheme.labelMedium),
            ],
          ),
        ],
      ),
    );
  }
}

class _ClinicalNotice extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.lightWarning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.lightWarning.withOpacity(0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_rounded, color: AppColors.lightWarning),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'AI assessment supports reflection but is not a medical diagnosis. Please consult a professional for urgent or clinical concerns.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}
