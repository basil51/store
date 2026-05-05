"use client"

import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy } from "@lib/ui-copy"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

// ─── Types ─────────────────────────────────────────────────────────────────

export type ToastVariant = "teal" | "coral" | "amber"

export type ToastItem = {
  id: string
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
}

// ─── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

// ─── Individual Toast ───────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, React.CSSProperties> = {
  teal: {
    background: "rgba(0,229,200,0.12)",
    border: "1px solid var(--teal)",
    color: "var(--teal)",
  },
  coral: {
    background: "rgba(255,94,98,0.12)",
    border: "1px solid var(--coral)",
    color: "var(--coral)",
  },
  amber: {
    background: "rgba(255,203,71,0.12)",
    border: "1px solid var(--amber)",
    color: "var(--amber)",
  },
}

const VARIANT_ICONS: Record<ToastVariant, string> = {
  teal: "✓",
  coral: "♥",
  amber: "⚠",
}

function Toast({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: string) => void
}) {
  const locale = useUiLocale()

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...VARIANT_STYLES[item.variant],
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 16px",
        borderRadius: 12,
        backdropFilter: "blur(16px)",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        animation: "toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        minWidth: 220,
        maxWidth: 340,
        cursor: "default",
      }}
    >
      <span
        style={{
          fontSize: 15,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {VARIANT_ICONS[item.variant]}
      </span>
      <span style={{ flex: 1 }}>{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        aria-label={getUiCopy(locale, "commonDismiss")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          opacity: 0.6,
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}

// ─── Portal ─────────────────────────────────────────────────────────────────

function ToastPortalInner({ items, onDismiss }: {
  items: ToastItem[]
  onDismiss: (id: string) => void
}) {
  const locale = useUiLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <div
      aria-label={getUiCopy(locale, "toastNotifications")}
      style={{
        position: "fixed",
        bottom: 28,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: items.length ? "auto" : "none",
      }}
    >
      {items.map((item) => (
        <Toast key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  )
}

// ─── Provider ───────────────────────────────────────────────────────────────

const TIMEOUT_MS = 3500

let idCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = "teal") => {
      const id = `toast-${++idCounter}`
      setItems((prev) => [...prev, { id, message, variant }])
      const timer = setTimeout(() => dismiss(id), TIMEOUT_MS)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastPortalInner items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
