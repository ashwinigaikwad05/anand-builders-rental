import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        onDismiss(toasts[0].id);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-auto">
      {toasts.map((toast) => {
        let bgClass = 'bg-slate-900 text-white border-slate-750';
        let icon = <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />;

        if (toast.type === 'success') {
          bgClass = 'bg-slate-900 text-white border-emerald-500/30';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
        } else if (toast.type === 'error') {
          bgClass = 'bg-slate-900 text-white border-rose-500/30';
          icon = <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start justify-between p-4 rounded-2xl border shadow-xl backdrop-blur-md animate-slideUp text-left transition-all ${bgClass}`}
          >
            <div className="flex items-start gap-3">
              {icon}
              <p className="text-xs sm:text-sm font-semibold leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors ml-2 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
