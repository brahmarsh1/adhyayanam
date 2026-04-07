import { useEffect, useState, useCallback } from "react";
import { create } from "zustand";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "info" | "error";
  exiting?: boolean;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, type?: "success" | "info" | "error") => void;
  remove: (id: number) => void;
  markExiting: (id: number) => void;
}

let nextId = 0;

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = "success") => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 200);
    }, 2500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  markExiting: (id) =>
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    })),
}));

const icons = {
  success: "\u2713",
  info: "\u2139",
  error: "\u2717",
};

const colors = {
  success: "bg-green-800 text-green-50",
  info: "bg-amber-800 text-amber-50",
  error: "bg-red-800 text-red-50",
};

export default function ToastContainer() {
  const toasts = useToast((s) => s.toasts);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${colors[toast.type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium ${
            toast.exiting ? "animate-toast-out" : "animate-toast-in"
          }`}
        >
          <span className="text-lg">{icons[toast.type]}</span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
