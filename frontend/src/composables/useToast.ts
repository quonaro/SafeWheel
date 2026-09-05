import { toast as sonnerToast } from "vue-sonner";

const COOLDOWN_MS = 3000;
let lastShownAt = 0;

function canShow(): boolean {
  const now = Date.now();
  if (now - lastShownAt < COOLDOWN_MS) {
    return false;
  }
  lastShownAt = now;
  return true;
}

function throttled<F extends (...args: any[]) => any>(fn: F): F {
  return ((...args: Parameters<F>) => {
    if (!canShow()) return;
    return fn(...args);
  }) as F;
}

export const toast = Object.assign(throttled(sonnerToast), {
  success: throttled(sonnerToast.success),
  error: throttled(sonnerToast.error),
  info: throttled(sonnerToast.info),
  warning: throttled(sonnerToast.warning),
  message: throttled(sonnerToast.message),
  custom: throttled(sonnerToast.custom),
  loading: throttled(sonnerToast.loading),
  promise: throttled(sonnerToast.promise),
  dismiss: sonnerToast.dismiss,
  getHistory: sonnerToast.getHistory,
  getToasts: sonnerToast.getToasts,
}) as typeof sonnerToast;
