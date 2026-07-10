import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';

class AppLocalizations {
  static const supportedLanguages = {
    'en': 'English',
    'so': 'Somali',
  };

  static const Map<String, Map<String, String>> translations = {
    'en': {
      'language': 'Language',
      'english': 'English',
      'somali': 'Somali',
      'settings': 'Settings',
      'appearance': 'Appearance',
      'chooseAppearance': 'Choose how AnxietyCare looks on this device.',
      'lightMode': 'Light Mode',
      'darkMode': 'Dark Mode',
      'systemDefault': 'System Default',
      'account': 'Account',
      'profile': 'Profile',
      'notifications': 'Notifications',
      'healthHistory': 'Health history',
      'privacySecurity': 'Privacy & Security',
      'password': 'Password',
      'privacy': 'Privacy',
      'helpSupport': 'Help & Support',
      'aboutApplication': 'About Application',
      'logout': 'Logout',
      'clearSession': 'Clear secure session and return to login',
      'welcomeToAnxietyCare': 'Welcome to AnxietyCare',
      'loginSubtitle': 'Private mental health support, assessments, doctors, bookings, and updates in one calm space.',
      'signInSecurely': 'Sign in securely',
      'patientAccountsOnly': 'Patient accounts only on mobile.',
      'username': 'Username',
      'enterUsername': 'Enter your username',
      'enterPassword': 'Enter your password',
      'usernameRequired': 'Username is required.',
      'passwordRequired': 'Password is required.',
      'forgotPassword': 'Forgot Password?',
      'login': 'Login',
      'dontHaveAccount': "Don't have an account?",
      'signUp': 'Sign Up',
      'loginSuccess': 'Login successful',
      'assessment': 'Assessment',
      'continue': 'Continue',
      'analyze': 'Analyze',
      'backToMood': 'Back to mood selection',
      'minimumAssessmentText': 'Please enter at least 20 meaningful characters.',
    },
    'so': {
      'language': 'Luqad',
      'english': 'Ingiriisi',
      'somali': 'Soomaali',
      'settings': 'Dejinta',
      'appearance': 'Muuqaalka',
      'chooseAppearance': 'Dooro sida AnxietyCare uga muuqaneyso qalabkan.',
      'lightMode': 'Hab Iftiin',
      'darkMode': 'Hab Madow',
      'systemDefault': 'Raac nidaamka taleefanka',
      'account': 'Akoon',
      'profile': 'Akoon',
      'notifications': 'Ogeysiisyo',
      'healthHistory': 'Taariikhda caafimaadka',
      'privacySecurity': 'Asturnaanta & Amniga',
      'password': 'Furaha sirta',
      'privacy': 'Asturnaan',
      'helpSupport': 'Caawimo & Taageero',
      'aboutApplication': 'Ku saabsan app-ka',
      'logout': 'Ka bax',
      'clearSession': 'Nadiifi fadhiga amniga oo ku noqo gelitaanka',
      'welcomeToAnxietyCare': 'Ku soo dhawoow AnxietyCare',
      'loginSubtitle': 'Taageero caafimaad maskaxeed, qiimeyn, dhakhaatiir, ballamo, iyo ogeysiisyo meel deggan ku wada jira.',
      'signInSecurely': 'Si ammaan ah u gal',
      'patientAccountsOnly': 'Akoonnada bukaanka waxay ku shaqeeyaan mobile-ka oo keliya.',
      'username': 'Magaca isticmaalaha',
      'enterUsername': 'Geli magaca isticmaalaha',
      'enterPassword': 'Geli furaha sirta',
      'usernameRequired': 'Magaca isticmaalaha waa qasab.',
      'passwordRequired': 'Furaha sirta waa qasab.',
      'forgotPassword': 'Ma illowday furaha?',
      'login': 'Gal',
      'dontHaveAccount': 'Akoon ma lihid?',
      'signUp': 'Is diiwaangeli',
      'loginSuccess': 'Gelitaanka waa lagu guuleystay',
      'assessment': 'Qiimeyn',
      'continue': 'Sii wad',
      'analyze': 'Falanqee',
      'backToMood': 'Ku noqo doorashada niyadda',
      'minimumAssessmentText': 'Fadlan geli ugu yaraan 20 xaraf oo macno leh.',
    },
  };

  static String of(BuildContext context, String key) {
    return context.read<LanguageProvider>().translate(key);
  }
}

extension AppText on BuildContext {
  String tr(String key) => AppLocalizations.of(this, key);
}
