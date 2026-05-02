import { type PermissionKey } from "../../shared/access-control"

export {
  type CurrentAdminAclContext,
  hasAllPermissions,
  parseCurrentAdminAclContext,
} from "./admin-acl"
import { hasAllPermissions, type CurrentAdminAclContext } from "./admin-acl"

export type CatalogHubLink = {
  key: string
  label: string
  path: string
  requiredPermissions: PermissionKey[]
}

export const CATALOG_HUB_CORE_LINKS: CatalogHubLink[] = [
  {
    key: "products",
    label: "Products",
    path: "/products",
    requiredPermissions: ["catalog.manage"],
  },
  {
    key: "products-create",
    label: "Create product",
    path: "/products/create",
    requiredPermissions: ["catalog.manage"],
  },
  {
    key: "products-import",
    label: "Import products",
    path: "/products/import",
    requiredPermissions: ["catalog.manage"],
  },
  {
    key: "products-export",
    label: "Export products",
    path: "/products/export",
    requiredPermissions: ["catalog.manage"],
  },
  {
    key: "collections",
    label: "Collections",
    path: "/collections",
    requiredPermissions: ["catalog.manage"],
  },
  {
    key: "categories",
    label: "Categories",
    path: "/categories",
    requiredPermissions: ["catalog.manage"],
  },
  {
    key: "categories-organize",
    label: "Organize categories",
    path: "/categories/organize",
    requiredPermissions: ["catalog.manage"],
  },
]

export const CATALOG_HUB_EXTENSION_LINKS: CatalogHubLink[] = [
  {
    key: "preset-defaults",
    label: "Preset defaults",
    path: "/preset-defaults",
    requiredPermissions: ["catalog.manage", "settings.manage"],
  },
  {
    key: "spec-defaults",
    label: "Spec defaults",
    path: "/spec-defaults",
    requiredPermissions: ["catalog.manage", "settings.manage"],
  },
  {
    key: "cart-settings",
    label: "Cart settings",
    path: "/cart-settings",
    requiredPermissions: ["settings.manage"],
  },
]

export const filterCatalogHubLinks = (
  links: CatalogHubLink[],
  context: CurrentAdminAclContext | null
) => links.filter((link) => hasAllPermissions(context, link.requiredPermissions))