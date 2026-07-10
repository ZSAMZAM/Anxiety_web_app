import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/text_fields.dart';
import '../../core/widgets/dialogs.dart';
import '../../core/providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _fullNameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  final _ageController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  String? _selectedGender;
  DateTime? _selectedDateOfBirth;
  Timer? _phoneAvailabilityDebounce;
  bool _isCheckingPhoneAvailability = false;
  bool? _isPhoneAvailable;
  String? _phoneAvailabilityMessage;
  String? _lastCheckedPhone;
  final genders = [
    AppStrings.male,
    AppStrings.female,
  ];

  int _calculateAge(DateTime dob) {
    final today = DateTime.now();
    var age = today.year - dob.year;
    final birthdayPassed = today.month > dob.month ||
        (today.month == dob.month && today.day >= dob.day);
    if (!birthdayPassed) age--;
    return age;
  }

  @override
  void dispose() {
    _phoneAvailabilityDebounce?.cancel();
    _fullNameController.dispose();
    _usernameController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _ageController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleRegister() async {
    final authProvider = context.read<AuthProvider>();
    if (authProvider.isLoading) return;

    if (_formKey.currentState!.validate()) {
      if (_selectedGender == null) {
        showErrorSnackbar(context, 'Please select a gender');
        return;
      }

      final fullName = _fullNameController.text.trim();
      final username = _usernameController.text.trim();
      final phone = _phoneController.text.trim();
      final isAvailable = await _checkPhoneAvailability(phone);
      if (!isAvailable) {
        if (mounted) {
          showErrorSnackbar(
            context,
            _phoneAvailabilityMessage ?? 'Registration cannot continue.',
          );
        }
        return;
      }
      final age = int.parse(_ageController.text.trim());
      final password = _passwordController.text;
      final success = await authProvider.register(
        fullName: fullName,
        username: username,
        phone: phone,
        gender: _selectedGender!,
        age: age,
        password: password,
        dateOfBirth: _dobController.text,
      );

      if (mounted) {
        if (success) {
          showSuccessSnackbar(
            context,
            'Account created. Verify your phone number to continue.',
          );
          context.go('/verify_phone', extra: phone);
        } else {
          showErrorSnackbar(
            context,
            authProvider.error ?? AppStrings.errorOccurred,
          );
        }
      }
    }
  }

  String? _validatePhoneFormat(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return AppStrings.requiredField;
    }
    final phonePattern = RegExp(r'^\+252(61|62|63|65|66|67|68|69|77|90)\d{7}$');
    if (!phonePattern.hasMatch(text)) {
      return 'Use a valid Somali phone number, e.g. +25261XXXXXXX';
    }
    return null;
  }

  void _onPhoneChanged(String value) {
    _phoneAvailabilityDebounce?.cancel();
    final phone = value.trim();
    setState(() {
      _isPhoneAvailable = null;
      _lastCheckedPhone = null;
      _phoneAvailabilityMessage = null;
      _isCheckingPhoneAvailability = false;
    });

    if (_validatePhoneFormat(phone) != null) return;

    _phoneAvailabilityDebounce = Timer(const Duration(milliseconds: 650), () {
      _checkPhoneAvailability(phone);
    });
  }

  Future<bool> _checkPhoneAvailability(String phone) async {
    if (_validatePhoneFormat(phone) != null) {
      setState(() {
        _isPhoneAvailable = false;
        _phoneAvailabilityMessage =
            'Use a valid Somali phone number, e.g. +25261XXXXXXX';
        _lastCheckedPhone = phone;
      });
      return false;
    }

    if (_lastCheckedPhone == phone && _isPhoneAvailable == true) {
      return true;
    }

    setState(() {
      _isCheckingPhoneAvailability = true;
      _phoneAvailabilityMessage = null;
    });

    final authProvider = context.read<AuthProvider>();
    final available = await authProvider.isPhoneAvailable(phone);
    if (!mounted) return false;

    final message = available
        ? 'Phone number available'
        : authProvider.error ?? 'This phone number is already registered.';
    setState(() {
      _isCheckingPhoneAvailability = false;
      _isPhoneAvailable = available;
      _phoneAvailabilityMessage = message;
      _lastCheckedPhone = phone;
    });

    return available;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(AppStrings.register),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppStrings.createAccount,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  AppStrings.enterDetails,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 28),
                CustomTextField(
                  label: AppStrings.fullName,
                  hintText: AppStrings.fullName,
                  controller: _fullNameController,
                  prefixIcon: Icon(Icons.person),
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.isEmpty) {
                      return AppStrings.requiredField;
                    }
                    if (text.length < 2) {
                      return 'Name must be at least 2 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                CustomTextField(
                  label: AppStrings.username,
                  hintText: AppStrings.username,
                  controller: _usernameController,
                  prefixIcon: Icon(Icons.person_outline_rounded),
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.isEmpty) {
                      return AppStrings.requiredField;
                    }
                    if (text.length < 3) {
                      return AppStrings.invalidUsername;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                CustomTextField(
                  label: AppStrings.phone,
                  hintText: AppStrings.phone,
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  prefixIcon: Icon(Icons.phone),
                  errorText: _isPhoneAvailable == false &&
                          _phoneAvailabilityMessage ==
                              'This phone number is already registered.'
                      ? _phoneAvailabilityMessage
                      : null,
                  onChanged: _onPhoneChanged,
                  validator: _validatePhoneFormat,
                ),
                if (_isCheckingPhoneAvailability ||
                    (_phoneAvailabilityMessage != null &&
                        _isPhoneAvailable != false)) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (_isCheckingPhoneAvailability)
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else
                        Icon(
                          _isPhoneAvailable == true
                              ? Icons.check_circle
                              : Icons.error,
                          size: 16,
                          color: _isPhoneAvailable == true
                              ? AppColors.lightSuccess
                              : AppColors.lightDanger,
                        ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _isCheckingPhoneAvailability
                              ? 'Checking phone number...'
                              : _phoneAvailabilityMessage!,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: _isPhoneAvailable == true
                                        ? AppColors.lightSuccess
                                        : AppColors.lightDanger,
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 20),
                CustomDropdown<String>(
                  label: AppStrings.gender,
                  value: _selectedGender,
                  items: genders
                      .map(
                        (gender) => DropdownMenuItem(
                          value: gender,
                          child: Text(gender),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    setState(() => _selectedGender = value);
                  },
                  validator: (value) {
                    if (value == null) {
                      return AppStrings.requiredField;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                CustomTextField(
                  label: AppStrings.age,
                  hintText: AppStrings.age,
                  controller: _ageController,
                  keyboardType: TextInputType.number,
                  prefixIcon: Icon(Icons.cake),
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.isEmpty) {
                      return AppStrings.requiredField;
                    }
                    final age = int.tryParse(text);
                    if (age == null || age < 13 || age > 120) {
                      return AppStrings.invalidAge;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                CustomTextField(
                  label: AppStrings.dateOfBirth,
                  hintText: 'YYYY-MM-DD',
                  controller: _dobController,
                  readOnly: true,
                  onTap: () async {
                    final selectedDate = await showDatePicker(
                      context: context,
                      initialDate: _selectedDateOfBirth ?? DateTime(2000, 1, 1),
                      firstDate: DateTime(1900),
                      lastDate: DateTime.now(),
                    );
                    if (selectedDate != null) {
                      setState(() {
                        _selectedDateOfBirth = selectedDate;
                        _dobController.text = DateFormat('yyyy-MM-dd').format(selectedDate);
                      });
                    }
                  },
                  prefixIcon: Icon(Icons.calendar_today),
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.isEmpty) {
                      return AppStrings.requiredField;
                    }
                    final dob = DateTime.tryParse(text);
                    if (dob == null || dob.isAfter(DateTime.now())) {
                      return 'Enter a valid date in YYYY-MM-DD format';
                    }
                    final enteredAge = int.tryParse(_ageController.text.trim());
                    final calculatedAge = _calculateAge(dob);
                    if (enteredAge != null && (enteredAge - calculatedAge).abs() > 1) {
                      return 'Date of birth does not match the entered age';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                CustomTextField(
                  label: AppStrings.password,
                  hintText: AppStrings.password,
                  controller: _passwordController,
                  obscureText: true,
                  prefixIcon: Icon(Icons.lock),
                  validator: (value) {
                    if (value?.isEmpty ?? true) {
                      return AppStrings.requiredField;
                    }
                    if (value!.length < 8) {
                      return AppStrings.passwordTooShort;
                    }
                    if (!RegExp(r'[A-Z]').hasMatch(value)) {
                      return AppStrings.passwordRequirements;
                    }
                    if (!RegExp(r'[a-z]').hasMatch(value)) {
                      return AppStrings.passwordRequirements;
                    }
                    if (!RegExp(r'[0-9]').hasMatch(value)) {
                      return AppStrings.passwordRequirements;
                    }
                    if (!RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value)) {
                      return AppStrings.passwordRequirements;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                CustomTextField(
                  label: AppStrings.confirmPassword,
                  hintText: AppStrings.confirmPassword,
                  controller: _confirmPasswordController,
                  obscureText: true,
                  prefixIcon: Icon(Icons.lock),
                  validator: (value) {
                    if (value?.isEmpty ?? true) {
                      return AppStrings.requiredField;
                    }
                    if (value != _passwordController.text) {
                      return AppStrings.passwordMismatch;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 32),
                Consumer<AuthProvider>(
                  builder: (context, authProvider, _) {
                    return GradientButton(
                      label: AppStrings.signUp,
                      onPressed: _handleRegister,
                      isLoading: authProvider.isLoading,
                    );
                  },
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      AppStrings.alreadyHaveAccount,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.of(context).pop();
                      },
                      child: Text(
                        AppStrings.login,
                        style: TextStyle(
                          color: AppColors.lightPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
