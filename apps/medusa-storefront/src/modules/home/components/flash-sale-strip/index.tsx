"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"

// Sale end: next midnight UTC from the time this component mounts
function getSaleEnd() {
  const d = new Date()
  d.setUTCHours(24, 0, 0, 0)
  return d
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export default function FlashSaleStrip() {
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const [timeLeft, setTimeLeft] = useState({ h: "00", m: "00", s: "00" })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const end = getSaleEnd()

    const tick = () => {
      const diff = Math.max(0, end.getTime() - Date.now())
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft({ h: pad(h), m: pad(m), s: pad(s) })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) return null

  return (
    <section className="content-container py-3">
      <div
        className="flex flex-col gap-4 overflow-hidden rounded-2xl px-6 py-5 small:flex-row small:items-center small:justify-between"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: "4px solid var(--coral)",
        }}
      >
        {/* Left: label */}
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
            style={{
              background: "linear-gradient(135deg, var(--coral), var(--coral-dim))",
              color: "#fff",
            }}
          >
            ⚡ {t("flashSaleLabel")}
          </span>
          <p className="font-syne text-base font-bold" style={{ color: "var(--text)" }}>
            {t("flashSaleDealsEndIn")}
          </p>
        </div>

        {/* Countdown blocks */}
        <div className="flex items-center gap-2">
          {[
            { val: timeLeft.h, label: t("flashSaleHrs") },
            { val: timeLeft.m, label: t("flashSaleMin") },
            { val: timeLeft.s, label: t("flashSaleSec") },
          ].map((block, i) => (
            <div key={block.label} className="flex items-center gap-2">
              <div
                className="flex flex-col items-center justify-center rounded-xl px-4 py-2 min-w-[56px]"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--glow-teal)",
                }}
              >
                <span
                  className="font-syne text-2xl font-black tabular-nums"
                  style={{ color: "var(--teal)" }}
                >
                  {block.val}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-dim)" }}
                >
                  {block.label}
                </span>
              </div>
              {i < 2 && (
                <span
                  className="font-syne text-xl font-black"
                  style={{ color: "var(--coral)" }}
                >
                  :
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Right: CTA */}
        <LocalizedClientLink href="/store" className="btn-primary text-sm shrink-0">
          {t("flashSaleShopDeals")}
        </LocalizedClientLink>
      </div>
    </section>
  )
}
