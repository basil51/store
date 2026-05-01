import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState } from "react"

type RoleItem = {
  key: string
  permissions: string[]
}

type UserItem = {
  id: string
  email: string
  display_name: string | null
  acl_role: string | null
  acl_store_ids: string[]
}

type StoreItem = {
  id: string
  name: string
}

type CurrentAdminContext = {
  role: string | null
  role_source: string
  user_id: string | null
  requested_store_id: string | null
  allowed_store_ids: string[]
  store_scope_allowed: boolean
}

const ShieldIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    width={16}
    height={16}
  >
    <path
      fillRule="evenodd"
      d="M10 1a1 1 0 01.447.106l6 3A1 1 0 0117 5v4.216c0 2.73-1.32 5.292-3.55 6.886l-2.94 2.1a1 1 0 01-1.16 0l-2.94-2.1A8.438 8.438 0 013 9.216V5a1 1 0 01.553-.894l6-3A1 1 0 0110 1zm3.707 6.707a1 1 0 00-1.414-1.414L9 9.586 7.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
)

function AclUserRolesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<UserItem[]>([])
  const [stores, setStores] = useState<StoreItem[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [query, setQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [currentContext, setCurrentContext] = useState<CurrentAdminContext | null>(null)
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  )

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return users
    }

    return users.filter((user) => {
      return (
        user.email.toLowerCase().includes(term) ||
        (user.display_name ?? "").toLowerCase().includes(term)
      )
    })
  }, [query, users])

  const selectedRolePermissions = useMemo(() => {
    return roles.find((role) => role.key === selectedRole)?.permissions ?? []
  }, [roles, selectedRole])

  function showToast(type: "ok" | "err", text: string) {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3500)
  }

  async function loadData() {
    setLoading(true)
    try {
      const [usersRes, contextRes] = await Promise.all([
        fetch("/admin/acl/user-roles", {
          credentials: "include",
        }),
        fetch("/admin/acl/roles", {
          credentials: "include",
        }),
      ])

      if (!usersRes.ok) {
        throw new Error("Failed to load ACL user roles.")
      }

      const data = (await usersRes.json()) as {
        users?: UserItem[]
        stores?: StoreItem[]
        roles?: RoleItem[]
      }
      const contextData = contextRes.ok
        ? ((await contextRes.json()) as Partial<CurrentAdminContext>)
        : null

      const loadedUsers = Array.isArray(data.users) ? data.users : []
      const loadedStores = Array.isArray(data.stores) ? data.stores : []
      const loadedRoles = Array.isArray(data.roles) ? data.roles : []

      setUsers(loadedUsers)
      setStores(loadedStores)
      setRoles(loadedRoles)
      setCurrentContext(
        contextData
          ? {
              role: typeof contextData.role === "string" ? contextData.role : null,
              role_source:
                typeof contextData.role_source === "string"
                  ? contextData.role_source
                  : "none",
              user_id:
                typeof contextData.user_id === "string" ? contextData.user_id : null,
              requested_store_id:
                typeof contextData.requested_store_id === "string"
                  ? contextData.requested_store_id
                  : null,
              allowed_store_ids: Array.isArray(contextData.allowed_store_ids)
                ? contextData.allowed_store_ids.filter(
                    (storeId): storeId is string => typeof storeId === "string"
                  )
                : [],
              store_scope_allowed:
                typeof contextData.store_scope_allowed === "boolean"
                  ? contextData.store_scope_allowed
                  : false,
            }
          : null
      )

      if (loadedUsers.length > 0) {
        hydrateEditor(loadedUsers[0])
      }
    } catch {
      showToast("err", "Could not load ACL users.")
    } finally {
      setLoading(false)
    }
  }

  function hydrateEditor(user: UserItem) {
    setSelectedUserId(user.id)
    setSelectedRole(user.acl_role ?? "")
    setSelectedStoreIds(user.acl_store_ids ?? [])
  }

  function toggleStore(storeId: string) {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((currentStoreId) => currentStoreId !== storeId)
        : [...prev, storeId]
    )
  }

  async function save() {
    if (!selectedUserId) {
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/admin/acl/user-roles", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          acl_role: selectedRole || null,
          acl_store_ids: selectedStoreIds,
        }),
      })

      const payload = (await res.json()) as {
        message?: string
        user?: UserItem
      }

      if (!res.ok) {
        showToast("err", payload.message ?? "Save failed.")
        return
      }

      if (payload.user) {
        setUsers((prev) =>
          prev.map((entry) =>
            entry.id === payload.user!.id ? payload.user! : entry
          )
        )
        hydrateEditor(payload.user)
      }

      showToast("ok", "ACL role assignment saved.")
    } catch {
      showToast("err", "Network error while saving.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>ACL User Roles</h1>
        <p style={subtitle}>
          Assign <code style={inlineCode}>acl_role</code> and{" "}
          <code style={inlineCode}>acl_store_ids</code> on admin user metadata.
        </p>
        {currentContext && (
          <div style={contextPanel}>
            <div style={contextHeading}>Current admin context</div>
            <div style={contextGrid}>
              <span style={contextKey}>Role</span>
              <span style={contextValue}>
                {currentContext.role ?? "none"} ({currentContext.role_source})
              </span>
              <span style={contextKey}>User id</span>
              <span style={contextValue}>{currentContext.user_id ?? "n/a"}</span>
              <span style={contextKey}>Requested store</span>
              <span style={contextValue}>
                {currentContext.requested_store_id ?? "none"}
              </span>
              <span style={contextKey}>Allowed stores</span>
              <span style={contextValue}>
                {currentContext.allowed_store_ids.length
                  ? currentContext.allowed_store_ids.join(", ")
                  : "none"}
              </span>
              <span style={contextKey}>Store scope</span>
              <span style={contextValue}>
                {currentContext.store_scope_allowed ? "allowed" : "blocked"}
              </span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={card}>
          <p style={muted}>Loading users…</p>
        </div>
      ) : (
        <div style={layout}>
          <div style={sidebarCard}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by email or name…"
              style={searchInput}
            />

            <div style={userList}>
              {filteredUsers.map((user) => {
                const active = user.id === selectedUserId
                return (
                  <button
                    key={user.id}
                    onClick={() => hydrateEditor(user)}
                    style={active ? activeUserRow : userRow}
                  >
                    <span style={userEmail}>{user.email}</span>
                    <span style={userMeta}>
                      {(user.display_name ?? "No name")} •{" "}
                      {user.acl_role ?? "no role"}
                    </span>
                  </button>
                )
              })}

              {!filteredUsers.length && (
                <p style={{ ...muted, padding: "8px 2px" }}>No users found.</p>
              )}
            </div>
          </div>

          <div style={editorCard}>
            {!selectedUser ? (
              <p style={muted}>Select a user to edit role assignment.</p>
            ) : (
              <>
                <div style={editorTop}>
                  <div>
                    <h2 style={editorTitle}>{selectedUser.email}</h2>
                    <p style={muted}>
                      {selectedUser.display_name ?? "No display name"}
                    </p>
                  </div>
                </div>

                <div style={fieldBlock}>
                  <label style={label}>ACL role</label>
                  <select
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                    style={select}
                  >
                    <option value="">No role</option>
                    {roles.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.key}
                      </option>
                    ))}
                  </select>
                  <p style={hint}>
                    Without a role, ACL-protected admin endpoints return 401.
                  </p>
                </div>

                <div style={fieldBlock}>
                  <label style={label}>Allowed stores</label>
                  <div style={storeGrid}>
                    {stores.map((store) => {
                      const checked = selectedStoreIds.includes(store.id)
                      return (
                        <label key={store.id} style={storeItem}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStore(store.id)}
                          />
                          <span style={storeLabel}>{store.name}</span>
                        </label>
                      )
                    })}

                    {!stores.length && <p style={muted}>No stores found.</p>}
                  </div>
                  <p style={hint}>
                    Store scope is enforced only when endpoints include a
                    requested store id (header/query).
                  </p>
                </div>

                <div style={fieldBlock}>
                  <label style={label}>Role permissions preview</label>
                  <div style={permList}>
                    {selectedRolePermissions.length ? (
                      selectedRolePermissions.map((permission) => (
                        <span key={permission} style={permTag}>
                          {permission}
                        </span>
                      ))
                    ) : (
                      <span style={muted}>No permissions (role not set).</span>
                    )}
                  </div>
                </div>

                <div style={footer}>
                  <button
                    onClick={save}
                    disabled={saving}
                    style={saveButton}
                  >
                    {saving ? "Saving…" : "Save ACL assignment"}
                  </button>
                  {toast && (
                    <span
                      style={{
                        color: toast.type === "ok" ? "#059669" : "#dc2626",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {toast.text}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const container: React.CSSProperties = {
  padding: 20,
  maxWidth: 1200,
  margin: "0 auto",
}

const header: React.CSSProperties = {
  marginBottom: 18,
}

const contextPanel: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid var(--ui-border-base)",
  borderRadius: 10,
  background: "var(--ui-bg-subtle)",
  padding: "10px 12px",
}

const contextHeading: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
  marginBottom: 8,
}

const contextGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "130px 1fr",
  rowGap: 4,
  columnGap: 8,
}

const contextKey: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ui-fg-subtle)",
}

const contextValue: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ui-fg-base)",
}

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
}

const subtitle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--ui-fg-subtle)",
  fontSize: 14,
}

const inlineCode: React.CSSProperties = {
  background: "var(--ui-bg-subtle)",
  borderRadius: 4,
  padding: "1px 6px",
}

const layout: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  gap: 14,
}

const card: React.CSSProperties = {
  background: "var(--ui-bg-base)",
  border: "1px solid var(--ui-border-base)",
  borderRadius: 10,
  padding: 14,
}

const sidebarCard: React.CSSProperties = {
  ...card,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 540,
}

const editorCard: React.CSSProperties = {
  ...card,
  minHeight: 540,
}

const searchInput: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--ui-border-base)",
  borderRadius: 8,
  background: "var(--ui-bg-base)",
  color: "var(--ui-fg-base)",
  fontSize: 14,
  padding: "9px 10px",
}

const userList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  overflowY: "auto",
}

const userRow: React.CSSProperties = {
  textAlign: "left",
  border: "1px solid var(--ui-border-base)",
  borderRadius: 8,
  padding: "10px 12px",
  background: "var(--ui-bg-base)",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 4,
}

const activeUserRow: React.CSSProperties = {
  ...userRow,
  border: "1px solid var(--ui-button-inverted)",
  boxShadow: "0 0 0 1px var(--ui-button-inverted) inset",
}

const userEmail: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
}

const userMeta: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ui-fg-subtle)",
}

const editorTop: React.CSSProperties = {
  marginBottom: 18,
}

const editorTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  color: "var(--ui-fg-base)",
}

const fieldBlock: React.CSSProperties = {
  marginBottom: 18,
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ui-fg-base)",
  marginBottom: 8,
}

const select: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--ui-border-base)",
  borderRadius: 8,
  background: "var(--ui-bg-base)",
  color: "var(--ui-fg-base)",
  fontSize: 14,
  padding: "9px 10px",
}

const storeGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
}

const storeItem: React.CSSProperties = {
  border: "1px solid var(--ui-border-base)",
  borderRadius: 8,
  padding: "8px 10px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
}

const storeLabel: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ui-fg-base)",
}

const hint: React.CSSProperties = {
  marginTop: 7,
  fontSize: 12,
  color: "var(--ui-fg-subtle)",
}

const permList: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
}

const permTag: React.CSSProperties = {
  fontSize: 12,
  border: "1px solid var(--ui-border-base)",
  borderRadius: 999,
  padding: "3px 10px",
  color: "var(--ui-fg-base)",
}

const footer: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginTop: 20,
}

const saveButton: React.CSSProperties = {
  background: "var(--ui-button-inverted)",
  color: "var(--ui-button-inverted-contrast)",
  border: "1px solid var(--ui-button-inverted)",
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
}

const muted: React.CSSProperties = {
  color: "var(--ui-fg-subtle)",
  fontSize: 13,
}

export const config = defineRouteConfig({
  label: "ACL Users",
  icon: ShieldIcon,
})

export default AclUserRolesPage
