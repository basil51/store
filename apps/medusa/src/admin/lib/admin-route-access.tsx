import { useEffect, useState, type ReactNode } from "react"

import { type PermissionKey } from "../../shared/access-control"
import {
  type CurrentAdminAclContext,
  hasAllPermissions,
  loadCurrentAdminAclContext,
  missingPermissions,
} from "./admin-acl"

export type AdminRouteAccessResult = {
  loading: boolean
  error: string | null
  context: CurrentAdminAclContext | null
  hasAccess: boolean
  missingPermissions: PermissionKey[]
}

const noticeCard: React.CSSProperties = {
  background: "var(--ui-bg-base)",
  border: "1px solid var(--ui-border-base)",
  borderRadius: 12,
  padding: 20,
}

const noticeTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 8,
}

const noticeText: React.CSSProperties = {
  fontSize: 14,
  color: "var(--ui-fg-subtle)",
  lineHeight: 1.5,
  margin: 0,
}

const metaList: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 16,
}

const metaRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  fontSize: 13,
  color: "var(--ui-fg-subtle)",
}

const metaLabel: React.CSSProperties = {
  fontWeight: 700,
  color: "var(--ui-fg-base)",
}

const tokenRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
}

const token: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 8px",
  borderRadius: 999,
  background: "var(--ui-bg-subtle)",
  border: "1px solid var(--ui-border-base)",
  fontSize: 12,
  color: "var(--ui-fg-base)",
}

const formatPermissionList = (permissions: readonly PermissionKey[]) =>
  permissions.length ? permissions.join(", ") : "no additional permissions"

export const useAdminRouteAccess = (
  requiredPermissions: readonly PermissionKey[]
): AdminRouteAccessResult => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<CurrentAdminAclContext | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const nextContext = await loadCurrentAdminAclContext()

        if (cancelled) {
          return
        }

        setContext(nextContext)
        setError(null)
      } catch (err) {
        if (cancelled) {
          return
        }

        setContext(null)
        setError(err instanceof Error ? err.message : "Failed to load ACL context.")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    loading,
    error,
    context,
    hasAccess: hasAllPermissions(context, requiredPermissions),
    missingPermissions: missingPermissions(context, requiredPermissions),
  }
}

export const AdminRouteAccessNotice = ({
  access,
  requiredPermissions,
  guidance,
}: {
  access: AdminRouteAccessResult
  requiredPermissions: readonly PermissionKey[]
  guidance?: ReactNode
}) => {
  if (access.loading) {
    return (
      <div style={noticeCard}>
        <div style={noticeTitle}>Checking access</div>
        <p style={noticeText}>Loading the current admin ACL context for this page.</p>
      </div>
    )
  }

  if (access.error) {
    return (
      <div style={noticeCard}>
        <div style={noticeTitle}>Access could not be verified</div>
        <p style={noticeText}>{access.error}</p>
      </div>
    )
  }

  const currentRole = access.context?.role

  if (!currentRole) {
    return (
      <div style={noticeCard}>
        <div style={noticeTitle}>ACL role required</div>
        <p style={noticeText}>
          This page is protected by {formatPermissionList(requiredPermissions)}. No ACL role is
          attached to the current admin session, so protected admin routes return 401 until a role
          is assigned.
        </p>
        {guidance ? <div style={{ marginTop: 16 }}>{guidance}</div> : null}
      </div>
    )
  }

  return (
    <div style={noticeCard}>
      <div style={noticeTitle}>Access denied</div>
      <p style={noticeText}>
        Role "{currentRole}" does not include the permissions required for this page.
      </p>
      <div style={metaList}>
        <div style={metaRow}>
          <span style={metaLabel}>Required</span>
          <span>{formatPermissionList(requiredPermissions)}</span>
        </div>
        <div style={metaRow}>
          <span style={metaLabel}>Current role</span>
          <span>
            {currentRole} ({access.context?.role_source ?? "unknown source"})
          </span>
        </div>
      </div>
      {access.missingPermissions.length ? (
        <div style={tokenRow}>
          {access.missingPermissions.map((permission) => (
            <span key={permission} style={token}>
              {permission}
            </span>
          ))}
        </div>
      ) : null}
      {guidance ? <div style={{ marginTop: 16 }}>{guidance}</div> : null}
    </div>
  )
}