export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light Mode Colors
        primary: {
          DEFAULT: '#0EA5E9',
          light: '#38BDF8',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          light: '#22D3EE',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          light: '#A855F7',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        // Dark Mode Colors
        dark: {
          background: '#020617',
          sidebar: '#0F172A',
          card: '#111827',
          primary: '#38BDF8',
          secondary: '#22D3EE',
          accent: '#A855F7',
        },
        // Slate colors for text
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
      boxShadow: {
        'glass': '0 25px 60px rgba(14, 165, 233, 0.08)',
        'glass-dark': '0 25px 60px rgba(56, 189, 248, 0.16)',
        'glow': '0 25px 60px rgba(56, 189, 248, 0.16)',
        'glow-dark': '0 25px 60px rgba(168, 85, 247, 0.24)',
        'soft': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(circle at top left, rgba(14, 165, 233, 0.15), transparent 35%), linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.75))',
        'hero-gradient-dark': 'radial-gradient(circle at top left, rgba(56, 189, 248, 0.15), transparent 35%), linear-gradient(135deg, rgba(2,6,23,0.95), rgba(15,23,42,0.75))',
        'gradient-primary': 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
        'gradient-accent': 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};
