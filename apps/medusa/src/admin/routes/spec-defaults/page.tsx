import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

// ─── Sidebar icon ──────────────────────────────────────────────────────────────
const SpecIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
)

// Keep in sync with the list in product-metadata-widget.tsx
const TEMPLATES = [
  { id: "display",         label: "Display",         description: "Screen / panel specs" },
  { id: "dimensions",      label: "Dimensions",      description: "Physical size & weight" },
  { id: "performance",     label: "Performance",     description: "Processor, RAM, storage…" },
  { id: "finish-and-options", label: "Finish & Options", description: "Color, size, material" },
]

type TypeDefaultsMap = Record<string, string[]>

type ProductType = { id: string; value: string }

function SpecDefaultsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState("")
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [defaultsMap, setDefaultsMap] = useState<TypeDefaultsMap>({})
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  function showToast(type: "ok" | "err", text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [storeRes, typesRes] = await Promise.all([
        fetch("/admin/stores", { credentials: "include" }),
        fetch("/admin/product-types?limit=200", { credentials: "include" }),
      ])
      const storeData = await storeRes.json()
      const typesData = await typesRes.json()

      const store = Array.isArray(storeData.stores) ? storeData.stores[0] : storeData.store
      if (store) {
        setStoreId(store.id)
        const meta = (store.metadata ?? {}) as Record<string, unknown>
        const saved = meta.specification_template_defaults_by_type
        setDefaultsMap(isValidMap(saved) ? (saved as TypeDefaultsMap) : {})
      }

      const types: ProductType[] = Array.isArray(typesData.product_types)
        ? typesData.product_types
        : []
      setProductTypes(types)
    } catch {
      showToast("err", "Could not load store data")
    } finally {
      setLoading(false)
    }
  }

  function isValidMap(v: unknown): v is TypeDefaultsMap {
    return !!v && typeof v === "object" && !Array.isArray(v)
  }

  function toggle(typeValue: string, templateId: string) {
    setDefaultsMap((prev) => {
      const current = prev[typeValue] ?? []
      const next = current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId]
      return { ...prev, [typeValue]: next }
    })
  }

  async function handleSave() {
    if (!storeId) return
    setSaving(true)
    try {
      // Strip types with no defaults to keep metadata clean
      const cleaned: TypeDefaultsMap = {}
      for (const [type, ids] of Object.entries(defaultsMap)) {
        if (ids.length) cleaned[type] = ids
      }
      const res = await fetch(`/admin/stores/${storeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata: { specification_template_defaults_by_type: cleaned },
        }),
      })
      if (res.ok) {
        showToast("ok", "Global spec defaults saved!")
      } else {
        showToast("err", "Save failed — check console")
      }
    } catch {
      showToast("err", "Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Specification Template Defaults</h1>
          <p style={subtitleStyle}>
            Choose which spec templates are suggested by default for each product
            type. These global defaults are merged with any per-product overrides
            set on individual products. Saved to store metadata as{" "}
            <code style={codeStyle}>specification_template_defaults_by_type</code>.
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af", padding: "20px 0" }}>Loading…</p>
      ) : productTypes.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            No product types found. Create product types in{" "}
            <strong>Products → Types</strong> first, then come back here to
            assign template defaults.
          </p>
        </div>
      ) : (
        <>
          <div style={tableStyle}>
            {/* Header row */}
            <div style={theadStyle}>
              <div style={{ ...cellStyle, flex: "0 0 180px", fontWeight: 700 }}>Product Type</div>
              {TEMPLATES.map((t) => (
                <div key={t.id} style={{ ...cellStyle, flex: 1, fontWeight: 700 }}>
                  {t.label}
                  <span style={descStyle}>{t.description}</span>
                </div>
              ))}
            </div>

            {/* Data rows */}
            {productTypes.map((pt) => {
              const selected = defaultsMap[pt.value] ?? []
              return (
                <div key={pt.id} style={rowStyle}>
                  <div style={{ ...cellStyle, flex: "0 0 180px" }}>
                    <span style={typeNameStyle}>{pt.value}</span>
                  </div>
                  {TEMPLATES.map((t) => {
                    const active = selected.includes(t.id)
                    return (
                      <div key={t.id} style={{ ...cellStyle, flex: 1, justifyContent: "center" }}>
                        <button
                          onClick={() => toggle(pt.value, t.id)}
                          style={active ? activeToggleStyle : toggleStyle}
                          title={active ? "Remove default" : "Set as default"}
                        >
                          {active ? "✓ Default" : "Off"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div style={footerStyle}>
            <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
              {saving ? "Saving…" : "Save global defaults"}
            </button>
            {toast && (
              <span style={{ fontSize: 13, color: toast.type === "ok" ? "#059669" : "#dc2626", fontWeight: 500 }}>
                {toast.text}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  padding: "28px 32px",
  maxWidth: 900,
  fontFamily: "Inter, system-ui, sans-serif",
}

const headerStyle: React.CSSProperties = { marginBottom: 28 }

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 8,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  lineHeight: 1.65,
  maxWidth: 620,
}

const codeStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  background: "#f3f4f6",
  padding: "1px 5px",
  borderRadius: 4,
  color: "#374151",
}

const emptyStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "20px 24px",
}

const tableStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  overflow: "hidden",
  marginBottom: 24,
}

const theadStyle: React.CSSProperties = {
  display: "flex",
  background: "#f3f4f6",
  borderBottom: "1px solid #e5e7eb",
  padding: "0 16px",
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  padding: "0 16px",
  borderBottom: "1px solid #f3f4f6",
}

const cellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "12px 8px",
  fontSize: 13,
  color: "#111827",
}

const descStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
  fontWeight: 400,
  marginTop: 2,
}

const typeNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#111827",
}

const toggleStyle: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "none",
  color: "#9ca3af",
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 500,
  whiteSpace: "nowrap",
}

const activeToggleStyle: React.CSSProperties = {
  ...toggleStyle,
  background: "#111827",
  color: "#fff",
  border: "1px solid #111827",
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

export const config = defineRouteConfig({
  label: "Spec Defaults",
  icon: SpecIcon,
})

export default SpecDefaultsPage
