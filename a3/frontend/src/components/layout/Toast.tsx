"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info", title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const value: ToastContextType = {
    toast: addToast,
    success: (msg, title) => addToast(msg, "success", title),
    error: (msg, title) => addToast(msg, "error", title),
    info: (msg, title) => addToast(msg, "info", title),
    warning: (msg, title) => addToast(msg, "warning", title),
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-[var(--accent-emerald)] text-[var(--accent-emerald)]";
      case "error":
        return "border-red-500 text-red-400";
      case "warning":
        return "border-amber-500 text-amber-400";
      default:
        return "border-[var(--accent-blue)] text-[var(--accent-blue)]";
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      default:
        return "ℹ";
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-[rgba(10,14,26,0.92)] border backdrop-blur-xl shadow-2xl animate-fade-in-up transition-all ${getBorderColor(
              t.type
            )}`}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold shrink-0">
              {getIcon(t.type)}
            </span>
            <div className="flex-1 min-w-0">
              {t.title && <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-0.5">{t.title}</h4>}
              <p className="text-xs text-gray-200 leading-relaxed break-words">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-white transition-colors text-sm shrink-0 cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
