"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  function remove(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const STYLES: Record<ToastType, { wrap: string; icon: string; Icon: React.ElementType }> = {
  success: {
    wrap: "bg-white ring-green-200 dark:bg-gray-900 dark:ring-green-800",
    icon: "text-green-500",
    Icon: CheckCircle,
  },
  error: {
    wrap: "bg-white ring-red-200 dark:bg-gray-900 dark:ring-red-800",
    icon: "text-red-500",
    Icon: AlertCircle,
  },
  info: {
    wrap: "bg-white ring-gray-200 dark:bg-gray-900 dark:ring-gray-700",
    icon: "text-indigo-500",
    Icon: Info,
  },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { wrap, icon, Icon } = STYLES[toast.type];
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ring-1 ${wrap}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} />
      <p className="flex-1 text-sm text-gray-800 dark:text-gray-200">{toast.message}</p>
      <button
        onClick={onClose}
        className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
