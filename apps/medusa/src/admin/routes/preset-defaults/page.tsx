import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState } from "react"

import {
  AdminRouteAccessNotice,
  useAdminRouteAccess,
} from "../../lib/admin-route-access"

const PRESET_DEFAULTS_REQUIRED_PERMISSIONS = ["catalog.manage", "settings.manage"] as const

type ProductType = { id: string; value: string }

type VariantCombinationEntry = {
  title: string
  summary?: string
  badge?: string
  is_default?: boolean
  option_values: Record<string, string>
}

type VariantCombinationDefaultsByType = Record<string, VariantCombinationEntry[]>

type ToastState = {
  type: "ok" | "err"
  text: string
} | null

const PresetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
    <path d="M10 2a1 1 0 01.894.553l2.382 4.83 5.33.775a1 1 0 01.554 1.706l-3.856 3.758.91 5.308a1 1 0 01-1.45 1.054L10 17.48l-4.764 2.504a1 1 0 01-1.45-1.054l.91-5.308L.84 9.864a1 1 0 01.554-1.706l5.33-.775 2.382-4.83A1 1 0 0110 2z" />
  </svg>
)

const EXAMPLE_VALUE = JSON.stringify(
  [
    {
      title: "Everyday setup",
      badge: "Best value",
      is_default: true,
      summary: "Balanced configuration for most shoppers",
      option_values: {
        Color: "Black",
        Size: "M",
      },
    },
  ],
  null,
  2
)

function normalizeVariantCombinationArray(value: unknown) {
  if (value == null) {
    return { value: [] as VariantCombinationEntry[], error: null }
  }

  if (!Array.isArray(value)) {
    return {
      value: [] as VariantCombinationEntry[],
      error: "Each preset default must be a JSON array.",
    }
  }

  const normalized: VariantCombinationEntry[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each preset default entry must be an object.",
      }
    }

    const record = entry as Record<string, unknown>
    const title = typeof record.title === "string" ? record.title.trim() : ""
    const summary = typeof record.summary === "string" ? record.summary.trim() : ""
    const badge = typeof record.badge === "string" ? record.badge.trim() : ""

    if (!title) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each preset default needs a non-empty title.",
      }
    }

    if (
      !record.option_values ||
      typeof record.option_values !== "object" ||
      Array.isArray(record.option_values)
    ) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each preset default needs an option_values object.",
      }
    }

    const optionValues = Object.entries(record.option_values).reduce<Record<string, string>>(
      (acc, [key, currentValue]) => {
        if (typeof currentValue !== "string") {
          return acc
        }

        const normalizedKey = key.trim()
        const normalizedValue = currentValue.trim()

        if (normalizedKey && normalizedValue) {
          acc[normalizedKey] = normalizedValue
        }

        return acc
      },
      {}
    )

    if (!Object.keys(optionValues).length) {
      return {
        value: [] as VariantCombinationEntry[],
        error: "Each preset default needs at least one option value.",
      }
    }

    normalized.push({
      title,
      ...(summary ? { summary } : {}),
      ...(badge ? { badge } : {}),
      ...(record.is_default === true ? { is_default: true } : {}),
      option_values: optionValues,
    })
  }

  let didAssignDefault = false

  return {
    value: normalized.map((entry) => {
      if (!entry.is_default) {
        return entry
      }

      if (!didAssignDefault) {
        didAssignDefault = true
        return entry
      }

      return {
        ...entry,
        is_default: undefined,
      }
    }),
    error: null,
  }
}

function normalizeVariantCombinationDefaultsByType(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as VariantCombinationDefaultsByType
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    VariantCombinationDefaultsByType
  >((acc, [type, currentValue]) => {
    const parsed = normalizeVariantCombinationArray(currentValue)

    if (parsed.value.length) {
      acc[type] = parsed.value
    }

    return acc
  }, {})
}

function PresetDefaultsPage() {
  const pageSubtitle = (
    <>
      Save reusable preset combinations at the store level by product type.
      Products without their own <code style={codeStyle}>metadata.variant_combinations</code>
      automatically fall back to these defaults on the PDP.
    </>
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState("")
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [defaultsMap, setDefaultsMap] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState>(null)
  const access = useAdminRouteAccess(PRESET_DEFAULTS_REQUIRED_PERMISSIONS)

  useEffect(() => {
    if (!access.hasAccess) {
      return
    }

    void loadAll()
  }, [access.hasAccess])

  function showToast(type: "ok" | "err", text: string) {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3500)
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
        const savedDefaults = normalizeVariantCombinationDefaultsByType(
          meta.variant_combination_defaults_by_type
        )
        setDefaultsMap(
          Object.fromEntries(
            Object.entries(savedDefaults).map(([type, value]) => [
              type,
              JSON.stringify(value, null, 2),
            ])
          )
        )
      }

      const types: ProductType[] = Array.isArray(typesData.product_types)
        ? typesData.product_types
        : []
      setProductTypes(types)
    } catch {
      showToast("err", "Could not load preset defaults")
    } finally {
      setLoading(false)
    }
  }

  const sortedProductTypes = useMemo(
    () => [...productTypes].sort((left, right) => left.value.localeCompare(right.value)),
    [productTypes]
  )

  if (access.loading || access.error || !access.hasAccess) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Preset Defaults</h1>
            <p style={subtitleStyle}>{pageSubtitle}</p>
          </div>
        </div>
        <AdminRouteAccessNotice
          access={access}
          requiredPermissions={PRESET_DEFAULTS_REQUIRED_PERMISSIONS}
        />
      </div>
    )
  }

  function updateTypeValue(typeValue: string, nextValue: string) {
    setDefaultsMap((current) => ({
      ...current,
      [typeValue]: nextValue,
    }))

    setErrors((current) => {
      if (!(typeValue in current)) {
        return current
      }

      const nextErrors = { ...current }
      delete nextErrors[typeValue]
      return nextErrors
    })
  }

  function formatTypeDefaults(typeValue: string) {
    setDefaultsMap((current) => ({
      ...current,
      [typeValue]: EXAMPLE_VALUE,
    }))

    setErrors((current) => {
      if (!(typeValue in current)) {
        return current
      }

      const nextErrors = { ...current }
      delete nextErrors[typeValue]
      return nextErrors
    })
  }

  async function handleSave() {
    if (!storeId) {
      return
    }

    const nextErrors: Record<string, string> = {}
    const cleaned: VariantCombinationDefaultsByType = {}

    for (const productType of sortedProductTypes) {
      const rawValue = defaultsMap[productType.value]?.trim()

      if (!rawValue) {
        continue
      }

      let parsedJson: unknown

      try {
        parsedJson = JSON.parse(rawValue)
      } catch {
        nextErrors[productType.value] = "Invalid JSON."
        continue
      }

      const normalized = normalizeVariantCombinationArray(parsedJson)

      if (normalized.error) {
        nextErrors[productType.value] = normalized.error
        continue
      }

      if (normalized.value.length) {
        cleaned[productType.value] = normalized.value
      }
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) {
      showToast("err", "Fix preset default validation errors before saving")
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`/admin/stores/${storeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata: {
            variant_combination_defaults_by_type: cleaned,
          },
        }),
      })

      if (res.ok) {
        showToast("ok", "Global preset defaults saved")
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
          <h1 style={titleStyle}>Preset Defaults</h1>
          <p style={subtitleStyle}>{pageSubtitle}</p>
        </div>
      </div>

      {loading ? (
        <p style={loadingStyle}>Loading…</p>
      ) : sortedProductTypes.length === 0 ? (
        <div style={emptyStyle}>
          No product types found. Create product types first, then return here to
          define global preset defaults.
        </div>
      ) : (
        <>
          <div style={helperCardStyle}>
            <strong style={{ display: "block", marginBottom: 8 }}>Shape</strong>
            <pre style={preStyle}>{EXAMPLE_VALUE}</pre>
            <p style={helperTextStyle}>
              Use option titles that also exist on products of that type, such as
              <strong> Color</strong> or <strong>Size</strong>. Set <code style={codeStyle}>is_default</code>
              on at most one entry per product type.
            </p>
          </div>

          <div style={typesGridStyle}>
            {sortedProductTypes.map((productType) => (
              <div key={productType.id} style={typeCardStyle}>
                <div style={typeHeaderStyle}>
                  <div>
                    <h2 style={typeTitleStyle}>{productType.value}</h2>
                    <p style={typeSubtitleStyle}>
                      Saved to store metadata as <code style={codeStyle}>variant_combination_defaults_by_type.{productType.value}</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => formatTypeDefaults(productType.value)}
                    style={ghostButtonStyle}
                  >
                    Insert example
                  </button>
                </div>
                <textarea
                  value={defaultsMap[productType.value] ?? ""}
                  onChange={(event) => updateTypeValue(productType.value, event.target.value)}
                  placeholder="[]"
                  spellCheck={false}
                  style={{
                    ...textareaStyle,
                    ...(errors[productType.value] ? errorTextareaStyle : {}),
                  }}
                />
                {errors[productType.value] ? (
                  <span style={errorTextStyle}>{errors[productType.value]}</span>
                ) : (
                  <span style={helperTextStyle}>
                    Leave empty to use only per-product preset combinations for this type.
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={footerStyle}>
            <button type="button" onClick={handleSave} disabled={saving} style={saveButtonStyle}>
              {saving ? "Saving…" : "Save preset defaults"}
            </button>
            {toast ? (
              <span style={{ color: toast.type === "ok" ? "#059669" : "#dc2626", fontSize: 13, fontWeight: 600 }}>
                {toast.text}
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Preset Defaults",
  icon: PresetIcon,
})

export default PresetDefaultsPage

const pageStyle: React.CSSProperties = {
  padding: "28px 32px",
  maxWidth: 1100,
  fontFamily: "Inter, system-ui, sans-serif",
}

const headerStyle: React.CSSProperties = {
  marginBottom: 24,
}

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 8,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  lineHeight: 1.7,
  maxWidth: 760,
}

const codeStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  background: "#f3f4f6",
  padding: "1px 4px",
  borderRadius: 4,
}

const loadingStyle: React.CSSProperties = {
  color: "#9ca3af",
  padding: "20px 0",
}

const emptyStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 12,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#6b7280",
  fontSize: 13,
}

const helperCardStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 18,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
}

const helperTextStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 12,
  lineHeight: 1.6,
}

const preStyle: React.CSSProperties = {
  margin: "0 0 12px",
  padding: 12,
  borderRadius: 8,
  background: "#0f172a",
  color: "#e2e8f0",
  fontSize: 12,
  lineHeight: 1.6,
  overflowX: "auto",
}

const typesGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
}

const typeCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
}

const typeHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 12,
}

const typeTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#111827",
  margin: 0,
}

const typeSubtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: "#6b7280",
  lineHeight: 1.6,
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 220,
  resize: "vertical",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  padding: 12,
  fontSize: 12,
  lineHeight: 1.6,
  fontFamily: "monospace",
  background: "#f9fafb",
  color: "#111827",
  outline: "none",
  marginBottom: 8,
}

const errorTextareaStyle: React.CSSProperties = {
  borderColor: "#dc2626",
}

const errorTextStyle: React.CSSProperties = {
  color: "#dc2626",
  fontSize: 12,
  lineHeight: 1.5,
}

const ghostButtonStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
}

const footerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginTop: 20,
}

const saveButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#111827",
  color: "#ffffff",
  borderRadius: 8,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
}
