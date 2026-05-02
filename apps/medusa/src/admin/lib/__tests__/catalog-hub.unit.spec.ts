import {
  CATALOG_HUB_CORE_LINKS,
  CATALOG_HUB_EXTENSION_LINKS,
  filterCatalogHubLinks,
  hasAllPermissions,
  parseCurrentAdminAclContext,
} from "../catalog-hub"

describe("catalog hub ACL helpers", () => {
  it("parses current admin ACL context and drops invalid permissions", () => {
    const context = parseCurrentAdminAclContext({
      role: "manager",
      role_source: "metadata",
      user_id: "user_123",
      requested_store_id: "store_123",
      allowed_store_ids: ["store_123", 55, null],
      store_scope_allowed: true,
      allowed_permissions: ["catalog.manage", "settings.manage", "invalid.permission"],
    })

    expect(context).toEqual({
      role: "manager",
      role_source: "metadata",
      user_id: "user_123",
      requested_store_id: "store_123",
      allowed_store_ids: ["store_123"],
      store_scope_allowed: true,
      allowed_permissions: ["catalog.manage", "settings.manage"],
    })
  })

  it("filters links by the required permissions", () => {
    const catalogOnly = parseCurrentAdminAclContext({
      role: "manager",
      allowed_permissions: ["catalog.manage"],
    })
    const fullAccess = parseCurrentAdminAclContext({
      role: "store_owner",
      allowed_permissions: ["catalog.manage", "settings.manage"],
    })

    expect(filterCatalogHubLinks(CATALOG_HUB_CORE_LINKS, catalogOnly)).toHaveLength(
      CATALOG_HUB_CORE_LINKS.length
    )
    expect(filterCatalogHubLinks(CATALOG_HUB_EXTENSION_LINKS, catalogOnly)).toHaveLength(0)

    expect(
      filterCatalogHubLinks(CATALOG_HUB_EXTENSION_LINKS, fullAccess).map(
        (link) => link.key
      )
    ).toEqual(["preset-defaults", "spec-defaults", "cart-settings"])
    expect(hasAllPermissions(fullAccess, ["catalog.manage", "settings.manage"])).toBe(true)
    expect(hasAllPermissions(null, ["catalog.manage"])).toBe(false)
  })
})