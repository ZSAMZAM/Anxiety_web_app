import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/cards.dart';
import '../../core/widgets/dialogs.dart';
import '../../core/widgets/safe_image.dart';
import '../../core/widgets/text_fields.dart';
import '../../core/providers/auth_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key})
      : super(key: key);

  @override
  State<ProfileScreen> createState() =>
      _ProfileScreenState();
}

class _ProfileScreenState
    extends State<ProfileScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.profile),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: context.read<AuthProvider>().fetchProfile,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(
            24,
          ),
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.center,
            children: [
            const SizedBox(
              height: 16,
            ),
            Consumer<AuthProvider>(
              builder: (context,
                  authProvider, _) {
                final user =
                    authProvider.user;

                return Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: AppColors.primaryGradient),
                        borderRadius: BorderRadius.circular(34),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.lightPrimary.withOpacity(0.22),
                            blurRadius: 30,
                            offset: const Offset(0, 18),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          _ProfileAvatar(url: user?.avatar, name: user?.fullName ?? user?.username ?? 'User'),
                          const SizedBox(height: 14),
                          Text(user?.fullName ?? 'Patient', style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                          const SizedBox(height: 4),
                          Text(user?.phone ?? 'Phone not available', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.85))),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    CustomCard(
                      borderRadius: 30,
                      padding: const EdgeInsets.all(20),
                      child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment
                            .start,
                    children: [
                      _ProfileField(
                        label: 'Full Name',
                        value: user
                                ?.fullName ??
                            'N/A',
                      ),
                      Divider(
                        height: 16,
                      ),
                      _ProfileField(
                        label: 'Username',
                        value: user
                                ?.username ??
                            'N/A',
                      ),
                      Divider(
                        height: 16,
                      ),
                      _ProfileField(
                        label: 'Phone',
                        value: user
                                ?.phone ??
                            'N/A',
                      ),
                      Divider(
                        height: 16,
                      ),
                      _ProfileField(
                        label: 'Gender',
                        value: user
                                ?.gender ??
                            'N/A',
                      ),
                      Divider(
                        height: 16,
                      ),
                      _ProfileField(
                        label: 'Age',
                        value: (user
                                    ?.age ??
                                0)
                            .toString(),
                      ),
                      Divider(
                        height: 16,
                      ),
                      _ProfileField(
                        label: 'Date Of Birth',
                        value: user?.dateOfBirth ?? 'N/A',
                      ),
                      Divider(
                        height: 16,
                      ),
                      _ProfileField(
                        label: 'Role',
                        value: 'Role: ${user?.role ?? 'User'}',
                      ),
                    ],
                  ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(
              height: 24,
            ),
            // Action Buttons
            _ActionButton(
              icon: Icons.edit,
              label: AppStrings
                  .editProfile,
              onPressed: () {
                _showEditProfileDialog(context);
              },
            ),
            const SizedBox(
              height: 12,
            ),
            _ActionButton(
              icon:
                  Icons.calendar_today,
              label: AppStrings
                  .appointmentHistory,
              onPressed: () {
                context.push('/appointment_history');
              },
            ),
            const SizedBox(
              height: 12,
            ),
            _ActionButton(
              icon: Icons.receipt_long,
              label: 'Refunds',
              onPressed: () {
                context.push('/refunds');
              },
            ),
            const SizedBox(
              height: 12,
            ),
            _ActionButton(
              icon: Icons.history,
              label: AppStrings
                  .predictionHistory,
              onPressed: () {
                context.push('/prediction_history');
              },
            ),
            const SizedBox(
              height: 12,
            ),
            _ActionButton(
              icon: Icons.lock,
              label: AppStrings
                  .changePassword,
              onPressed: () {
                _showChangePasswordDialog(context);
              },
            ),
            const SizedBox(
              height: 12,
            ),
            _ActionButton(
              icon: Icons.settings,
              label: 'Settings',
              onPressed: () {
                context.push('/settings');
              },
            ),
            const SizedBox(
              height: 24,
            ),
            GradientButton(
              label: AppStrings.logout,
              colors: AppColors
                  .dangerGradient,
              onPressed: () {
                _showLogoutDialog(
                  context,
                );
              },
            ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(
      BuildContext context) {
    showDialog(
      context: context,
      builder: (context) =>
          AlertDialog(
            title: Text(
              AppStrings.logout,
            ),
            content: Text(
              AppStrings
                  .logoutConfirm,
            ),
            actions: [
              TextButton(
                onPressed: () =>
                    Navigator.pop(
                      context,
                    ),
                child: Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  context.read<AuthProvider>().logout();
                  context.go('/login');
                },
                child: Text('Logout'),
              ),
            ],
          ),
        );
  }

  void _showEditProfileDialog(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final nameController = TextEditingController(text: user?.fullName ?? '');
    final phoneController = TextEditingController(text: user?.phone ?? '');
    final genderController = TextEditingController(text: user?.gender ?? '');
    final ageController = TextEditingController(text: (user?.age ?? 0).toString());
    final avatarController = TextEditingController(text: user?.avatar ?? '');

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(AppStrings.editProfile),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CustomTextField(label: AppStrings.fullName, controller: nameController),
              const SizedBox(height: 12),
              CustomTextField(
                label: 'Profile photo URL',
                controller: avatarController,
                keyboardType: TextInputType.url,
              ),
              const SizedBox(height: 12),
              CustomTextField(
                label: AppStrings.phone,
                controller: phoneController,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              CustomTextField(label: AppStrings.gender, controller: genderController),
              const SizedBox(height: 12),
              CustomTextField(
                label: AppStrings.age,
                controller: ageController,
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final age = int.tryParse(ageController.text.trim());
              final phone = phoneController.text.trim();
              final phonePattern = RegExp(r'^\+252(61|62|63|65|66|67|68|69|77|90)\d{7}$');
              if (nameController.text.trim().isEmpty || age == null || age < 13 || age > 120) {
                showErrorSnackbar(context, 'Enter a valid name and age.');
                return;
              }
              if (phone.isNotEmpty && !phonePattern.hasMatch(phone)) {
                showErrorSnackbar(context, 'Enter a valid Somali phone number.');
                return;
              }
              final success = await context.read<AuthProvider>().updateProfile({
                'fullname': nameController.text.trim(),
                'phone': phone,
                'gender': genderController.text.trim(),
                'age': age,
                'avatar': avatarController.text.trim(),
              });
              if (!context.mounted) return;
              Navigator.pop(dialogContext);
              if (success) {
                showSuccessSnackbar(context, AppStrings.profileUpdated);
              } else {
                showErrorSnackbar(
                  context,
                  context.read<AuthProvider>().error ?? 'Unable to update profile.',
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final currentController = TextEditingController();
    final passwordController = TextEditingController();
    final confirmController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(AppStrings.changePassword),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CustomTextField(
                label: 'Current Password',
                controller: currentController,
                obscureText: true,
              ),
              const SizedBox(height: 12),
              CustomTextField(
                label: AppStrings.password,
                controller: passwordController,
                obscureText: true,
              ),
              const SizedBox(height: 12),
              CustomTextField(
                label: AppStrings.confirmPassword,
                controller: confirmController,
                obscureText: true,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final password = passwordController.text;
              if (currentController.text.trim().isEmpty) {
                showErrorSnackbar(context, 'Current password is required.');
                return;
              }
              if (!_isStrongPassword(password)) {
                showErrorSnackbar(context, AppStrings.passwordRequirements);
                return;
              }
              if (password != confirmController.text) {
                showErrorSnackbar(context, AppStrings.passwordMismatch);
                return;
              }
              final success = await context.read<AuthProvider>().updateProfile({
                'fullname': context.read<AuthProvider>().user?.fullName ?? '',
                'current_password': currentController.text,
                'password': password,
              });
              if (!context.mounted) return;
              Navigator.pop(dialogContext);
              if (success) {
                showSuccessSnackbar(context, AppStrings.passwordChanged);
              } else {
                showErrorSnackbar(
                  context,
                  context.read<AuthProvider>().error ?? 'Unable to change password.',
                );
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  bool _isStrongPassword(String value) {
    return value.length >= 8 &&
        RegExp(r'[A-Z]').hasMatch(value) &&
        RegExp(r'[a-z]').hasMatch(value) &&
        RegExp(r'[0-9]').hasMatch(value) &&
        RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value);
  }
}

class _ProfileField
    extends StatelessWidget {
  final String label;
  final String value;

  const _ProfileField({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context)
              .textTheme
              .bodyMedium,
        ),
        const SizedBox(
          height: 4,
        ),
        Text(
          value,
          style: Theme.of(context)
              .textTheme
              .bodyLarge,
        ),
      ],
    );
  }
}

class _ProfileAvatar extends StatelessWidget {
  final String? url;
  final String name;

  const _ProfileAvatar({
    required this.url,
    required this.name,
  });

  @override
  Widget build(BuildContext context) {
    final initials = name.trim().isEmpty
        ? 'U'
        : name.trim().split(RegExp(r'\s+')).take(2).map((part) => part[0]).join().toUpperCase();
    return Container(
      width: 108,
      height: 108,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.18),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withOpacity(0.45), width: 4),
      ),
      clipBehavior: Clip.antiAlias,
      child: SafeImage(
        url: url,
        fit: BoxFit.cover,
        fallback: Center(
          child: Text(
            initials,
            style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w900),
          ),
        ),
      ),
    );
  }
}

class _ActionButton
    extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: CustomCard(
        padding: EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment:
              MainAxisAlignment
                  .spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration:
                      BoxDecoration(
                    color: AppColors
                        .lightPrimary
                        .withOpacity(
                          0.1,
                        ),
                    borderRadius:
                        BorderRadius
                            .circular(12),
                  ),
                  child: Icon(
                    icon,
                    color: AppColors
                        .lightPrimary,
                  ),
                ),
                const SizedBox(
                  width: 12,
                ),
                Text(
                  label,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge,
                ),
              ],
            ),
            Icon(
              Icons
                  .arrow_forward_ios,
              size: 16,
              color: AppColors
                  .lightGrey,
            ),
          ],
        ),
      ),
    );
  }
}
