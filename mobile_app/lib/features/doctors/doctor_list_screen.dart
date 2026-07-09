import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_strings.dart';
import '../../core/providers/doctor_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/cards.dart';

class DoctorListScreen extends StatefulWidget {
  const DoctorListScreen({Key? key}) : super(key: key);

  @override
  State<DoctorListScreen> createState() => _DoctorListScreenState();
}

class _DoctorListScreenState extends State<DoctorListScreen> {
  final _searchController = TextEditingController();
  final Set<String> _favorites = {};
  String _sortBy = 'rating';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DoctorProvider>().loadDoctors();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(AppStrings.doctors)),
      body: Consumer<DoctorProvider>(
        builder: (context, provider, _) {
          final doctors = [...provider.filteredDoctors];
          doctors.sort((a, b) {
            if (_sortBy == 'fee') return a.fee.compareTo(b.fee);
            if (_sortBy == 'experience') return b.experience.compareTo(a.experience);
            return b.rating.compareTo(a.rating);
          });

          return RefreshIndicator(
            onRefresh: provider.loadDoctors,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
              children: [
                _DirectoryHero(total: provider.doctors.length),
                const SizedBox(height: 18),
                TextField(
                  controller: _searchController,
                  onChanged: (value) {
                    provider.searchDoctors(value);
                    setState(() {});
                  },
                  decoration: InputDecoration(
                    hintText: 'Search doctors, speciality, city',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded),
                            onPressed: () {
                              _searchController.clear();
                              provider.clearSearch();
                              setState(() {});
                            },
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 12),
                _FilterBar(provider: provider, sortBy: _sortBy, onSortChanged: (value) => setState(() => _sortBy = value)),
                const SizedBox(height: 18),
                if (provider.isLoading)
                  const _DoctorSkeletonList()
                else if (provider.error != null)
                  _ErrorState(message: provider.error!, onRetry: provider.loadDoctors)
                else if (doctors.isEmpty)
                  const _EmptyDoctors()
                else
                  ...doctors.map(
                    (doctor) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _PremiumDoctorCard(
                        doctor: doctor,
                        favorite: _favorites.contains(doctor.id),
                        onFavorite: () {
                          setState(() {
                            if (_favorites.contains(doctor.id)) {
                              _favorites.remove(doctor.id);
                            } else {
                              _favorites.add(doctor.id);
                            }
                          });
                        },
                        onTap: () => context.push('/doctor_profile', extra: doctor.id),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _DirectoryHero extends StatelessWidget {
  final int total;

  const _DirectoryHero({required this.total});

  @override
  Widget build(BuildContext context) {
    return GradientCard(
      colors: const [Color(0xFF0F8EA8), Color(0xFF14B8A6)],
      padding: const EdgeInsets.all(22),
      borderRadius: 30,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Find the right specialist', style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                const SizedBox(height: 8),
                Text('$total verified doctors available for anxiety care and wellness support.', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.86))),
              ],
            ),
          ),
          Container(
            width: 62,
            height: 62,
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(22)),
            child: const Icon(Icons.medical_services_rounded, color: Colors.white),
          ),
        ],
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  final DoctorProvider provider;
  final String sortBy;
  final ValueChanged<String> onSortChanged;

  const _FilterBar({required this.provider, required this.sortBy, required this.onSortChanged});

  @override
  Widget build(BuildContext context) {
    final options = provider.specialtyOptions;
    return Column(
      children: [
        SizedBox(
          height: 42,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemBuilder: (context, index) {
              final label = index == 0 ? 'All' : options[index - 1];
              final selected = index == 0 ? provider.specialtyFilter.isEmpty : provider.specialtyFilter == label;
              return ChoiceChip(
                label: Text(label),
                selected: selected,
                onSelected: (_) => index == 0 ? provider.setSpecialtyFilter('') : provider.setSpecialtyFilter(label),
              );
            },
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemCount: options.length + 1,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Text('Sort by', style: Theme.of(context).textTheme.labelLarge),
            const Spacer(),
            Wrap(
              spacing: 6,
              children: [
                _SortChip(label: 'Rating', value: 'rating', selected: sortBy == 'rating', onTap: onSortChanged),
                _SortChip(label: 'Fee', value: 'fee', selected: sortBy == 'fee', onTap: onSortChanged),
                _SortChip(label: 'Exp', value: 'experience', selected: sortBy == 'experience', onTap: onSortChanged),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class _SortChip extends StatelessWidget {
  final String label;
  final String value;
  final bool selected;
  final ValueChanged<String> onTap;

  const _SortChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(value),
    );
  }
}

class _PremiumDoctorCard extends StatelessWidget {
  final dynamic doctor;
  final bool favorite;
  final VoidCallback onFavorite;
  final VoidCallback onTap;

  const _PremiumDoctorCard({
    required this.doctor,
    required this.favorite,
    required this.onFavorite,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      borderRadius: 28,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Container(
              width: 82,
              height: 92,
              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              child: doctor.photo != null && doctor.photo!.isNotEmpty
                  ? Image.network(doctor.photo!, fit: BoxFit.cover)
                  : Icon(Icons.person_rounded, size: 38, color: Theme.of(context).colorScheme.primary),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(doctor.name, style: Theme.of(context).textTheme.titleLarge, maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      onPressed: onFavorite,
                      icon: Icon(favorite ? Icons.favorite_rounded : Icons.favorite_border_rounded, color: favorite ? AppColors.lightDanger : Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
                Text(doctor.specialization, style: Theme.of(context).textTheme.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _Pill(icon: Icons.star_rounded, label: doctor.rating.toStringAsFixed(1), color: AppColors.lightWarning),
                    _Pill(icon: Icons.work_rounded, label: '${doctor.experience} yrs', color: AppColors.lightPrimary),
                    _Pill(icon: Icons.schedule_rounded, label: 'Available', color: AppColors.lightSuccess),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        [doctor.hospital, doctor.city].where((item) => item.toString().isNotEmpty).join(' • '),
                        style: Theme.of(context).textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text('\$${doctor.fee.toStringAsFixed(2)}', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Theme.of(context).colorScheme.primary)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _Pill({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color)),
        ],
      ),
    );
  }
}

class _DoctorSkeletonList extends StatelessWidget {
  const _DoctorSkeletonList();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        4,
        (_) => Container(
          height: 132,
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(28),
          ),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      child: Column(
        children: [
          Icon(Icons.wifi_off_rounded, size: 54, color: Theme.of(context).colorScheme.error),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _EmptyDoctors extends StatelessWidget {
  const _EmptyDoctors();

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      child: Column(
        children: [
          Icon(Icons.manage_search_rounded, size: 62, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 14),
          Text('No doctors found', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text('Try another speciality, city, or search term.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}
