import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { 
  Brain, 
  Stethoscope, 
  Calendar, 
  Heart, 
  Shield, 
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  Activity,
  Zap,
  Lock,
  Users,
  FileText,
  BarChart3,
  Sparkles,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import { publicApi } from '../services/api.js';
import { useLandingTheme } from '../contexts/LandingThemeContext';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useLandingTheme();
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAssessments: 0,
    successfulAppointments: 0,
    revenue: 0
  });
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, doctorsData] = await Promise.all([
          publicApi.getPublicStats(),
          publicApi.getFeaturedDoctors(6)
        ]);
        setStats(statsData);
        setFeaturedDoctors(doctorsData);
      } catch (error) {
        console.error('Error fetching landing page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      await publicApi.submitContactForm(contactForm);
      setContactSubmitted(true);
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setContactSubmitted(false), 5000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
    }
  };

  const AnimatedCounter = ({ value, label, icon: Icon, color }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
      if (isInView) {
        const duration = 2000;
        const steps = 60;
        const stepValue = value / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += stepValue;
          if (current >= value) {
            setCount(value);
            clearInterval(timer);
          } else {
            setCount(Math.floor(current));
          }
        }, duration / steps);
        return () => clearInterval(timer);
      }
    }, [isInView, value]);

    return (
      <div ref={ref} className="premium-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="text-4xl font-bold gradient-text">
            {count.toLocaleString()}
          </div>
        </div>
        <p className="dark:text-slate-400 text-slate-600 font-medium">{label}</p>
      </div>
    );
  };

  const FeatureCard = ({ icon: Icon, title, description, color }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -8 }}
        className="premium-card p-8 cursor-pointer group"
      >
        <div className={`p-4 rounded-2xl ${color} w-fit mb-6 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold dark:text-slate-50 text-slate-900 mb-4">{title}</h3>
        <p className="dark:text-slate-400 text-slate-600 leading-relaxed">{description}</p>
      </motion.div>
    );
  };

  const DoctorCard = ({ doctor }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -8 }}
        className="premium-card overflow-hidden cursor-pointer group"
      >
        <div className="relative h-72 overflow-hidden">
          <img
            src={doctor.photo || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80"}
            alt={doctor.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-4 right-4 px-3 py-1 bg-success text-white text-sm font-semibold rounded-full">
            {doctor.availability || 'Available'}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-2">{doctor.name}</h3>
          <p className="primary font-semibold mb-3">{doctor.specialization}</p>
          <div className="flex items-center gap-4 mb-4 text-sm dark:text-slate-400 text-slate-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {doctor.experience || '5+ years'}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              {doctor.rating ? doctor.rating.toFixed(1) : '4.9'}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 premium-button-primary py-3 text-sm"
            >
              Book Appointment
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex-1 premium-button py-3 border-2 border-primary primary font-semibold text-sm"
            >
              View Profile
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const StepCard = ({ step, title, description, icon: Icon }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="premium-card p-8 text-center h-full">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
            <Icon className="w-10 h-10 text-white" />
          </div>
          <div className="text-5xl font-bold gradient-text mb-3">{step}</div>
          <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-3">{title}</h3>
          <p className="dark:text-slate-400 text-slate-600">{description}</p>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="dark:text-slate-400 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Sample analytics data (in production, fetch from API)
  const analyticsData = {
    anxietyDistribution: [
      { name: 'Mild', value: 35, color: '#22C55E' },
      { name: 'Moderate', value: 40, color: '#F59E0B' },
      { name: 'Severe', value: 25, color: '#EF4444' },
    ],
    appointmentsTrend: [
      { month: 'Jan', appointments: 120 },
      { month: 'Feb', appointments: 150 },
      { month: 'Mar', appointments: 180 },
      { month: 'Apr', appointments: 220 },
      { month: 'May', appointments: 280 },
      { month: 'Jun', appointments: 320 },
    ],
    revenueTrend: [
      { month: 'Jan', revenue: 15000 },
      { month: 'Feb', revenue: 18000 },
      { month: 'Mar', revenue: 22000 },
      { month: 'Apr', revenue: 28000 },
      { month: 'May', revenue: 35000 },
      { month: 'Jun', revenue: 42000 },
    ],
  };

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'glass-effect shadow-soft border-b dark:border-slate-700 border-slate-200' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold dark:text-slate-50 text-slate-900">
                AnxietyCare
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                Home
              </Link>
              <Link to="#doctors" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                Doctors
              </Link>
              <Link to="#features" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                Features
              </Link>
              <Link to="#how-it-works" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                How It Works
              </Link>
              <Link to="#contact" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                Contact
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 hover:shadow-soft transition-all"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 dark:text-slate-400 text-slate-600 hover:text-primary font-semibold transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/login')}
                className="premium-button-primary"
              >
                Web Login
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 dark:text-slate-400 text-slate-600" /> : <Menu className="w-6 h-6 dark:text-slate-400 text-slate-600" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t dark:border-slate-700 border-slate-200">
              <div className="flex flex-col gap-4">
                <Link to="/" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                  Home
                </Link>
                <Link to="#doctors" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                  Doctors
                </Link>
                <Link to="#features" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                  Features
                </Link>
                <Link to="#how-it-works" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                  How It Works
                </Link>
                <Link to="#contact" className="dark:text-slate-400 text-slate-600 hover:text-primary font-medium transition-colors">
                  Contact
                </Link>
                <div className="flex flex-col gap-3 pt-4 border-t dark:border-slate-700 border-slate-200">
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 hover:shadow-soft transition-all flex items-center gap-2"
                  >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-2.5 dark:text-slate-400 text-slate-600 hover:text-primary font-semibold transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="premium-button-primary"
                  >
                    Web Login
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 dark:bg-hero-gradient-dark bg-hero-gradient relative overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.3, 0.15]
            }}
            transition={{ duration: 6, repeat: Infinity, delay: 4 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/10 rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-80px)]">
            {/* Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 mb-6"
              >
                <Sparkles className="w-4 h-4 primary" />
                <span className="text-sm font-semibold primary">AI-Powered Mental Health Platform</span>
              </motion.div>
              
              <h1 className="text-5xl lg:text-7xl font-bold dark:text-slate-50 text-slate-900 mb-6 leading-tight">
                Understand Your Mental Health With{' '}
                <span className="gradient-text">Anxiety Assessment</span>
              </h1>
              
              <p className="text-xl dark:text-slate-400 text-slate-600 mb-8 leading-relaxed max-w-xl">
                Take professional anxiety screenings, connect with certified specialists, receive personalized recommendations, and track your emotional wellbeing.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-12">
                <button
                  onClick={() => navigate('/login')}
                  className="premium-button-primary text-lg px-8 py-4 flex items-center gap-2"
                >
                  Admin Login <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="premium-button px-8 py-4 text-lg dark:text-slate-50 text-slate-900 border-2 dark:border-slate-700 border-slate-200"
                >
                  Doctor Login
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-6">
                {[
                  { icon: Users, text: '1000+ Assessments' },
                  { icon: Stethoscope, text: 'Certified Doctors' },
                  { icon: Shield, text: 'Secure & Private' },
                  { icon: Zap, text: 'AI Powered' },
                ].map((badge, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-2 dark:text-slate-400 text-slate-600"
                  >
                    <badge.icon className="w-5 h-5 primary" />
                    <span className="text-sm font-medium">{badge.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Side - 3D Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                {/* Main Illustration */}
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                  className="relative rounded-3xl overflow-hidden shadow-2xl"
                >
                  <img
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80"
                    alt="Professional Healthcare"
                    className="w-full h-[600px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                </motion.div>
                
                {/* Floating Statistics Cards */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-8 -left-8 premium-card p-6 max-w-xs shadow-glow animate-float"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-success rounded-xl">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold dark:text-slate-50 text-slate-900">AI-Powered</span>
                  </div>
                  <p className="text-sm dark:text-slate-400 text-slate-600">Advanced ML for accurate assessment</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 2 }}
                  className="absolute -top-8 -right-8 premium-card p-6 max-w-xs shadow-glow animate-float-delayed"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary rounded-xl">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold dark:text-slate-50 text-slate-900">Secure & Private</span>
                  </div>
                  <p className="text-sm dark:text-slate-400 text-slate-600">Enterprise-grade security</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 3 }}
                  className="absolute top-1/2 -right-16 premium-card p-4 max-w-xs shadow-glow animate-float"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning rounded-xl">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold gradient-text">98%</div>
                      <p className="text-xs dark:text-slate-400 text-slate-600">Accuracy Rate</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 dark:bg-slate-900 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold dark:text-slate-50 text-slate-900 mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto">
              Real-time insights into our platform's impact
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <AnimatedCounter value={stats.totalPatients} label="Registered Users" icon={Users} color="bg-primary" />
            <AnimatedCounter value={stats.totalDoctors} label="Doctors" icon={Stethoscope} color="bg-secondary" />
            <AnimatedCounter value={stats.totalAssessments} label="Assessments" icon={Brain} color="bg-accent" />
            <AnimatedCounter value={stats.successfulAppointments} label="Appointments" icon={Calendar} color="bg-success" />
            <AnimatedCounter value={stats.revenue || 0} label="Revenue ($)" icon={TrendingUp} color="bg-warning" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 dark:bg-slate-950 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold dark:text-slate-50 text-slate-900 mb-4">
              Premium Features
            </h2>
            <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto">
              Comprehensive mental health solutions powered by technology and compassion
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="Anxiety & Depression Prediction"
              description="Advanced AI-powered analysis to assess your mental well-being with high accuracy and personalized insights."
              color="bg-gradient-primary"
            />
            <FeatureCard
              icon={Stethoscope}
              title="Online Doctor Consultation"
              description="Connect with certified mental health professionals for personalized therapy and guidance from anywhere."
              color="bg-gradient-accent"
            />
            <FeatureCard
              icon={Calendar}
              title="Appointment Booking"
              description="Seamlessly schedule appointments with your preferred doctors at your convenience with smart scheduling."
              color="bg-secondary"
            />
            <FeatureCard
              icon={Shield}
              title="Secure Payments"
              description="Safe and secure payment processing with multiple payment options and instant confirmation."
              color="bg-success"
            />
            <FeatureCard
              icon={BarChart3}
              title="Progress Tracking"
              description="Comprehensive analytics and tracking to monitor your mental wellness journey over time."
              color="bg-warning"
            />
            <FeatureCard
              icon={Heart}
              title="Personalized Recommendations"
              description="Receive tailored wellness tips and strategies based on your unique mental health profile."
              color="bg-primary"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 dark:bg-slate-900 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold dark:text-slate-50 text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto">
              Patient care happens in the mobile app while administrators monitor operations on the web.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StepCard
              step={1}
              title="Mobile Registration"
              description="Patients create their secure profile in the mobile app"
              icon={Users}
            />
            <StepCard
              step={2}
              title="Mobile Assessment"
              description="Patients complete the AI-powered assessment in the mobile app"
              icon={FileText}
            />
            <StepCard
              step={3}
              title="AI Prediction"
              description="Get instant mental health insights"
              icon={Brain}
            />
            <StepCard
              step={4}
              title="Doctor Consultation"
              description="Connect with professional doctors"
              icon={Stethoscope}
            />
            <StepCard
              step={5}
              title="Recovery Tracking"
              description="Monitor your progress over time"
              icon={TrendingUp}
            />
          </div>
        </div>
      </section>

      {/* Doctors Showcase Section */}
      <section id="doctors" className="py-20 px-4 sm:px-6 lg:px-8 dark:bg-slate-950 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold dark:text-slate-50 text-slate-900 mb-4">
              Meet Our Specialists
            </h2>
            <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto">
              Connect with certified professionals dedicated to your mental well-being
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/login')}
              className="premium-button-primary text-lg px-8 py-4"
            >
              View All Doctors
            </button>
          </div>
        </div>
      </section>

      {/* Assessment Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 dark:bg-slate-900 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold dark:text-slate-50 text-slate-900 mb-6">
                Professional Assessment Preview
              </h2>
              <p className="text-xl dark:text-slate-400 text-slate-600 mb-8 leading-relaxed">
                Experience our AI-powered mental health assessment with professionally designed questions and instant results.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  'Evidence-based questionnaire',
                  'Real-time progress tracking',
                  'Instant AI-powered results',
                  'Personalized recommendations',
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 dark:text-slate-400 text-slate-600"
                  >
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="premium-button-primary text-lg px-8 py-4"
              >
                Open Web Login
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="premium-card p-8"
            >
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium dark:text-slate-400 text-slate-600">Progress</span>
                  <span className="text-sm font-medium primary">3/10</span>
                </div>
                <div className="w-full h-2 dark:bg-slate-700 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: '30%' }} />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 dark:bg-slate-800 bg-slate-50 rounded-xl">
                  <p className="dark:text-slate-300 text-slate-700 font-medium mb-2">Question 3 of 10</p>
                  <p className="dark:text-slate-400 text-slate-600 text-sm">
                    How often have you felt nervous, anxious, or on edge over the past 2 weeks?
                  </p>
                </div>

                <div className="space-y-2">
                  {['Not at all', 'Several days', 'More than half the days', 'Nearly every day'].map((option, index) => (
                    <button
                      key={index}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        index === 2
                          ? 'bg-gradient-primary text-white'
                          : 'dark:bg-slate-800 bg-slate-50 dark:text-slate-300 text-slate-700 hover:dark:bg-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 premium-button py-3">Previous</button>
                <button className="flex-1 premium-button-primary py-3">Next</button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platform Analytics Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 dark:bg-slate-900 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold dark:text-slate-50 text-slate-900 mb-4">
              Platform Analytics
            </h2>
            <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto">
              Real-time insights into our platform's performance and impact
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Anxiety Distribution Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="premium-card p-6"
            >
              <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-6">Anxiety Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analyticsData.anxietyDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.anxietyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Appointments Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="premium-card p-6"
            >
              <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-6">Appointments Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analyticsData.appointmentsTrend}>
                  <defs>
                    <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#E2E8F0'} />
                  <XAxis dataKey="month" stroke={isDarkMode ? '#94A3B8' : '#64748B'} />
                  <YAxis stroke={isDarkMode ? '#94A3B8' : '#64748B'} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                      border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#F8FAFC' : '#0F172A',
                    }}
                  />
                  <Area type="monotone" dataKey="appointments" stroke="#0EA5E9" fillOpacity={1} fill="url(#colorAppointments)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Revenue Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="premium-card p-6"
            >
              <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-6">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analyticsData.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#E2E8F0'} />
                  <XAxis dataKey="month" stroke={isDarkMode ? '#94A3B8' : '#64748B'} />
                  <YAxis stroke={isDarkMode ? '#94A3B8' : '#64748B'} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                      border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#F8FAFC' : '#0F172A',
                    }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#06B6D4" strokeWidth={3} dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 dark:bg-slate-950 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold dark:text-slate-50 text-slate-900 mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto">
              Your data is protected with the highest security standards
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Lock, title: 'Encrypted Data', description: '256-bit encryption for all data' },
              { icon: Shield, title: 'HIPAA Style Security', description: 'Healthcare-grade compliance' },
              { icon: Activity, title: 'Secure Payments', description: 'PCI-DSS compliant processing' },
              { icon: Users, title: 'Privacy Protection', description: 'Strict data privacy policies' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="premium-card p-8 text-center cursor-pointer"
              >
                <div className="p-4 bg-gradient-primary rounded-xl w-fit mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-3">{item.title}</h3>
                <p className="dark:text-slate-400 text-slate-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-primary relative overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity, delay: 2 }}
            className="absolute bottom-0 right-0 w-80 h-80 bg-white/15 rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6">
              Start Your Mental Wellness Journey Today
            </h2>
            <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
              Join thousands of users who have transformed their mental health with our AI-powered platform
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
              onClick={() => navigate('/login')}
                className="px-8 py-4 bg-white text-primary rounded-2xl font-semibold hover:shadow-2xl transition-all text-lg flex items-center gap-2"
              >
                Admin Login <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-white/20 text-white rounded-2xl font-semibold hover:bg-white/30 transition-all text-lg border-2 border-white/30"
              >
                Doctor Login
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 dark:bg-slate-900 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold dark:text-slate-50 text-slate-900 mb-6">
                Contact Us
              </h2>
              <p className="text-lg dark:text-slate-400 text-slate-600 mb-8">
                Have questions? We're here to help. Reach out to us and we'll respond as soon as we can.
              </p>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-primary rounded-xl">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="dark:text-slate-400 text-slate-600 text-sm">Phone</p>
                    <p className="dark:text-slate-50 text-slate-900 font-semibold">+252 614 197 803</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-primary rounded-xl">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="dark:text-slate-400 text-slate-600 text-sm">Email</p>
                    <p className="dark:text-slate-50 text-slate-900 font-semibold">Group40fourty@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-primary rounded-xl">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="dark:text-slate-400 text-slate-600 text-sm">Location</p>
                    <p className="dark:text-slate-50 text-slate-900 font-semibold">Mogadishu, Somalia</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="premium-card p-8">
                {contactSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold dark:text-slate-50 text-slate-900 mb-2">Message Sent!</h3>
                    <p className="dark:text-slate-400 text-slate-600">Thank you for contacting us. We'll get back to you soon.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-semibold mb-2">Full Name</label>
                      <input
                        type="text"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="premium-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-semibold mb-2">Email</label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="premium-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-semibold mb-2">Subject</label>
                      <input
                        type="text"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="premium-input"
                      />
                    </div>
                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-semibold mb-2">Message</label>
                      <textarea
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        rows={4}
                        className="premium-input resize-none"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="premium-button-primary w-full py-4"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="dark:bg-slate-950 bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-primary rounded-xl">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <span className="text-2xl font-bold">AnxietyCare</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-sm">
                Advanced AI-powered mental health assessment and professional support platform. Transform your mental wellness journey today.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6">Company</h3>
              <ul className="space-y-3">
                <li><Link to="/" className="text-slate-400 hover:text-white transition-colors">Home</Link></li>
                <li><Link to="#doctors" className="text-slate-400 hover:text-white transition-colors">Doctors</Link></li>
                <li><Link to="#features" className="text-slate-400 hover:text-white transition-colors">Features</Link></li>
                <li><Link to="#how-it-works" className="text-slate-400 hover:text-white transition-colors">How It Works</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6">Features</h3>
              <ul className="space-y-3">
                <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">AI Assessment</Link></li>
                <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">Anxiety Detection</Link></li>
                <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">Depression Screening</Link></li>
                <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">Professional Consultation</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6">Support</h3>
              <ul className="space-y-3">
                <li><Link to="#contact" className="text-slate-400 hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © 2026 AnxietyCare. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
