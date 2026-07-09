# Backend Configuration

Update the following in `lib/core/constants/app_constants.dart`:

## API Endpoints

```dart
// Production Backend
static const String baseUrl = 'https://api.anxietycare.com';

// Development Backend
static const String baseUrl = 'http://localhost:5000';

// Local Network (for testing on device)
static const String baseUrl = 'http://192.168.x.x:5000';
```

## Database Models

The app expects the following API responses:

### Login Response
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "full_name": "User Name",
    "username": "username",
    "phone": "+252...",
    "gender": "male|female|other",
    "age": 25,
    "avatar": "url_to_image"
  }
}
```

### Doctor Model
```json
{
  "id": "doctor_id",
  "name": "Dr. Name",
  "specialization": "Mental Health",
  "hospital": "Hospital Name",
  "fee": 50.00,
  "rating": 4.5,
  "experience": 10,
  "photo": "url",
  "biography": "...",
  "available_days": ["Monday", "Tuesday", ...],
  "available_time_slots": ["09:00 AM", "10:00 AM", ...]
}
```

### Prediction Response
```json
{
  "id": "prediction_id",
  "status": "neutral|anxiety|depression",
  "recommendation": "Take action...",
  "date": "2024-12-11T10:00:00Z",
  "details": {...}
}
```

### Appointment Model
```json
{
  "id": "appointment_id",
  "doctor_id": "doctor_id",
  "user_id": "user_id",
  "doctor_name": "Dr. Name",
  "date": "2024-12-15T14:30:00Z",
  "time": "2:30 PM",
  "status": "upcoming|completed|cancelled",
  "notes": "...",
  "fee": 50.00,
  "reference_number": "REF-12345"
}
```

## Environment Variables

For production, consider using environment files:

```bash
# .env (not in version control)
BACKEND_URL=https://api.anxietycare.com
PAYMENT_MERCHANT_ID=hormuud_merchant_id
```

## Payment Integration

### Real Hormuud (Somalia)

**EVC Plus Integration:**
- Merchant ID: (from Hormuud)
- API Key: (from Hormuud)
- Endpoint: https://api.hormuud.com/pay

**WAAFI Integration:**
- Similar setup with WAAFI credentials

Update in `lib/features/payments/payment_screen.dart`:
```dart
const String paymentMerchantId = 'YOUR_MERCHANT_ID';
const String paymentApiKey = 'YOUR_API_KEY';
```

## Testing

### Mock Data
For development without backend, use mock data in providers:

```dart
// Example: doctor_provider.dart
Future<void> loadDoctors() async {
  // Development: Use mock data
  _doctors = [
    DoctorModel(
      id: '1',
      name: 'Dr. Ahmed',
      specialization: 'Mental Health',
      // ...
    ),
  ];
  notifyListeners();
}
```

### API Testing
Use tools like Postman to test endpoints:
1. POST /auth/login
2. GET /doctors (with Authorization header)
3. POST /predict (with assessment text)
4. POST /booking (with appointment details)

## Deployment

### Android Release
1. Update version in `pubspec.yaml`
2. Create signing key
3. Build APK/App Bundle:
   ```bash
   flutter build apk --release
   flutter build appbundle --release
   ```
4. Upload to Google Play Store

### iOS Release
1. Update version in `pubspec.yaml`
2. Update iOS bundle identifier
3. Build IPA:
   ```bash
   flutter build ios --release
   ```
4. Upload to App Store

---

See main README.md for more details.
