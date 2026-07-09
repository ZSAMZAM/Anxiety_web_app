# AnxietyCare Flutter App - Quick Start Guide

## 🎯 Quick Setup (5 minutes)

### 1. Prerequisites
```bash
# Verify Flutter installation
flutter --version  # Should be 3.11.5+
```

### 2. Install Dependencies
```bash
cd Anxiety_web_app/mobile_app
flutter pub get
```

### 3. Configure Backend
Edit `lib/core/constants/app_constants.dart`:
```dart
// Change this to your backend URL
static const String baseUrl = 'http://localhost:5000';
```

### 4. Run the App
```bash
flutter run
```

## 📱 Testing the App

### Login Credentials (with mock backend)
```
Username: testuser
Password: password123
```

### Test Scenarios

1. **Splash Screen** → Auto-navigate after 3 seconds
2. **Login** → Use credentials above
3. **Dashboard** → View mental health score (85%) and quick actions
4. **Assessment** → Enter 10+ characters to enable "Analyze" button
5. **Prediction** → See results with color-coded status
6. **Doctors** → Browse or search doctors
7. **Booking** → Select date/time for appointment
8. **Payment** → Select EVC Plus or WAAFI
9. **Success** → View confirmation with reference number

## 🎨 Design Features

- **Bottom Navigation**: 5 main sections (Home, Assessment, Bookings, Notifications, Profile)
- **Gradient Buttons**: Smooth animations with scale effects
- **Dark Mode**: System theme detection with full support
- **Responsive UI**: Adapts to all screen sizes

## 🔐 Authentication Flow

```
Splash Screen (3 sec)
↓
Login Screen
↓
Register Screen (optional)
↓
Dashboard (after successful login)
```

Tokens are stored securely in `flutter_secure_storage`.

## 📊 Main Screens

| # | Screen | Path | Purpose |
|---|--------|------|---------|
| 1 | Splash | `/splash` | App intro |
| 2 | Login | `/login` | User authentication |
| 3 | Register | `/register` | Account creation |
| 4 | Dashboard | `/dashboard` | Main home screen |
| 5 | Assessment | `/assessment` | Mental health test |
| 6 | Prediction | `/prediction_result` | Test results |
| 7 | Recommendations | `/recommendations` | Wellness tips |
| 8 | Doctor List | `/doctors` | Browse doctors |
| 9 | Doctor Profile | `/doctor_profile` | Doctor details |
| 10 | Booking | `/booking` | Schedule appointment |
| 11 | Payment | `/payment` | Process payment |
| 12 | Success | `/booking_success` | Confirmation |
| 13 | Notifications | `/notifications` | Message center |
| 14 | Profile | `/profile` | User profile |
| 15 | Appointments | `/appointment_history` | History |
| 16 | Predictions | `/prediction_history` | Assessment history |

## 🛠️ Development Tips

### Hot Reload
- Press `r` in terminal to hot reload code
- Press `R` to hot restart (for provider changes)

### Debug Mode
```bash
flutter run --debug
```

### Release Mode
```bash
flutter run --release
```

### Check Performance
```bash
flutter run --profile
```

## 📦 Project Structure

```
lib/
├── core/           # Shared resources (theme, API, widgets)
├── features/       # Feature-specific screens
└── main.dart       # App entry point
```

## 🔧 Common Tasks

### Add a New Screen
1. Create file in `features/{feature}/new_screen.dart`
2. Add route in `core/routes/app_routes.dart`
3. Add navigation button/link in parent screen

### Add a New Provider
1. Create file in `core/providers/new_provider.dart`
2. Add to MultiProvider in `main.dart`
3. Use with `Consumer<NewProvider>()` in screens

### Update Colors
Edit `lib/core/constants/app_colors.dart` and rebuild.

### Update Strings
Edit `lib/core/constants/app_strings.dart` for UI text.

## 🐛 Troubleshooting

### App won't start
```bash
flutter clean
flutter pub get
flutter run
```

### Hot reload not working
- Use `R` (hot restart) instead
- Check for provider/state errors

### Backend connection fails
- Check backend is running: `http://localhost:5000`
- Update `baseUrl` in `app_constants.dart`
- Check network connectivity

### Payment screen crashes
- Ensure merchant credentials are configured
- Test with mock payment provider first

## 📚 Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Provider Documentation](https://pub.dev/packages/provider)
- [GoRouter Documentation](https://pub.dev/packages/go_router)
- [Dio HTTP Documentation](https://pub.dev/packages/dio)

## 🚀 Next Steps

1. ✅ Run the app and explore all screens
2. ✅ Test login/register with backend
3. ✅ Test payment flow (mock or real)
4. ✅ Review and customize colors in `app_colors.dart`
5. ✅ Update backend URL for production

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Status**: Production Ready ✨
