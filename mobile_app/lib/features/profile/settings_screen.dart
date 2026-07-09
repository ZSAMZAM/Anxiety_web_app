import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/theme_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/cards.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          _SettingsHero(username: user?.username ?? 'Patient', phone: user?.phone ?? 'Phone not available'),
          const SizedBox(height: 18),
          _SettingsSection(
            title: 'Appearance',
            subtitle: 'Choose how AnxietyCare looks on this device.',
            child: Consumer<ThemeProvider>(
              builder: (context, themeProvider, _) {
                return Column(
                  children: [
                    _ThemeChoice(
                      icon: Icons.light_mode_rounded,
                      title: 'Light Mode',
                      subtitle: 'Bright, clean healthcare interface',
                      selected: themeProvider.themeMode == ThemeMode.light,
                      onTap: () => themeProvider.setThemeMode(ThemeMode.light),
                    ),
                    _ThemeChoice(
                      icon: Icons.dark_mode_rounded,
                      title: 'Dark Mode',
                      subtitle: 'Comfortable night reading',
                      selected: themeProvider.themeMode == ThemeMode.dark,
                      onTap: () => themeProvider.setThemeMode(ThemeMode.dark),
                    ),
                    _ThemeChoice(
                      icon: Icons.brightness_auto_rounded,
                      title: 'System Default',
                      subtitle: 'Follow your phone settings',
                      selected: themeProvider.themeMode == ThemeMode.system,
                      onTap: () => themeProvider.setThemeMode(ThemeMode.system),
                    ),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          _SettingsSection(
            title: 'Account',
            child: Column(
              children: [
                _SettingsRow(
                  icon: Icons.person_rounded,
                  title: 'Profile',
                  subtitle: 'Personal information and photo',
                  onTap: () => context.push('/profile'),
                ),
                _SettingsRow(
                  icon: Icons.notifications_rounded,
                  title: 'Notifications',
                  subtitle: 'Appointment, payment, and care updates',
                  onTap: () => context.push('/notifications'),
                ),
                _SettingsRow(
                  icon: Icons.history_rounded,
                  title: 'Health history',
                  subtitle: 'Appointments and prediction records',
                  onTap: () => context.push('/appointment_history'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SettingsSection(
            title: 'Privacy & Security',
            child: Column(
              children: [
                _SettingsRow(
                  icon: Icons.lock_rounded,
                  title: 'Password',
                  subtitle: 'Change password from your profile',
                  onTap: () => context.push('/profile'),
                ),
                _SettingsRow(
                  icon: Icons.privacy_tip_rounded,
                  title: 'Privacy',
                  subtitle: 'Your health data stays protected',
                  onTap: () {},
                ),
                _SettingsRow(
                  icon: Icons.help_rounded,
                  title: 'Help & Support',
                  subtitle: 'Get help using AnxietyCare',
                  onTap: () {},
                ),
                _SettingsRow(
                  icon: Icons.info_rounded,
                  title: 'About Application',
                  subtitle: 'AnxietyCare mobile v1.0.0',
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          CustomCard(
            padding: const EdgeInsets.all(4),
            child: ListTile(
              minVerticalPadding: 18,
              leading: _SettingsIcon(icon: Icons.logout_rounded, color: AppColors.lightDanger),
              title: Text('Logout', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.lightDanger)),
              subtitle: Text('Clear secure session and return to login', style: Theme.of(context).textTheme.bodyMedium),
              onTap: () async {
                await context.read<AuthProvider>().logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsHero extends StatelessWidget {
  final String username;
  final String phone;

  const _SettingsHero({required this.username, required this.phone});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: AppColors.primaryGradient),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: AppColors.lightPrimary.withOpacity(0.24),
            blurRadius: 30,
            spreadRadius: -10,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.tune_rounded, color: Colors.white),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(username, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
                const SizedBox(height: 4),
                Text(phone, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.82))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget child;

  const _SettingsSection({
    required this.title,
    this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      padding: const EdgeInsets.all(18),
      borderRadius: 28,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
          ],
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _ThemeChoice extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _ThemeChoice({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: selected ? primary.withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: selected ? primary : Theme.of(context).colorScheme.outline),
      ),
      child: ListTile(
        onTap: onTap,
        leading: _SettingsIcon(icon: icon, color: primary),
        title: Text(title, style: Theme.of(context).textTheme.titleMedium),
        subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
        trailing: Icon(selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded, color: selected ? primary : Theme.of(context).colorScheme.onSurfaceVariant),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _SettingsRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: _SettingsIcon(icon: icon, color: Theme.of(context).colorScheme.primary),
      title: Text(title, style: Theme.of(context).textTheme.titleMedium),
      subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: onTap,
    );
  }
}

class _SettingsIcon extends StatelessWidget {
  final IconData icon;
  final Color color;

  const _SettingsIcon({required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(icon, color: color),
    );
  }
}
