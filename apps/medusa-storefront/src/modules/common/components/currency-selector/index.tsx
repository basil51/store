"use client"

import { useState, useRef, useEffect } from "react"
import { useCurrency } from "@lib/context/currency-context"

export default function CurrencySelector() {
  const { currency, setCurrency, availableCurrencies } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const current = availableCurrencies.find((c) => c.code === currency) ?? availableCurrencies[0]
  if (!current || availableCurrencies.length <= 1) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all"
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: "var(--teal)",
          minWidth: 72,
        }}
        aria-label="Select display currency"
      >
        <span>{current.symbol}</span>
        <span style={{ color: "var(--text)" }}>{current.code}</span>
        <svg
          className="w-3 h-3 shrink-0"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            marginInlineStart: "0.125rem",
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute mt-1.5 rounded-xl overflow-hidden z-50 shadow-xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            minWidth: 140,
            insetInlineEnd: 0,
          }}
        >
          {availableCurrencies.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setCurrency(c.code)
                setOpen(false)
              }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm [text-align:start] transition-all"
              style={{
                background:
                  c.code === currency ? "var(--surface2)" : "transparent",
                color: c.code === currency ? "var(--teal)" : "var(--text)",
                fontWeight: c.code === currency ? 700 : 400,
              }}
            >
              <span className="w-5 text-center font-mono">{c.symbol}</span>
              <span>{c.code}</span>
              {c.code === currency && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  style={{ color: "var(--teal)", marginInlineStart: "auto" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
          <div
            className="px-4 py-2 text-xs"
            style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
          >
            Display only · prices in ₪
          </div>
        </div>
      )}
    </div>
  )
}
