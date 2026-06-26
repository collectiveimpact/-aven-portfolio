"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Toast, ToastApi, ToastOptions, ToastVariant } from "./types";

const DEFAULT_DURATION = 4500;

const ToastContext = createContext<ToastApi | null>(null);

/**
 * useToast() — call from any client component below <ToastProvider>.
 *
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error("Could not save", { description: "Network error" });
 *   toast.info("Sync started", { duration: 0 }); // 0 = no auto-dismiss
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used within a <ToastProvider>.");
  }
  return ctx;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `f5-toast-${Date.now()}-${counter}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Track auto-dismiss timers so we can clear them on manual close / unmount.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string, opts?: ToastOptions): string => {
      const id = nextId();
      const duration = opts?.duration ?? DEFAULT_DURATION;
      const toast: Toast = {
        id,
        variant,
        message,
        description: opts?.description,
        duration,
      };
      setToasts((prev) => [...prev, toast]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  // Clear any pending timers if the provider unmounts.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, opts) => push("success", message, opts),
      error: (message, opts) => push("error", message, opts),
      info: (message, opts) => push("info", message, opts),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const VARIANT_META: Record<
  ToastVariant,
  { accent: string; icon: string; label: string }
> = {
  success: { accent: "var(--f5-green)", icon: "✓", label: "Success" },
  error: { accent: "var(--f5-red)", icon: "✕", label: "Error" },
  info: { accent: "var(--f5-teal)", icon: "ℹ", label: "Info" },
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      // role=status + aria-live=polite so screen readers announce new toasts
      // without stealing focus. aria-atomic keeps each announcement self-contained.
      role="status"
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "min(380px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [entered, setEntered] = useState(false);
  const meta = VARIANT_META[toast.variant];

  useEffect(() => {
    // Next frame → trigger the slide-in transition.
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        pointerEvents: "auto",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        background: "var(--f5-surface-2)",
        color: "var(--f5-text)",
        border: "1px solid var(--f5-border)",
        borderLeft: `3px solid ${meta.accent}`,
        borderRadius: "var(--f5-radius-sm)",
        boxShadow: "var(--f5-shadow-lg)",
        transform: entered ? "translateX(0)" : "translateX(calc(100% + 24px))",
        opacity: entered ? 1 : 0,
        transition:
          "transform 280ms var(--f5-ease, cubic-bezier(.4,0,.2,1)), opacity 280ms var(--f5-ease, cubic-bezier(.4,0,.2,1))",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 20,
          height: 20,
          marginTop: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
          color: meta.accent,
          background: "color-mix(in srgb, var(--f5-surface-3) 70%, transparent)",
        }}
      >
        {meta.icon}
      </span>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            lineHeight: 1.35,
            wordBreak: "break-word",
          }}
        >
          {toast.message}
        </div>
        {toast.description ? (
          <div
            style={{
              marginTop: 3,
              fontSize: 12.5,
              lineHeight: 1.4,
              color: "var(--f5-text-muted)",
              wordBreak: "break-word",
            }}
          >
            {toast.description}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={`Dismiss ${meta.label.toLowerCase()} notification`}
        style={{
          flex: "0 0 auto",
          appearance: "none",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--f5-text-muted)",
          fontSize: 16,
          lineHeight: 1,
          padding: 2,
          marginTop: -1,
          borderRadius: 6,
        }}
      >
        ×
      </button>
    </div>
  );
}
