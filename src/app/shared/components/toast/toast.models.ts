export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastConfig {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms; default 4000; 0 = manual dismiss only
}
