import { defineMiddlewares } from "@medusajs/framework/http"

import { requirePermission } from "./acl-http"
import { requireApiKeyAcl } from "./middlewares/api-key-acl"
import { analyticsRateLimit } from "./middlewares/rate-limit"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/analytics/preset",
      method: ["POST"],
      middlewares: [analyticsRateLimit],
    },
    {
      matcher: "/store/analytics/whatsapp",
      method: ["POST"],
      middlewares: [analyticsRateLimit],
    },
    {
      matcher: "/admin/acl/roles",
      method: ["GET", "POST"],
      middlewares: [requirePermission("users.manage")],
    },
    {
      matcher: "/admin/acl/user-roles",
      method: ["GET", "POST"],
      middlewares: [requirePermission("users.manage")],
    },
    {
      matcher: "/admin/analytics/preset",
      method: ["GET"],
      middlewares: [requirePermission("analytics.read")],
    },
    {
      matcher: "/admin/analytics/whatsapp",
      method: ["GET"],
      middlewares: [requirePermission("analytics.read")],
    },
    {
      matcher: "/admin/dashboard*",
      method: ["GET"],
      middlewares: [requirePermission("orders.manage")],
    },
    {
      matcher: "/admin/products*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/product-categories*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/product-types*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/product-tags*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/collections*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/inventory-items*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/stock-locations*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/uploads*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/orders*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("orders.manage")],
    },
    {
      matcher: "/admin/returns*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("orders.manage")],
    },
    {
      matcher: "/admin/exchanges*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("orders.manage")],
    },
    {
      matcher: "/admin/claims*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("orders.manage")],
    },
    {
      matcher: "/admin/order-edits*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("orders.manage")],
    },
    {
      matcher: "/admin/draft-orders*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("orders.manage")],
    },
    {
      matcher: "/admin/users*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("users.manage")],
    },
    {
      matcher: "/admin/invites*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("users.manage")],
    },
    {
      matcher: "/admin/api-keys*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requireApiKeyAcl],
    },
    {
      matcher: "/admin/store*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("settings.manage")],
    },
    {
      matcher: "/admin/regions*",
      method: ["GET"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/regions*",
      method: ["POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("settings.manage")],
    },
    {
      matcher: "/admin/sales-channels*",
      method: ["GET"],
      middlewares: [requirePermission("catalog.manage")],
    },
    {
      matcher: "/admin/sales-channels*",
      method: ["POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("settings.manage")],
    },
    {
      matcher: "/admin/custom",
      method: ["GET"],
      middlewares: [requirePermission("settings.manage")],
    },
  ],
})
