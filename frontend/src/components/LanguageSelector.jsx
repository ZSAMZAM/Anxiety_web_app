import { FiChevronDown, FiGlobe } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext.jsx';

function LanguageSelector({ compact = false }) {
  const { language, languages, setLanguage, t } = useLanguage();

  return (
    <div className={`inline-flex items-center gap-2 ${compact ? 'rounded-xl border border-[#E2E8F0] bg-white/82 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#0B2239]/80' : 'rounded-2xl border border-[#E2E8F0] bg-white/86 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#0B2239]/80'}`}>
      <FiGlobe className="h-4 w-4 text-[#2563EB] dark:text-[#93C5FD]" />
      {!compact && <span className="text-xs font-semibold text-[#475569] dark:text-[#B6C6DA]">{t('language')}</span>}
      <div className="relative">
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="appearance-none bg-transparent pr-8 text-sm font-semibold text-[#0F172A] outline-none dark:text-white"
          aria-label={t('language')}
        >
          {languages.map((item) => (
            <option
              key={item.code}
              value={item.code}
              className="bg-white text-slate-900 dark:bg-[#0B2239] dark:text-white"
            >
              {t(item.labelKey)}
            </option>
          ))}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B] dark:text-[#B6C6DA]" />
      </div>
    </div>
  );
}

export default LanguageSelector;
