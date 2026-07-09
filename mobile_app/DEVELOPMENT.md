# AnxietyCare - Flutter Mobile Application

A premium, production-quality mental health mobile application built with Flutter. Provides mental health assessment, doctor booking, and appointment management features with seamless integration to the AnxietyCare Flask backend.

## ✨ Features

### 🎨 Design
- **Modern UI/UX**: Premium healthcare design with white background, rounded corners, and soft shadows
- **Dark Mode Support**: Full dark mode implementation with optimized color schemes
- **Material 3 Design**: Latest Material Design principles and components
- **Smooth Animations**: Flutter Animate for engaging transitions and interactions
- **Responsive Layout**: Optimized for various Android screen sizes

### 🔐 Authentication
- User registration with comprehensive form validation
- Secure login with token-based authentication
- Flutter Secure Storage for sensitive data
- Password management and validation

### 📊 Features
1. **Splash Screen** - Animated introduction with gradient background
2. **Authentication** - Login and Registration screens
3. **Dashboard** - Mental health score, predictions, appointments, quick actions
4. **Assessment** - Text-based anxiety/depression assessment
5. **Prediction Results** - AI prediction with personalized recommendations
6. **Mental Wellness Recommendations** - Curated wellness tips
7. **Doctor Discovery** - Browse and search doctors with ratings and fees
8. **Doctor Profiles** - Detailed doctor information, specialization, availability
9. **Appointment Booking** - Date/time selection with notes
10. **Payment Integration** - Real Hormuud support (EVC Plus, WAAFI)
11. **Booking Confirmation** - Reference number and appointment details
12. **Notifications** - Appointment reminders, predictions, payments
13. **User Profile** - Personal information display and management
14. **Appointment History** - View upcoming, completed, and cancelled appointments
15. **Prediction History** - Track assessment predictions over time

## 🏗️ Architecture

```
lib/
├── core/
│   ├── theme/
│   │   ├── app_colors.dart        # Color palette (light & dark modes)
│   │   └── app_theme.dart         # Theme configuration
│   ├── constants/
│   │   ├── app_constants.dart     # API endpoints, timeouts, validation rules
│   │   └── app_strings.dart       # UI text strings (i18n ready)
│   ├── network/
│   │   ├── api_client.dart        # Dio HTTP client with interceptors
│   │   └── models.dart            # Data models (User, Doctor, Prediction, etc.)
│   ├── widgets/
│   │   ├── buttons.dart           # GradientButton, PrimaryButton, SecondaryButton
│   │   ├── cards.dart             # CustomCard, GradientCard, DoctorCard
│   │   ├── text_fields.dart       # CustomTextField, CustomDropdown
│   │   └── dialogs.dart           # Dialogs, snackbars, loading indicators
│   ├── providers/
│   │   ├── auth_provider.dart     # Authentication state management
│   │   ├── dashboard_provider.dart # Dashboard data
│   │   ├── assessment_provider.dart # Assessment/prediction logic
│   │   ├── doctor_provider.dart    # Doctor list and filtering
│   │   └── booking_provider.dart   # Booking state
│   └── routes/
│       └── app_routes.dart        # GoRouter configuration with all routes
├── features/
│   ├── auth/
│   │   ├── splash_screen.dart     # Animated splash screen
│   │   ├── login_screen.dart      # Login with validation
│   │   └── register_screen.dart   # User registration
│   ├── dashboard/
│   │   └── dashboard_screen.dart  # Main dashboard with bottom nav
│   ├── assessment/
│   │   └── assessment_screen.dart # Text-based assessment form
│   ├── prediction/
│   │   └── prediction_result_screen.dart # Results with recommendations
│   ├── recommendations/
│   │   └── recommendations_screen.dart   # Wellness tips by category
│   ├── doctors/
│   │   ├── doctor_list_screen.dart       # Browse and search doctors
│   │   └── doctor_profile_screen.dart    # Detailed doctor info
│   ├── booking/
│   │   ├── booking_screen.dart      # Date/time selection
│   │   └── booking_success_screen.dart # Confirmation
│   ├── payments/
│   │   └── payment_screen.dart      # Payment method selection
│   ├── notifications/
│   │   └── notifications_screen.dart # Notification center
│   └── profile/
│       ├── profile_screen.dart           # User profile
│       ├── appointment_history_screen.dart
│       └── prediction_history_screen.dart
└── main.dart                      # App entry point with providers

```

## 🎯 Color Scheme

### Light Mode
- Background: #F8FAFC
- Card: #FFFFFF
- Primary: #06B6D4
- Secondary: #3B82F6
- Success: #22C55E
- Warning: #F59E0B
- Danger: #EF4444
- Text: #0F172A
- Border: #E2E8F0

### Dark Mode
- Background: #0A0F1C
- Card: #161F2E
- Secondary Card: #1E293B
- Primary: #06B6D4
- Secondary: #3B82F6
- Text: #F8FAFC
- Border: #334155

## 📦 Dependencies

```yaml
# State Management
provider: ^6.1.1

# Networking
dio: ^5.4.0

# Storage
shared_preferences: ^2.2.2
flutter_secure_storage: ^9.0.0

# Navigation
go_router: ^13.0.0

# Animations
flutter_animate: ^4.5.0

# Image Caching
cached_network_image: ^3.3.1

# Internationalization
intl: ^0.18.1

# UI Components
flutter_svg: ^2.0.9
shimmer: ^3.0.0
```

## 🚀 Getting Started

### Prerequisites
- Flutter 3.11.5 or higher
- Dart 3.11.5 or higher
- Android SDK (for Android builds)
- AnxietyCare Flask backend running

### Installation

1. **Clone the repository**
```bash
cd Anxiety_web_app/mobile_app
```

2. **Install dependencies**
```bash
flutter pub get
```

3. **Update backend URL**
Edit `lib/core/constants/app_constants.dart`:
```dart
static const String baseUrl = 'http://your-backend-url:5000';
```

4. **Run the app**
```bash
flutter run
```

### Development Build
```bash
flutter run --debug
```

### Release Build
```bash
# Android
flutter build apk --release

# iOS
flutter build ios --release
```

## 🔗 Backend API Integration

The app connects to the Flask backend with the following endpoints:

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /predict` - Submit assessment text
- `GET /doctors` - List all doctors
- `GET /doctors/{id}` - Get doctor details
- `POST /booking` - Create appointment
- `POST /payment` - Process payment
- `GET /profile` - User profile
- `GET /appointments` - Appointment history
- `GET /predictions` - Prediction history
- `GET /notifications` - Notifications

## 🔐 Security Features

- **Secure Storage**: Sensitive data (tokens) stored in flutter_secure_storage
- **Token-based Auth**: Automatic token injection in API requests
- **Input Validation**: Comprehensive form validation
- **Error Handling**: Graceful error handling with user feedback
- **HTTPS Ready**: Configured for production HTTPS

## 🎨 Design Highlights

- **Gradient Buttons**: Smooth gradient animations with scale effects
- **Custom Cards**: Flexible card components with borders and shadows
- **Dark Mode**: Seamless dark mode with system theme detection
- **Animations**: Smooth transitions between screens
- **Responsive**: Adapts to different screen sizes

## 📱 Screens

| Screen | Purpose |
|--------|---------|
| Splash | App initialization with branding |
| Login | User authentication |
| Register | New user account creation |
| Dashboard | Main hub with predictions and appointments |
| Assessment | Mental health assessment form |
| Prediction Result | Assessment results with recommendations |
| Recommendations | Wellness tips and advice |
| Doctor List | Browse and search available doctors |
| Doctor Profile | Detailed doctor information |
| Booking | Select appointment date and time |
| Payment | Payment method selection |
| Booking Success | Confirmation with reference number |
| Notifications | Message center |
| Profile | User account management |
| Appointment History | Past and upcoming appointments |
| Prediction History | Assessment history tracking |

## 🛠️ Development

### State Management
Uses Provider package for reactive state management:
- AuthProvider: Authentication state
- DashboardProvider: Dashboard data
- AssessmentProvider: Assessment logic
- DoctorProvider: Doctor list and filtering
- BookingProvider: Booking process

### Navigation
Uses GoRouter for type-safe navigation with named routes.

### Error Handling
Comprehensive error handling with user-friendly error messages and snackbars.

## 📝 Code Style

- Follows Flutter and Dart best practices
- Uses meaningful variable and function names
- Organized folder structure for scalability
- Comments for complex logic
- Type-safe Dart code

## 🚧 Future Enhancements

- [ ] Telemedicine consultation feature
- [ ] Real-time notifications with Firebase
- [ ] Appointment reminders with local notifications
- [ ] Medical records storage
- [ ] Prescription management
- [ ] Multiple language support (i18n)
- [ ] Biometric authentication
- [ ] Offline mode support
- [ ] Video consultation integration
- [ ] AI-powered chatbot

## 🤝 Contributing

Contributions welcome! Please follow the existing code style and structure.

## 📄 License

This project is proprietary software for AnxietyCare application.

## 🆘 Support

For issues or questions:
1. Check existing documentation
2. Review backend API logs
3. Verify network connectivity
4. Check app configuration

---

**Built with ❤️ for mental health awareness**
