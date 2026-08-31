"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, Info, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info" | "loading"

export type Toast = {
  id: string
  message: string
  description?: string
  type: ToastType
  duration?: number
}

type ToastContextType = {
  toasts: Toast[]
  toast: (options: { message: string; description?: string; type?: ToastType; duration?: number }) => string
  dismiss: (id: string) => void
  success: (message: string, description?: string) => string
  error: (message: string, description?: string) => string
  info: (message: string, description?: string) => string
  loading: (message: string, description?: string) => string
}

const ToastContext = React.createContext<ToastContextType | null>(null)

let toastFn: ((options: { message: string; description?: string; type?: ToastType; duration?: number }) => string) | null = null

export const toast = {
  show: (message: string, options?: { description?: string; type?: ToastType; duration?: number }) => {
    if (toastFn) return toastFn({ message, ...options })
    return ""
  },
  success: (message: string, description?: string) => {
    if (toastFn) return toastFn({ message, description, type: "success", duration: 3500 })
    return ""
  },
  error: (message: string, description?: string) => {
    if (toastFn) return toastFn({ message, description, type: "error", duration: 4500 })
    return ""
  },
  info: (message: string, description?: string) => {
    if (toastFn) return toastFn({ message, description, type: "info", duration: 3500 })
    return ""
  },
  loading: (message: string, description?: string) => {
    if (toastFn) return toastFn({ message, description, type: "loading", duration: 10000 })
    return ""
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = React.useCallback(
    ({
      message,
      description,
      type = "info",
      duration = 3500,
    }: {
      message: string
      description?: string
      type?: ToastType
      duration?: number
    }) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: Toast = { id, message, description, type, duration }
      setToasts((prev) => [...prev.slice(-4), newToast])

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }

      return id
    },
    [dismiss]
  )

  React.useEffect(() => {
    toastFn = addToast
    return () => {
      toastFn = null
    }
  }, [addToast])

  const contextValue: ToastContextType = React.useMemo(
    () => ({
      toasts,
      toast: addToast,
      dismiss,
      success: (msg, desc) => addToast({ message: msg, description: desc, type: "success" }),
      error: (msg, desc) => addToast({ message: msg, description: desc, type: "error" }),
      info: (msg, desc) => addToast({ message: msg, description: desc, type: "info" }),
      loading: (msg, desc) => addToast({ message: msg, description: desc, type: "loading", duration: 8000 }),
    }),
    [toasts, addToast, dismiss]
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    return {
      toast: (opts: any) => toast.show(opts.message, opts),
      success: toast.success,
      error: toast.error,
      info: toast.info,
      loading: toast.loading,
      dismiss: () => {},
    }
  }
  return context
}

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-0 bottom-0 z-50 flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm sm:bottom-4 sm:right-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4",
            t.type === "success" && "border-emerald-500/30 bg-card/95 text-foreground shadow-emerald-500/10",
            t.type === "error" && "border-destructive/40 bg-card/95 text-foreground shadow-destructive/10",
            t.type === "info" && "border-primary/30 bg-card/95 text-foreground shadow-primary/10",
            t.type === "loading" && "border-primary/40 bg-card/95 text-foreground"
          )}
        >
          <div className="mt-0.5 shrink-0">
            {t.type === "success" && <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />}
            {t.type === "error" && <AlertCircle className="size-5 text-destructive" />}
            {t.type === "info" && <Info className="size-5 text-primary" />}
            {t.type === "loading" && <Loader2 className="size-5 animate-spin text-primary" />}
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight text-foreground">{t.message}</p>
            {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
          </div>

          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
