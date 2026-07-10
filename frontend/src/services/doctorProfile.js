const LOCAL_STORAGE_PROFILE_KEY = 'doctor-profile-data';
const LOCAL_STORAGE_SCHEDULE_KEY = 'doctor-schedule-slots';
const LOCAL_STORAGE_SETTINGS_KEY = 'doctor-settings-data';

const defaultProfile = {
  specialty: 'General Psychology',
  qualification: 'MBBS, MPH',
  experienceYears: '6',
  licenseNumber: 'DR-998822',
  hospitalName: 'Harmony Health Clinic',
  bio: 'Compassionate mental health specialist supporting patients with personalized anxiety and depression care.',
  gender: 'Female',
  age: '32',
  dateOfBirth: '1992-08-14',
  phone: '+252611234567',
  photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
};

const defaultSchedule = {
  weeklySlots: {
    Monday: ['09:00 - 13:00', '15:00 - 18:00'],
    Tuesday: ['09:00 - 13:00', '15:00 - 18:00'],
    Wednesday: ['09:00 - 13:00'],
    Thursday: ['09:00 - 13:00', '15:00 - 18:00'],
    Friday: ['09:00 - 13:00'],
    Saturday: ['10:00 - 14:00'],
    Sunday: [],
  },
  vacationDates: ['2026-06-22', '2026-07-04'],
  workingHours: '09:00 AM - 06:00 PM',
};

const defaultSettings = {
  appointmentAlerts: true,
  patientUpdates: true,
  smsPreferences: true,
  darkMode: false,
  loginHistory: [
    { id: 1, device: 'Chrome on Windows', time: 'Today • 08:34 AM' },
    { id: 2, device: 'Safari on iPhone', time: 'Yesterday • 06:21 PM' },
    { id: 3, device: 'Edge on macOS', time: 'Jun 2 • 12:03 PM' },
  ],
  activeSessions: [
    { id: 1, device: 'Current device', location: 'Mogadishu, Somalia', active: true },
    { id: 2, device: 'Mobile app', location: 'London, UK', active: false },
  ],
};

function loadDoctorProfile() {
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    return stored ? JSON.parse(stored) : defaultProfile;
  } catch (error) {
    console.warn('Unable to load doctor profile data:', error);
    return defaultProfile;
  }
}

function saveDoctorProfile(profile) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('Unable to save doctor profile data:', error);
  }
}

function loadDoctorSchedule() {
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_SCHEDULE_KEY);
    return stored ? JSON.parse(stored) : defaultSchedule;
  } catch (error) {
    console.warn('Unable to load doctor schedule data:', error);
    return defaultSchedule;
  }
}

function saveDoctorSchedule(schedule) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_SCHEDULE_KEY, JSON.stringify(schedule));
  } catch (error) {
    console.warn('Unable to save doctor schedule data:', error);
  }
}

function loadDoctorSettings() {
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : defaultSettings;
  } catch (error) {
    console.warn('Unable to load doctor settings data:', error);
    return defaultSettings;
  }
}

function saveDoctorSettings(settings) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Unable to save doctor settings data:', error);
  }
}

export { loadDoctorProfile, saveDoctorProfile, loadDoctorSchedule, saveDoctorSchedule, loadDoctorSettings, saveDoctorSettings };
