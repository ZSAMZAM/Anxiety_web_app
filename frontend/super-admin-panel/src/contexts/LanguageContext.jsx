import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from '../locales/en.json';
import so from '../locales/so.json';
import { installDomTranslator } from '../utils/domTranslation';

const STORAGE_KEY = 'anxietycare-language';
const dictionaries = { en, so };
const languages = [
  { code: 'en', labelKey: 'english' },
  { code: 'so', labelKey: 'somali' },
];

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return dictionaries[stored] ? stored : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    return installDomTranslator({
      language,
      phrases: dictionaries[language]?.phrases || {},
    });
  }, [language]);

  const t = (key, fallback) => dictionaries[language]?.[key] || dictionaries.en[key] || fallback || key;
  const setLanguage = (code) => {
    if (dictionaries[code]) setLanguageState(code);
  };
  const value = useMemo(() => ({ language, languages, setLanguage, t }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
