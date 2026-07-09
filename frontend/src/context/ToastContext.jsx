import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = (title, message) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 3200);
  };

  const value = useMemo(() => ({ toast, showToast }), [toast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext);
}
