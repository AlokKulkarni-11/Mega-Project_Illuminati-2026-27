import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error';
  text: string;
}

interface ToastContextType {
  showToast: (text: string, type?: 'info' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto border px-4 py-2.5 text-xs font-medium max-w-sm shadow-sm transition-all ${
              t.type === 'error'
                ? 'bg-paper-inset border-loss text-loss'
                : t.type === 'success'
                ? 'bg-paper-inset border-gain text-gain'
                : 'bg-paper-inset border-rule text-ink'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className={`w-1.5 h-1.5 rounded-full ${
                t.type === 'error' ? 'bg-loss' : t.type === 'success' ? 'bg-gain' : 'bg-brass'
              }`} />
              <span>{t.text}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};
