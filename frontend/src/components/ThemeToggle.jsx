import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E4ECF4] bg-[#EAF7FB] text-[#0F8EA8] transition-colors duration-200 hover:bg-[#DDF3F8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6] dark:border-white/10 dark:bg-white/8 dark:text-[#38BDF8] dark:hover:bg-white/12 ${className}`}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export default ThemeToggle;
