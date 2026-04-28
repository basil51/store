import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useState, useEffect } from "react"

// ─── Sidebar icon ─────────────────────────────────────────────────────────────
const TickerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    width={16}
    height={16}
  >
    <path d="M2 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zm0 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zm0 5a1 1 0 011-1h8a1 1 0 110 2H3a1 1 0 01-1-1z" />
  </svg>
)

const DEFAULT_MESSAGES = [
  "🚀 Free shipping on orders over $99",
  "⚡ Flash deals updated daily — don't miss out",
  "🎮 New gaming peripherals just dropped",
  "💻 Up to 40% off laptops this week",
  "🔒 Secure checkout · 30-day returns · 2-year warranty",
  "📦 Same-day dispatch on in-stock orders before 3 PM",
  "🌍 International shipping available",
  "💡 Tip: use your account to track orders in real time",
]

function TickerPage() {
  const [messages, setMessages] = useState<string[]>([])
  const [newMsg, setNewMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState("")
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    fetchStore()
  }, [])

  function showToast(type: "ok" | "err", text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  async function fetchStore() {
    setLoading(true)
    try {
      const res = await fetch("/admin/stores", { credentials: "include" })
      const data = await res.json()
      // Medusa v2 returns { stores: [...] }
      const store = Array.isArray(data.stores) ? data.stores[0] : data.store
      if (store) {
        setStoreId(store.id)
        const meta = (store.metadata ?? {}) as Record<string, unknown>
        const saved = Array.isArray(meta.ticker_messages)
          ? (meta.ticker_messages as unknown[]).filter((m): m is string => typeof m === "string")
          : []
        setMessages(saved.length ? saved : DEFAULT_MESSAGES)
      }
    } catch {
      showToast("err", "Could not load store data")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!storeId) return
    setSaving(true)
    try {
      const res = await fetch(`/admin/stores/${storeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ metadata: { ticker_messages: messages } }),
      })
      if (res.ok) {
        showToast("ok", "Ticker messages saved to store!")
      } else {
        showToast("err", "Save failed — check console")
      }
    } catch {
      showToast("err", "Network error")
    } finally {
      setSaving(false)
    }
  }

  function addMessage() {
    const trimmed = newMsg.trim()
    if (trimmed && !messages.includes(trimmed)) {
      setMessages((prev) => [...prev, trimmed])
      setNewMsg("")
    }
  }

  function removeMessage(i: number) {
    setMessages((prev) => prev.filter((_, idx) => idx !== i))
  }

  function moveUp(i: number) {
    if (i === 0) return
    setMessages((prev) => {
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }

  function moveDown(i: number) {
    setMessages((prev) => {
      if (i === prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next
    })
  }

  function resetToDefaults() {
    if (confirm("Reset to default messages?")) {
      setMessages(DEFAULT_MESSAGES)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Ticker Messages</h1>
          <p style={subtitleStyle}>
            Manage the scrolling announcement bar at the top of the storefront.
            Changes are saved to store metadata and take effect on the next page
            load (up to 60 s cache).
          </p>
        </div>
        <button onClick={resetToDefaults} style={ghostBtnStyle}>
          Reset defaults
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af", padding: "20px 0" }}>Loading store data…</p>
      ) : (
        <>
          {/* Message list */}
          <div style={listStyle}>
            {messages.length === 0 && (
              <p style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>
                No messages yet. Add one below.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={rowStyle}>
                <span style={rowIndexStyle}>{i + 1}</span>
                <span style={rowTextStyle}>{msg}</span>
                <div style={rowActionsStyle}>
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    style={iconBtnStyle}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === messages.length - 1}
                    style={iconBtnStyle}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeMessage(i)}
                    style={{ ...iconBtnStyle, color: "#dc2626" }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new */}
          <div style={addRowStyle}>
            <input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMessage()}
              placeholder="🔥 Add a new ticker message and press Enter…"
              style={inputStyle}
            />
            <button onClick={addMessage} style={addBtnStyle}>
              Add
            </button>
          </div>

          {/* Save */}
          <div style={footerStyle}>
            <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
              {saving ? "Saving…" : "Save to store"}
            </button>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
            {toast && (
              <span
                style={{
                  fontSize: 13,
                  color: toast.type === "ok" ? "#059669" : "#dc2626",
                  fontWeight: 500,
                }}
              >
                {toast.text}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  padding: "28px 32px",
  maxWidth: 760,
  fontFamily: "Inter, system-ui, sans-serif",
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 24,
  gap: 16,
}

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 6,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  lineHeight: 1.6,
  maxWidth: 520,
}

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 16,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "8px 0",
  minHeight: 48,
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "7px 12px",
  borderRadius: 6,
  transition: "background 0.15s",
}

const rowIndexStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
  fontWeight: 600,
  minWidth: 20,
  textAlign: "right",
}

const rowTextStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 13,
  color: "#111827",
}

const rowActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
}

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #e5e7eb",
  borderRadius: 4,
  padding: "2px 6px",
  fontSize: 12,
  cursor: "pointer",
  color: "#374151",
  lineHeight: 1.4,
}

const addRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 20,
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  height: 36,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  background: "#fff",
  color: "#111827",
  outline: "none",
}

const addBtnStyle: React.CSSProperties = {
  padding: "0 18px",
  height: 36,
  background: "#374151",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
}

const footerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
}

const saveBtnStyle: React.CSSProperties = {
  padding: "8px 22px",
  background: "#111827",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

const ghostBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  background: "none",
  color: "#6b7280",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
}

export const config = defineRouteConfig({
  label: "Ticker",
  icon: TickerIcon,
})

export default TickerPage
