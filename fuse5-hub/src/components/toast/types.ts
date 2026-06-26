// Shared types for the app-wide toast system.

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  /** Auto-dismiss delay in ms. Pass 0 (or a falsy value) to disable auto-dismiss. Default 4500. */
  duration?: number;
  /** Optional secondary line shown under the main message. */
  description?: string;
}

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  duration: number;
}

export interface ToastApi {
  /** Show a success (green) toast. Returns the toast id. */
  success: (message: string, opts?: ToastOptions) => string;
  /** Show an error (red) toast. Returns the toast id. */
  error: (message: string, opts?: ToastOptions) => string;
  /** Show an info (teal) toast. Returns the toast id. */
  info: (message: string, opts?: ToastOptions) => string;
  /** Imperatively dismiss a toast by id. */
  dismiss: (id: string) => void;
}
