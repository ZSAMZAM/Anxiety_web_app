import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/cards.dart';
import '../../models/treatment_plan_model.dart';
import '../../providers/treatment_plan_provider.dart';

class TreatmentPlanScreen extends StatefulWidget {
  final String? reportId;

  const TreatmentPlanScreen({super.key, this.reportId});

  @override
  State<TreatmentPlanScreen> createState() => _TreatmentPlanScreenState();
}

class _TreatmentPlanScreenState extends State<TreatmentPlanScreen> {
  TreatmentPlanModel? _selected;
  bool _loadingDetails = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final provider = context.read<TreatmentPlanProvider>();
    if (widget.reportId != null && widget.reportId!.isNotEmpty) {
      setState(() => _loadingDetails = true);
      _selected = await provider.loadPlanById(widget.reportId!);
      setState(() => _loadingDetails = false);
      await provider.loadPlans(silent: true);
      return;
    }
    await provider.loadLatest();
    await provider.loadPlans(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Treatment Plan'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Consumer<TreatmentPlanProvider>(
        builder: (context, provider, _) {
          final plan = _selected ?? provider.latestPlan;
          if (provider.isLoading || _loadingDetails) {
            return const Center(child: CircularProgressIndicator());
          }
          if (provider.error != null && plan == null) {
            return _CenteredMessage(
              icon: Icons.cloud_off_rounded,
              title: 'Unable to load treatment plan',
              message: provider.error!,
              actionLabel: 'Retry',
              onAction: _load,
            );
          }
          if (plan == null) {
            return _CenteredMessage(
              icon: Icons.assignment_late_outlined,
              title: 'No treatment plan is available yet.',
              message: 'Please wait until your doctor completes your consultation.',
              actionLabel: 'Refresh',
              onAction: _load,
            );
          }
          return RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 30),
              children: [
                _PlanHeader(plan: plan),
                const SizedBox(height: 16),
                _SectionCard(
                  title: 'Diagnosis',
                  icon: Icons.medical_information_rounded,
                  accent: AppColors.lightDanger,
                  child: _Paragraph(plan.diagnosis),
                ),
                _SectionCard(
                  title: 'Treatment Plan',
                  icon: Icons.assignment_turned_in_rounded,
                  accent: AppColors.lightPrimary,
                  child: _Paragraph(plan.treatmentPlan),
                ),
                _SectionCard(
                  title: 'Recommendations',
                  icon: Icons.checklist_rounded,
                  accent: AppColors.lightSuccess,
                  child: _BulletList(items: plan.recommendations, emptyText: plan.followUpRecommendation),
                ),
                _SectionCard(
                  title: 'Lifestyle Advice',
                  icon: Icons.spa_rounded,
                  accent: AppColors.lightAccent,
                  child: _BulletList(items: plan.lifestyleAdvice, emptyText: 'No lifestyle advice recorded.'),
                ),
                _SectionCard(
                  title: 'Medication',
                  icon: Icons.medication_rounded,
                  accent: AppColors.lightWarning,
                  child: _BulletList(items: plan.medications, emptyText: 'No medicines prescribed.'),
                ),
                _SectionCard(
                  title: 'Follow-up',
                  icon: Icons.event_available_rounded,
                  accent: AppColors.lightInfo,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _InfoLine(label: 'Date', value: _fallback(plan.followUpDate, 'Not scheduled')),
                      const SizedBox(height: 8),
                      _InfoLine(label: 'Guidance', value: _fallback(plan.followUpRecommendation, 'No follow-up guidance recorded.')),
                    ],
                  ),
                ),
                _SectionCard(
                  title: 'Doctor Notes',
                  icon: Icons.note_alt_rounded,
                  accent: AppColors.lightSecondary,
                  child: _Paragraph(plan.doctorNotes),
                ),
                _ExportCard(plan: plan),
                if (provider.plans.length > 1) ...[
                  const SizedBox(height: 8),
                  Text('History', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 10),
                  ...provider.plans.map(
                    (item) => _HistoryTile(
                      plan: item,
                      selected: item.id == plan.id,
                      onTap: () => setState(() => _selected = item),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _PlanHeader extends StatelessWidget {
  final TreatmentPlanModel plan;

  const _PlanHeader({required this.plan});

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      borderRadius: 28,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: AppColors.lightPrimary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(Icons.health_and_safety_rounded, color: AppColors.lightPrimary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(plan.doctorName, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 4),
                    Text(_fallback(plan.doctorSpecialization, 'Specialization not recorded')),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _Chip(label: 'Appointment', value: _dateTime(plan.appointmentDate, plan.appointmentTime)),
              _Chip(label: 'Prediction', value: plan.assessmentPrediction),
              _Chip(label: 'Risk', value: plan.riskLevel),
              _Chip(label: 'Created', value: _shortDate(plan.createdAt)),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color accent;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.accent,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      borderRadius: 24,
      marginBottom: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: accent, size: 22),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _ExportCard extends StatelessWidget {
  final TreatmentPlanModel plan;

  const _ExportCard({required this.plan});

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      borderRadius: 24,
      marginBottom: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          const Icon(Icons.picture_as_pdf_rounded, color: AppColors.lightDanger),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              plan.hasExport ? 'PDF export is available for this treatment plan.' : 'PDF export is not available for this report yet.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          TextButton(
            onPressed: plan.hasExport ? () => _exportPdf(context, plan) : null,
            child: const Text('Export'),
          ),
        ],
      ),
    );
  }

  Future<void> _exportPdf(BuildContext context, TreatmentPlanModel plan) async {
    try {
      final bytes = await context.read<ApiService>().downloadTreatmentPlanPdf(plan.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Treatment plan PDF ready (${bytes.length} bytes).')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to export treatment plan PDF.')),
      );
    }
  }
}

class _HistoryTile extends StatelessWidget {
  final TreatmentPlanModel plan;
  final bool selected;
  final VoidCallback onTap;

  const _HistoryTile({required this.plan, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      onTap: onTap,
      marginBottom: const EdgeInsets.only(bottom: 10),
      borderRadius: 22,
      backgroundColor: selected ? AppColors.lightSoftMint : null,
      child: Row(
        children: [
          Icon(selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded, color: selected ? AppColors.lightSuccess : AppColors.lightGrey),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(plan.diagnosis, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 3),
                Text('${plan.doctorName} • ${_shortDate(plan.createdAt)}', maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CenteredMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  const _CenteredMessage({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 72, color: AppColors.lightGrey),
            const SizedBox(height: 16),
            Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 18),
            FilledButton(onPressed: onAction, child: Text(actionLabel)),
          ],
        ),
      ),
    );
  }
}

class _Paragraph extends StatelessWidget {
  final String value;

  const _Paragraph(this.value);

  @override
  Widget build(BuildContext context) {
    return Text(_fallback(value, 'Not recorded.'), style: Theme.of(context).textTheme.bodyLarge);
  }
}

class _BulletList extends StatelessWidget {
  final List<String> items;
  final String emptyText;

  const _BulletList({required this.items, required this.emptyText});

  @override
  Widget build(BuildContext context) {
    final visible = items.where((item) => item.trim().isNotEmpty).toList();
    if (visible.isEmpty) {
      return Text(emptyText, style: Theme.of(context).textTheme.bodyLarge);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: visible
          .map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 6),
                    child: Icon(Icons.circle, size: 7, color: AppColors.lightPrimary),
                  ),
                  const SizedBox(width: 9),
                  Expanded(child: Text(item, style: Theme.of(context).textTheme.bodyLarge)),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _InfoLine extends StatelessWidget {
  final String label;
  final String value;

  const _InfoLine({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 86, child: Text(label, style: Theme.of(context).textTheme.labelMedium)),
        Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyLarge)),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final String value;

  const _Chip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 128),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.lightSoftBlue,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.lightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 3),
          Text(_fallback(value, 'N/A'), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

String _fallback(String? value, String fallback) {
  final text = value?.trim() ?? '';
  return text.isEmpty ? fallback : text;
}

String _dateTime(String date, String time) {
  final d = _fallback(date, 'Date not recorded');
  final t = time.trim();
  return t.isEmpty ? d : '$d at $t';
}

String _shortDate(String value) {
  if (value.trim().isEmpty) return 'Not recorded';
  return value.split('T').first.split(' ').first;
}
