import {
  PERMISSIONS,
  ROLE_KEYS,
  hasPermission,
  normalizeRole,
  permissionsForRole,
} from "../../shared/access-control"
import {
  isStoreScopeAllowed,
  resolveAccessControlContext,
} from "../../shared/access-control-context"

describe("access-control matrix", () => {
  it("exposes a permission set for every role", () => {
    for (const role of ROLE_KEYS) {
      const permissions = permissionsForRole(role)
      expect(Array.isArray(permissions)).toBe(true)
      expect(permissions.length).toBeGreaterThan(0)
    }
  })

  it("grants all permissions to super_admin", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission("super_admin", permission)).toBe(true)
    }
  })

  it("enforces expected deny paths for restricted roles", () => {
    expect(hasPermission("staff", "users.manage")).toBe(false)
    expect(hasPermission("staff", "analytics.read")).toBe(false)
    expect(hasPermission("manager", "users.manage")).toBe(false)
    expect(hasPermission("store_owner", "users.manage")).toBe(false)
    expect(hasPermission("manager", "catalog.manage")).toBe(true)
    expect(hasPermission("store_owner", "api_keys.secrets")).toBe(false)
    expect(hasPermission("super_admin", "api_keys.secrets")).toBe(true)
  })

  it("normalizes valid roles and rejects invalid values", () => {
    expect(normalizeRole("super_admin")).toBe("super_admin")
    expect(normalizeRole("manager")).toBe("manager")
    expect(normalizeRole("invalid-role")).toBeNull()
    expect(normalizeRole(undefined)).toBeNull()
  })
})

describe("store scope enforcement", () => {
  it("allows super_admin regardless of requested store", () => {
    expect(isStoreScopeAllowed("super_admin", [], "store_123")).toBe(true)
  })

  it("allows non-super-admin when no store is requested", () => {
    expect(isStoreScopeAllowed("manager", [], null)).toBe(true)
  })

  it("denies non-super-admin when store is requested but unassigned", () => {
    expect(isStoreScopeAllowed("manager", [], "store_123")).toBe(false)
    expect(isStoreScopeAllowed("manager", ["store_1"], "store_2")).toBe(false)
  })

  it("allows non-super-admin when requested store is assigned", () => {
    expect(isStoreScopeAllowed("manager", ["store_1", "store_2"], "store_2")).toBe(
      true
    )
  })
})

describe("access control context resolution", () => {
  it("prefers request role override when provided", async () => {
    const req = {
      headers: {
        "x-store-role": "manager",
        "x-store-id": "store_header",
      },
      query: {},
      scope: {
        resolve: jest.fn(),
      },
    } as any

    const context = await resolveAccessControlContext(req)

    expect(context.role).toBe("manager")
    expect(context.source).toBe("request")
    expect(context.requestedStoreId).toBe("store_header")
    expect(req.scope.resolve).not.toHaveBeenCalled()
  })

  it("resolves role and store scope from user metadata when request role is absent", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "user_1",
          metadata: {
            acl_role: "store_owner",
            acl_store_ids: ["store_a", "store_b"],
          },
        },
      ],
    })

    const req = {
      headers: {},
      query: {
        store_id: "store_b",
      },
      auth_context: {
        user_id: "user_1",
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph }),
      },
    } as any

    const context = await resolveAccessControlContext(req)

    expect(context.role).toBe("store_owner")
    expect(context.source).toBe("user_metadata")
    expect(context.userId).toBe("user_1")
    expect(context.allowedStoreIds).toEqual(["store_a", "store_b"])
    expect(context.requestedStoreId).toBe("store_b")
    expect(graph).toHaveBeenCalledTimes(1)
  })
})
