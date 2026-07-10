import React from 'react';
import { ChevronDown, Globe2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = () => {
  const { language, languages, setLanguage, t } = useLanguage();
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100">
      <Globe2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
      <span className="hidden sm:inline">{t('language')}</span>
      <div className="relative">
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="appearance-none bg-transparent pr-8 text-sm font-semibold text-slate-700 outline-none dark:text-slate-100"
          aria-label={t('language')}
        >
          {languages.map((item) => (
            <option
              key={item.code}
              value={item.code}
              className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
            >
              {t(item.labelKey)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-300" />
      </div>
    </div>
  );
};

export default LanguageSelector;
