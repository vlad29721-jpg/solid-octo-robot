import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastState = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (item) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts, { ...item, id }].slice(-4) }));
    if (typeof window !== "undefined") {
      window.setTimeout(() => useToastStore.getState().dismiss(id), 4600);
    }
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

function baseToast(item: Omit<ToastItem, "id">): string {
  return useToastStore.getState().push(item);
}

export const toast = Object.assign(baseToast, {
  success: (title: string, description?: string) => baseToast({ title, description, variant: "success" }),
  error: (title: string, description?: string) => baseToast({ title, description, variant: "error" }),
  info: (title: string, description?: string) => baseToast({ title, description, variant: "info" }),
});
