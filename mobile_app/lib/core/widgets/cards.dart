import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'safe_image.dart';

class CustomCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final double borderRadius;
  final Color? backgroundColor;
  final VoidCallback? onTap;
  final BoxBorder? border;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? marginBottom;

  const CustomCard({
    Key? key,
    required this.child,
    this.padding = const EdgeInsets.all(11),
    this.borderRadius = 18,
    this.backgroundColor,
    this.onTap,
    this.border,
    this.margin,
    this.marginBottom,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveMargin = marginBottom == null
        ? margin
        : (margin ?? EdgeInsets.zero).add(marginBottom!);
    final cardColor = backgroundColor ??
        (isDark
            ? AppColors.darkSecondaryCard.withOpacity(0.86)
            : AppColors.lightCard.withOpacity(0.94));

    return Container(
      margin: effectiveMargin,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(borderRadius),
            border: border ?? Border.all(color: isDark ? AppColors.darkBorder.withOpacity(0.78) : AppColors.lightBorder),
            gradient: backgroundColor == null
                ? LinearGradient(
                    colors: isDark
                        ? [AppColors.darkSecondaryCard.withOpacity(0.92), AppColors.darkCard.withOpacity(0.82)]
                        : [Colors.white.withOpacity(0.98), AppColors.lightSoftBlue.withOpacity(0.42)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            boxShadow: [
              BoxShadow(
                color: isDark ? Colors.black.withOpacity(0.28) : const Color(0xFF0F8EA8).withOpacity(0.10),
                blurRadius: 22,
                spreadRadius: -12,
                offset: const Offset(0, 10),
              ),
              if (!isDark)
                BoxShadow(
                  color: Colors.white.withOpacity(0.85),
                  blurRadius: 0,
                  spreadRadius: 0,
                  offset: const Offset(0, -1),
                ),
            ],
          ),
          child: Padding(
            padding: padding,
            child: child,
          ),
        ),
      ),
    );
  }
}

class GradientCard extends StatelessWidget {
  final Widget child;
  final List<Color> colors;
  final EdgeInsets padding;
  final double borderRadius;
  final VoidCallback? onTap;

  const GradientCard({
    Key? key,
    required this.child,
    required this.colors,
    this.padding = const EdgeInsets.all(12),
    this.borderRadius = 18,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: colors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(borderRadius),
          boxShadow: [
            BoxShadow(
              color: colors.last.withOpacity(0.28),
              blurRadius: 22,
              spreadRadius: -10,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Padding(
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

class DoctorCard extends StatelessWidget {
  final String name;
  final String specialization;
  final String hospital;
  final String city;
  final String district;
  final double rating;
  final double fee;
  final String? imageUrl;
  final VoidCallback? onTap;

  const DoctorCard({
    Key? key,
    required this.name,
    required this.specialization,
    required this.hospital,
    this.city = '',
    this.district = '',
    required this.rating,
    required this.fee,
    this.imageUrl,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return CustomCard(
      onTap: onTap,
      padding: const EdgeInsets.all(11),
      borderRadius: 18,
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSecondaryCard : AppColors.lightSoftBlue,
              ),
              child: SafeImage(
                url: imageUrl,
                fit: BoxFit.cover,
                fallback: Icon(
                  Icons.person,
                  color: isDark ? AppColors.darkText : AppColors.lightText,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleLarge,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  specialization,
                  style: Theme.of(context).textTheme.bodyMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  [
                    if (hospital.isNotEmpty) hospital,
                    if (city.isNotEmpty) city,
                    if (district.isNotEmpty) district,
                  ].join(' - '),
                  style: Theme.of(context).textTheme.labelSmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    _MiniPill(icon: Icons.star_rounded, label: rating.toStringAsFixed(1), color: AppColors.lightWarning),
                    _MiniPill(icon: Icons.work_history_rounded, label: hospital.isEmpty ? 'Clinic' : hospital, color: AppColors.lightPrimary),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Available today', style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AppColors.lightSuccess)),
                    Text(
                      '\$${fee.toStringAsFixed(2)}',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: AppColors.lightPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
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

class _MiniPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _MiniPill({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.11),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 96),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color),
            ),
          ),
        ],
      ),
    );
  }
}
