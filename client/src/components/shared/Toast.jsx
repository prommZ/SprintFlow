import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up min-w-[300px] max-w-[420px]',
              t.type === 'success' && 'bg-card border-success/30',
              t.type === 'error' && 'bg-card border-danger/30',
              t.type === 'info' && 'bg-card border-accent/30'
            )}
          >
            {t.type === 'success' && <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-accent flex-shrink-0" />}
            <p className="text-sm text-foreground flex-1">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
