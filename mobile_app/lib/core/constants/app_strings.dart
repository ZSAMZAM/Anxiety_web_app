class AppStrings {
  static String _languageCode = 'en';

  static void setLanguage(String languageCode) {
    if (_translations.containsKey(languageCode)) {
      _languageCode = languageCode;
    }
  }

  static String text(String key, String fallback) {
    return _translations[_languageCode]?[key] ?? _translations['en']?[key] ?? fallback;
  }

  static const Map<String, Map<String, String>> _translations = {
    'en': {
      'appName': 'AnxietyCare',
      'appTagline': 'Mental Health Companion',
      'splash': 'AnxietyCare',
      'splashTagline': 'Your Mental Health Companion',
      'login': 'Login',
      'register': 'Register',
      'forgotPassword': 'Forgot Password?',
      'username': 'Username',
      'password': 'Password',
      'confirmPassword': 'Confirm Password',
      'fullName': 'Full Name',
      'phone': 'Phone Number',
      'gender': 'Gender',
      'dateOfBirth': 'Date of Birth',
      'age': 'Age',
      'male': 'Male',
      'female': 'Female',
      'dontHaveAccount': "Don't have an account? ",
      'signUp': 'Sign Up',
      'alreadyHaveAccount': 'Already have an account? ',
      'enterDetails': 'Enter your details to continue',
      'createAccount': 'Create your account',
      'requiredField': 'This field is required',
      'invalidPhone': 'Enter a valid phone number',
      'passwordTooShort': 'Password must be at least 8 characters',
      'passwordRequirements': 'Use at least 8 characters with uppercase, lowercase, number, and symbol',
      'passwordMismatch': 'Passwords do not match',
      'invalidUsername': 'Username must be at least 3 characters',
      'invalidAge': 'Enter a valid age',
      'dashboard': 'Dashboard',
      'welcome': 'Welcome',
      'mentalHealthScore': 'Mental Health Score',
      'latestPrediction': 'Latest Prediction',
      'upcomingAppointment': 'Upcoming Appointment',
      'assessmentCount': 'Assessments Taken',
      'takeAssessment': 'Take Assessment',
      'bookDoctor': 'Book Doctor',
      'predictionHistory': 'Prediction History',
      'profile': 'Profile',
      'home': 'Home',
      'assessment': 'Assessment',
      'bookings': 'Bookings',
      'notifications': 'Notifications',
      'assessmentQuestion': 'How have you been feeling today and during the past few days?',
      'assessmentDescription': 'Share your thoughts and feelings for our AI analysis',
      'analyze': 'Analyze',
      'analyzing': 'Analyzing...',
      'enterAtLeast10Chars': 'Please enter at least 10 characters',
      'neutral': 'Neutral',
      'anxiety': 'Anxiety',
      'depression': 'Depression',
      'predictionResult': 'Prediction Result',
      'yourHealthCondition': 'Your Health Condition',
      'yourHealthRequiresAttention': 'Your health condition requires attention.',
      'mentalWellnessRecommendations': 'Mental wellness recommendations',
      'mentorSupport': 'Mentor support available',
      'recommendations': 'Recommendations',
      'mentalWellnessTips': 'Mental Wellness Tips',
      'sleepTips': 'Sleep Tips',
      'exerciseAdvice': 'Exercise Advice',
      'stressReductionTips': 'Stress Reduction Tips',
      'doctors': 'Available Doctors',
      'doctorProfile': 'Doctor Profile',
      'doctorName': 'Doctor Name',
      'rating': 'Rating',
      'specialization': 'Specialization',
      'hospital': 'Hospital',
      'fee': 'Consultation Fee',
      'experience': 'Experience',
      'biography': 'Biography',
      'availableDays': 'Available Days',
      'availableTimeSlots': 'Available Time Slots',
      'bookAppointment': 'Book Appointment',
      'search': 'Search doctors...',
      'booking': 'Booking',
      'selectedDoctor': 'Selected Doctor',
      'selectedDate': 'Selected Date',
      'selectedTime': 'Selected Time',
      'notes': 'Notes',
      'confirmBooking': 'Confirm Booking',
      'selectDate': 'Select Date',
      'selectTime': 'Select Time',
      'payment': 'Payment',
      'paymentMethod': 'Payment Method',
      'evcPlus': 'EVC Plus',
      'waafi': 'WAAFI',
      'phoneNumber': 'Phone Number',
      'amount': 'Amount',
      'description': 'Description',
      'payNow': 'Pay Now',
      'paymentProcessing': 'Processing payment...',
      'success': 'Success',
      'appointmentConfirmed': 'Appointment Confirmed',
      'bookingConfirmation': 'Booking Confirmation',
      'appointmentConfirmedDesc': 'Your appointment has been confirmed',
      'referenceNumber': 'Reference Number',
      'returnHome': 'Return Home',
      'appointmentReminder': 'Appointment Reminder',
      'paymentConfirmation': 'Payment Confirmation',
      'markAsRead': 'Mark as read',
      'clearAll': 'Clear all',
      'noNotifications': 'No notifications',
      'editProfile': 'Edit Profile',
      'appointmentHistory': 'Appointment History',
      'changePassword': 'Change Password',
      'logout': 'Logout',
      'logoutConfirm': 'Are you sure you want to logout?',
      'upcoming': 'Upcoming',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'noUpcomingAppointments': 'No upcoming appointments',
      'noCompletedAppointments': 'No completed appointments',
      'noCancelledAppointments': 'No cancelled appointments',
      'error': 'Error',
      'errorOccurred': 'An error occurred',
      'tryAgain': 'Try Again',
      'noInternet': 'No internet connection',
      'serverError': 'Server error. Please try again later',
      'invalidCredentials': 'Invalid username or password',
      'userAlreadyExists': 'Username already exists',
      'loginSuccess': 'Login successful',
      'registerSuccess': 'Account created successfully',
      'passwordChanged': 'Password changed successfully',
      'profileUpdated': 'Profile updated successfully',
      'loading': 'Loading...',
      'pleaseWait': 'Please wait...',
    },
    'so': {
      'appName': 'AnxietyCare',
      'appTagline': 'Saaxiibka Caafimaadka Maskaxda',
      'splash': 'AnxietyCare',
      'splashTagline': 'Saaxiibkaaga Caafimaadka Maskaxda',
      'login': 'Gal',
      'register': 'Is diiwaangeli',
      'forgotPassword': 'Ma illowday furaha?',
      'username': 'Magaca isticmaalaha',
      'password': 'Furaha sirta',
      'confirmPassword': 'Xaqiiji furaha sirta',
      'fullName': 'Magac buuxa',
      'phone': 'Lambarka telefoonka',
      'gender': 'Jinsi',
      'dateOfBirth': 'Taariikhda dhalashada',
      'age': 'Da',
      'male': 'Lab',
      'female': 'Dhedig',
      'dontHaveAccount': 'Akoon ma lihid? ',
      'signUp': 'Is diiwaangeli',
      'alreadyHaveAccount': 'Akoon hore ma leedahay? ',
      'enterDetails': 'Geli faahfaahintaada si aad u sii wadato',
      'createAccount': 'Abuur akoonkaaga',
      'requiredField': 'Goobtan waa qasab',
      'invalidPhone': 'Geli lambar telefoon sax ah',
      'passwordTooShort': 'Furaha sirta waa inuu ahaadaa ugu yaraan 8 xaraf',
      'passwordRequirements': 'Isticmaal ugu yaraan 8 xaraf oo leh xaraf weyn, xaraf yar, lambar, iyo calaamad',
      'passwordMismatch': 'Furayaasha sirta isma waafaqaan',
      'invalidUsername': 'Magaca isticmaalaha waa inuu ahaadaa ugu yaraan 3 xaraf',
      'invalidAge': 'Geli da sax ah',
      'dashboard': 'Dashboard',
      'welcome': 'Soo dhawoow',
      'mentalHealthScore': 'Dhibcaha Caafimaadka Maskaxda',
      'latestPrediction': 'Saadaashii U Dambeysay',
      'upcomingAppointment': 'Ballanta Soo Socota',
      'assessmentCount': 'Qiimeynno La Qaaday',
      'takeAssessment': 'Qaado Qiimeyn',
      'bookDoctor': 'Ballan Dhakhtar',
      'predictionHistory': 'Taariikhda Saadaasha',
      'profile': 'Akoon',
      'home': 'Hoy',
      'assessment': 'Qiimeyn',
      'bookings': 'Ballamo',
      'notifications': 'Ogeysiisyo',
      'assessmentQuestion': 'Sidee ayaad dareemaysay maanta iyo maalmahan dhow?',
      'assessmentDescription': 'La wadaag fikirkaaga iyo dareenkaaga falanqeynta AI',
      'analyze': 'Falanqee',
      'analyzing': 'Waa la falanqeynayaa...',
      'enterAtLeast10Chars': 'Fadlan geli ugu yaraan 10 xaraf',
      'neutral': 'Caadi',
      'anxiety': 'Welwel',
      'depression': 'Niyad-jab',
      'predictionResult': 'Natiijada Saadaasha',
      'yourHealthCondition': 'Xaaladdaada Caafimaad',
      'yourHealthRequiresAttention': 'Xaaladdaada caafimaad waxay u baahan tahay fiiro gaar ah.',
      'mentalWellnessRecommendations': 'Talooyin caafimaadka maskaxda',
      'mentorSupport': 'Taageero la-taliye ayaa jirta',
      'recommendations': 'Talooyin',
      'mentalWellnessTips': 'Talooyin Caafimaad Maskaxeed',
      'sleepTips': 'Talooyin Hurdo',
      'exerciseAdvice': 'Talo Jimicsi',
      'stressReductionTips': 'Talooyin Yareynta Cadaadiska',
      'doctors': 'Dhakhaatiirta La Heli Karo',
      'doctorProfile': 'Akoonka Dhakhtarka',
      'doctorName': 'Magaca Dhakhtarka',
      'rating': 'Qiimeyn',
      'specialization': 'Takhasus',
      'hospital': 'Isbitaal',
      'fee': 'Lacagta La-tashiga',
      'experience': 'Khibrad',
      'biography': 'Taariikh Nololeed',
      'availableDays': 'Maalmaha La Heli Karo',
      'availableTimeSlots': 'Waqtiyada La Heli Karo',
      'bookAppointment': 'Qabso Ballan',
      'search': 'Raadi dhakhaatiir...',
      'booking': 'Ballan',
      'selectedDoctor': 'Dhakhtarka La Doortay',
      'selectedDate': 'Taariikhda La Doortay',
      'selectedTime': 'Waqtiga La Doortay',
      'notes': 'Qoraallo',
      'confirmBooking': 'Xaqiiji Ballanta',
      'selectDate': 'Dooro Taariikh',
      'selectTime': 'Dooro Waqti',
      'payment': 'Lacag Bixin',
      'paymentMethod': 'Habka Lacag Bixinta',
      'evcPlus': 'EVC Plus',
      'waafi': 'WAAFI',
      'phoneNumber': 'Lambarka Telefoonka',
      'amount': 'Qaddar',
      'description': 'Sharaxaad',
      'payNow': 'Bixi Hadda',
      'paymentProcessing': 'Lacag bixinta waa socotaa...',
      'success': 'Guul',
      'appointmentConfirmed': 'Ballanta Waa La Xaqiijiyay',
      'bookingConfirmation': 'Xaqiijinta Ballanta',
      'appointmentConfirmedDesc': 'Ballantaada waa la xaqiijiyay',
      'referenceNumber': 'Lambarka Tixraaca',
      'returnHome': 'Ku Noqo Hoyga',
      'appointmentReminder': 'Xusuusin Ballan',
      'paymentConfirmation': 'Xaqiijinta Lacag Bixinta',
      'markAsRead': 'Calaamadee in la akhriyay',
      'clearAll': 'Nadiifi dhammaan',
      'noNotifications': 'Ogeysiisyo ma jiraan',
      'editProfile': 'Wax ka beddel Akoonka',
      'appointmentHistory': 'Taariikhda Ballamaha',
      'changePassword': 'Beddel Furaha Sirta',
      'logout': 'Ka bax',
      'logoutConfirm': 'Ma hubtaa inaad ka baxayso?',
      'upcoming': 'Soo socda',
      'completed': 'Dhammeystiran',
      'cancelled': 'La joojiyay',
      'noUpcomingAppointments': 'Ballamo soo socda ma jiraan',
      'noCompletedAppointments': 'Ballamo dhammeystiran ma jiraan',
      'noCancelledAppointments': 'Ballamo la joojiyay ma jiraan',
      'error': 'Khalad',
      'errorOccurred': 'Khalad ayaa dhacay',
      'tryAgain': 'Isku day mar kale',
      'noInternet': 'Internet ma jiro',
      'serverError': 'Khalad server. Fadlan mar kale isku day',
      'invalidCredentials': 'Magaca isticmaalaha ama furaha sirta waa khalad',
      'userAlreadyExists': 'Magaca isticmaalaha hore ayuu u jiray',
      'loginSuccess': 'Gelitaanka waa lagu guuleystay',
      'registerSuccess': 'Akoonka si guul leh ayaa loo abuuray',
      'passwordChanged': 'Furaha sirta si guul leh ayaa loo beddelay',
      'profileUpdated': 'Akoonka si guul leh ayaa loo cusbooneysiiyay',
      'loading': 'Waa la rarayaa...',
      'pleaseWait': 'Fadlan sug...',
    },
  };

  static String get appName => text('appName', 'AnxietyCare');
  static String get appTagline => text('appTagline', 'Mental Health Companion');
  static String get splash => text('splash', 'AnxietyCare');
  static String get splashTagline => text('splashTagline', 'Your Mental Health Companion');
  static String get login => text('login', 'Login');
  static String get register => text('register', 'Register');
  static String get forgotPassword => text('forgotPassword', 'Forgot Password?');
  static String get username => text('username', 'Username');
  static String get password => text('password', 'Password');
  static String get confirmPassword => text('confirmPassword', 'Confirm Password');
  static String get fullName => text('fullName', 'Full Name');
  static String get phone => text('phone', 'Phone Number');
  static String get gender => text('gender', 'Gender');
  static String get dateOfBirth => text('dateOfBirth', 'Date of Birth');
  static String get age => text('age', 'Age');
  static String get male => text('male', 'Male');
  static String get female => text('female', 'Female');
  static String get dontHaveAccount => text('dontHaveAccount', "Don't have an account? ");
  static String get signUp => text('signUp', 'Sign Up');
  static String get alreadyHaveAccount => text('alreadyHaveAccount', 'Already have an account? ');
  static String get enterDetails => text('enterDetails', 'Enter your details to continue');
  static String get createAccount => text('createAccount', 'Create your account');
  static String get requiredField => text('requiredField', 'This field is required');
  static String get invalidPhone => text('invalidPhone', 'Enter a valid phone number');
  static String get passwordTooShort => text('passwordTooShort', 'Password must be at least 8 characters');
  static String get passwordRequirements => text('passwordRequirements', 'Use at least 8 characters with uppercase, lowercase, number, and symbol');
  static String get passwordMismatch => text('passwordMismatch', 'Passwords do not match');
  static String get invalidUsername => text('invalidUsername', 'Username must be at least 3 characters');
  static String get invalidAge => text('invalidAge', 'Enter a valid age');
  static String get dashboard => text('dashboard', 'Dashboard');
  static String get welcome => text('welcome', 'Welcome');
  static String get mentalHealthScore => text('mentalHealthScore', 'Mental Health Score');
  static String get latestPrediction => text('latestPrediction', 'Latest Prediction');
  static String get upcomingAppointment => text('upcomingAppointment', 'Upcoming Appointment');
  static String get assessmentCount => text('assessmentCount', 'Assessments Taken');
  static String get takeAssessment => text('takeAssessment', 'Take Assessment');
  static String get bookDoctor => text('bookDoctor', 'Book Doctor');
  static String get predictionHistory => text('predictionHistory', 'Prediction History');
  static String get profile => text('profile', 'Profile');
  static String get home => text('home', 'Home');
  static String get assessment => text('assessment', 'Assessment');
  static String get bookings => text('bookings', 'Bookings');
  static String get notifications => text('notifications', 'Notifications');
  static String get assessmentQuestion => text('assessmentQuestion', 'How have you been feeling today and during the past few days?');
  static String get assessmentDescription => text('assessmentDescription', 'Share your thoughts and feelings for our AI analysis');
  static String get analyze => text('analyze', 'Analyze');
  static String get analyzing => text('analyzing', 'Analyzing...');
  static String get enterAtLeast10Chars => text('enterAtLeast10Chars', 'Please enter at least 10 characters');
  static String get neutral => text('neutral', 'Neutral');
  static String get anxiety => text('anxiety', 'Anxiety');
  static String get depression => text('depression', 'Depression');
  static String get predictionResult => text('predictionResult', 'Prediction Result');
  static String get yourHealthCondition => text('yourHealthCondition', 'Your Health Condition');
  static String get yourHealthRequiresAttention => text('yourHealthRequiresAttention', 'Your health condition requires attention.');
  static String get mentalWellnessRecommendations => text('mentalWellnessRecommendations', 'Mental wellness recommendations');
  static String get mentorSupport => text('mentorSupport', 'Mentor support available');
  static String get recommendations => text('recommendations', 'Recommendations');
  static String get mentalWellnessTips => text('mentalWellnessTips', 'Mental Wellness Tips');
  static String get sleepTips => text('sleepTips', 'Sleep Tips');
  static String get exerciseAdvice => text('exerciseAdvice', 'Exercise Advice');
  static String get stressReductionTips => text('stressReductionTips', 'Stress Reduction Tips');
  static String get doctors => text('doctors', 'Available Doctors');
  static String get doctorProfile => text('doctorProfile', 'Doctor Profile');
  static String get doctorName => text('doctorName', 'Doctor Name');
  static String get rating => text('rating', 'Rating');
  static String get specialization => text('specialization', 'Specialization');
  static String get hospital => text('hospital', 'Hospital');
  static String get fee => text('fee', 'Consultation Fee');
  static String get experience => text('experience', 'Experience');
  static String get biography => text('biography', 'Biography');
  static String get availableDays => text('availableDays', 'Available Days');
  static String get availableTimeSlots => text('availableTimeSlots', 'Available Time Slots');
  static String get bookAppointment => text('bookAppointment', 'Book Appointment');
  static String get search => text('search', 'Search doctors...');
  static String get booking => text('booking', 'Booking');
  static String get selectedDoctor => text('selectedDoctor', 'Selected Doctor');
  static String get selectedDate => text('selectedDate', 'Selected Date');
  static String get selectedTime => text('selectedTime', 'Selected Time');
  static String get notes => text('notes', 'Notes');
  static String get confirmBooking => text('confirmBooking', 'Confirm Booking');
  static String get selectDate => text('selectDate', 'Select Date');
  static String get selectTime => text('selectTime', 'Select Time');
  static String get payment => text('payment', 'Payment');
  static String get paymentMethod => text('paymentMethod', 'Payment Method');
  static String get evcPlus => text('evcPlus', 'EVC Plus');
  static String get waafi => text('waafi', 'WAAFI');
  static String get phoneNumber => text('phoneNumber', 'Phone Number');
  static String get amount => text('amount', 'Amount');
  static String get description => text('description', 'Description');
  static String get payNow => text('payNow', 'Pay Now');
  static String get paymentProcessing => text('paymentProcessing', 'Processing payment...');
  static String get success => text('success', 'Success');
  static String get appointmentConfirmed => text('appointmentConfirmed', 'Appointment Confirmed');
  static String get bookingConfirmation => text('bookingConfirmation', 'Booking Confirmation');
  static String get appointmentConfirmedDesc => text('appointmentConfirmedDesc', 'Your appointment has been confirmed');
  static String get referenceNumber => text('referenceNumber', 'Reference Number');
  static String get returnHome => text('returnHome', 'Return Home');
  static String get appointmentReminder => text('appointmentReminder', 'Appointment Reminder');
  static String get paymentConfirmation => text('paymentConfirmation', 'Payment Confirmation');
  static String get markAsRead => text('markAsRead', 'Mark as read');
  static String get clearAll => text('clearAll', 'Clear all');
  static String get noNotifications => text('noNotifications', 'No notifications');
  static String get editProfile => text('editProfile', 'Edit Profile');
  static String get appointmentHistory => text('appointmentHistory', 'Appointment History');
  static String get changePassword => text('changePassword', 'Change Password');
  static String get logout => text('logout', 'Logout');
  static String get logoutConfirm => text('logoutConfirm', 'Are you sure you want to logout?');
  static String get upcoming => text('upcoming', 'Upcoming');
  static String get completed => text('completed', 'Completed');
  static String get cancelled => text('cancelled', 'Cancelled');
  static String get noUpcomingAppointments => text('noUpcomingAppointments', 'No upcoming appointments');
  static String get noCompletedAppointments => text('noCompletedAppointments', 'No completed appointments');
  static String get noCancelledAppointments => text('noCancelledAppointments', 'No cancelled appointments');
  static String get error => text('error', 'Error');
  static String get errorOccurred => text('errorOccurred', 'An error occurred');
  static String get tryAgain => text('tryAgain', 'Try Again');
  static String get noInternet => text('noInternet', 'No internet connection');
  static String get serverError => text('serverError', 'Server error. Please try again later');
  static String get invalidCredentials => text('invalidCredentials', 'Invalid username or password');
  static String get userAlreadyExists => text('userAlreadyExists', 'Username already exists');
  static String get loginSuccess => text('loginSuccess', 'Login successful');
  static String get registerSuccess => text('registerSuccess', 'Account created successfully');
  static String get passwordChanged => text('passwordChanged', 'Password changed successfully');
  static String get profileUpdated => text('profileUpdated', 'Profile updated successfully');
  static String get loading => text('loading', 'Loading...');
  static String get pleaseWait => text('pleaseWait', 'Please wait...');
}
