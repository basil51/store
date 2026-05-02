import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useCallback, useEffect, useState } from "react"

import { adminHref } from "../../lib/admin-href"
import {
  CATALOG_HUB_CORE_LINKS,
  CATALOG_HUB_EXTENSION_LINKS,
  filterCatalogHubLinks,
  hasAllPermissions,
  parseCurrentAdminAclContext,
  type CatalogHubLink,
  type CurrentAdminAclContext,
} from "../../lib/catalog-hub"

const PackageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
    <path
      fillRule="evenodd"
      d="M5.5 2A1.5 1.5 0 004 3.5v13A1.5 1.5 0 005.5 18h9a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0014.5 2h-9zm-1 1.5a.5.5 0 01.5-.5h9a.5.5 0 01.5.5V6h-10V3.5zm0 4.5h10v8.5a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5V8z"
      clipRule="evenodd"
    />
  </svg>
)

const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: 20,
}

const title: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 8,
}

const subtitle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--ui-fg-subtle)",
  marginBottom: 24,
  lineHeight: 1.5,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 12,
  borderBottom: "1px solid var(--ui-border-base)",
  paddingBottom: 10,
}

const linkGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 10,
  marginBottom: 28,
}

const linkCard: React.CSSProperties = {
  display: "block",
  padding: "14px 16px",
  borderRadius: 10,
  border: "1px solid var(--ui-border-base)",
  background: "var(--ui-bg-base)",
  color: "var(--ui-fg-interactive)",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
}

const muted: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ui-fg-subtle)",
  marginBottom: 12,
}

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
}

const th: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontWeight: 600,
  color: "var(--ui-fg-subtle)",
  borderBottom: "1px solid var(--ui-border-base)",
  fontSize: 12,
  textTransform: "uppercase",
}

const td: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid var(--ui-border-base)",
  color: "var(--ui-fg-base)",
}

const errorBox: React.CSSProperties = {
  background: "var(--ui-bg-error)",
  color: "var(--ui-fg-on-error)",
  padding: 14,
  borderRadius: 8,
  marginBottom: 16,
}

const thumbWrap: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 6,
  overflow: "hidden",
  background: "var(--ui-bg-subtle)",
  flexShrink: 0,
}

type ProductRow = {
  id: string
  title: string | null
  handle: string | null
  status: string | null
  thumbnail: string | null
}

const readProducts = (payload: unknown): ProductRow[] => {
  if (!payload || typeof payload !== "object") {
    return []
  }
  const list = (payload as { products?: unknown }).products
  if (!Array.isArray(list)) {
    return []
  }
  return list
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null
      }
      const r = row as Record<string, unknown>
      const id = typeof r.id === "string" ? r.id : null
      if (!id) {
        return null
      }
      const thumbnail =
        typeof r.thumbnail === "string"
          ? r.thumbnail
          : r.thumbnail && typeof r.thumbnail === "object" && "url" in r.thumbnail
            ? String((r.thumbnail as { url?: string }).url ?? "")
            : null
      return {
        id,
        title: typeof r.title === "string" ? r.title : null,
        handle: typeof r.handle === "string" ? r.handle : null,
        status: typeof r.status === "string" ? r.status : null,
        thumbnail: thumbnail || null,
      }
    })
    .filter((row): row is ProductRow => row !== null)
}

function CatalogHubPage() {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<CurrentAdminAclContext | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const contextResponse = await fetch("/admin/acl/context", {
        credentials: "include",
        headers: { "content-type": "application/json" },
      })

      if (!contextResponse.ok) {
        throw new Error(`Failed to load access context (${contextResponse.status})`)
      }

      const nextContext = parseCurrentAdminAclContext(await contextResponse.json())
      if (!nextContext) {
        throw new Error("Failed to parse access context")
      }

      setContext(nextContext)

      if (!hasAllPermissions(nextContext, ["catalog.manage"])) {
        setRows([])
        return
      }

      const params = new URLSearchParams({
        limit: "18",
        offset: "0",
        order: "-created_at",
        fields: "id,title,handle,status,thumbnail",
      })
      const res = await fetch(`/admin/products?${params.toString()}`, {
        credentials: "include",
        headers: { "content-type": "application/json" },
      })
      if (res.status === 403) {
        throw new Error("Missing catalog.manage permission for the products API.")
      }
      if (!res.ok) {
        throw new Error(`Failed to load products (${res.status})`)
      }
      const json = await res.json()
      setRows(readProducts(json))
    } catch (e) {
      setContext(null)
      setError(e instanceof Error ? e.message : "Failed to load products")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const coreLinks = filterCatalogHubLinks(CATALOG_HUB_CORE_LINKS, context)
  const extensionLinks = filterCatalogHubLinks(CATALOG_HUB_EXTENSION_LINKS, context)
  const canViewRecentProducts = hasAllPermissions(context, ["catalog.manage"])
  const isInitializing = loading && context === null && !error

  const renderLinks = (links: CatalogHubLink[]) => {
    return links.map((link) => (
      <a key={link.key} href={adminHref(link.path)} style={linkCard}>
        {link.label}
      </a>
    ))
  }

  return (
    <div style={container}>
      <h1 style={title}>Catalog hub</h1>
      <p style={subtitle}>
        Phase 9.2: Medusa Dashboard already covers add, edit, delete, variants, and uploads on each product. This hub
        deep-links into those screens and lists recently created products. Use a product&apos;s detail page for images
        and variants; use the metadata widget (on the product) for specs, presets, and media uploads tied to this
        project.
      </p>
      <p style={muted}>
        {isInitializing
          ? "Loading available tools for your current role..."
          : context
            ? `Available tools are filtered for role: ${context.role ?? "unassigned"}.`
            : "Available tools could not be resolved, so restricted actions stay hidden."}
      </p>

      <div style={sectionTitle}>Core catalog</div>
      <p style={muted}>Opens the built-in Medusa admin routes in this app.</p>
      {isInitializing ? (
        <p style={muted}>Loading core catalog actions...</p>
      ) : coreLinks.length > 0 ? (
        <div style={linkGrid}>{renderLinks(coreLinks)}</div>
      ) : (
        <p style={muted}>Core catalog shortcuts require `catalog.manage`.</p>
      )}

      <div style={sectionTitle}>Store extensions</div>
      <p style={muted}>Custom routes that extend catalog behavior in this repo.</p>
      {isInitializing ? (
        <p style={muted}>Loading extension actions...</p>
      ) : extensionLinks.length > 0 ? (
        <div style={linkGrid}>{renderLinks(extensionLinks)}</div>
      ) : (
        <p style={muted}>
          Store extensions require a combination of `settings.manage` and catalog permissions.
        </p>
      )}

      <div style={sectionTitle}>Recent products</div>
      {error ? <div style={errorBox}>{error}</div> : null}
      {!canViewRecentProducts && !isInitializing ? (
        <p style={muted}>Recent products require `catalog.manage`.</p>
      ) : loading ? (
        <p style={muted}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={muted}>No products returned (empty catalog or no access).</p>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: 52 }}> </th>
              <th style={th}>Title</th>
              <th style={th}>Handle</th>
              <th style={th}>Status</th>
              <th style={th}> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={td}>
                  <div style={thumbWrap}>
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt={p.title ?? "Product"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : null}
                  </div>
                </td>
                <td style={td}>{p.title ?? "—"}</td>
                <td style={td}>
                  <code style={{ fontSize: 12 }}>{p.handle ?? "—"}</code>
                </td>
                <td style={td}>{p.status ?? "—"}</td>
                <td style={td}>
                  <a
                    href={adminHref(`/products/${p.id}/edit`)}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ui-fg-interactive)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Catalog hub",
  icon: PackageIcon,
  rank: 15,
})

export default CatalogHubPage
