/// <reference types="jest" />

process.env.DB_HOST ??= "localhost"
process.env.DB_PORT ??= "5433"
process.env.DB_USERNAME ??= "medusa"
process.env.DB_PASSWORD ??= "medusa"
process.env.DB_TEMP_NAME ??= "medusa_integration_http"
process.env.DATABASE_URL ??= "postgresql://medusa:medusa@localhost:5433/medusa"
process.env.__MEDUSA_DB_CONNECTION_MAX_RETRIES ??= "1"
process.env.__MEDUSA_DB_CONNECTION_RETRY_DELAY ??= "100"

const TEST_DB_URL = `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_TEMP_NAME}`

const { medusaIntegrationTestRunner } = require("@medusajs/test-utils")
const { Modules, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const {
  createApiKeysWorkflow,
  createProductCategoriesWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} = require("@medusajs/medusa/core-flows")

jest.setTimeout(180 * 1000)

const toJsonString = (value: unknown) => JSON.stringify(value)

const makeId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

medusaIntegrationTestRunner({
  dbName: process.env.DB_TEMP_NAME,
  inApp: true,
  env: {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_TEMP_NAME: process.env.DB_TEMP_NAME,
    DATABASE_URL: TEST_DB_URL,
  },
  hooks: {
    beforeServerStart: async () => {
      const { configManager } = require("@medusajs/framework/config")
      configManager.config.projectConfig.databaseUrl = TEST_DB_URL
      console.log(`[integration] databaseUrl=${configManager.config.projectConfig.databaseUrl}`)
    },
  },
  testSuite: ({ api, getContainer, utils }: { api: any; getContainer: any; utils: any }) => {
    describe("Ping", () => {
      it("ping the server health endpoint", async () => {
        const response = await api.get('/health')
        expect(response.status).toEqual(200)
      })
    })

    describe("Categories", () => {
      it("returns nested category_children for a 3-level tree", async () => {
        const container = getContainer()
        const suffix = Date.now().toString()

        // Create sales channel + publishable key
        const {
          result: [salesChannel],
        } = await createSalesChannelsWorkflow(container).run({
          input: {
            salesChannelsData: [
              { name: `Test SC ${suffix}` },
            ],
          },
        })

        const {
          result: [publishableApiKeyResult],
        } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: `Test Key ${suffix}`,
                type: "publishable",
                created_by: "integration-test",
              },
            ],
          },
        })

        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: publishableApiKeyResult.id,
            add: [salesChannel.id],
          },
        })

        await utils.waitWorkflowExecutions()

        const pkToken = publishableApiKeyResult.token

        // Create 3-level category tree
        const {
          result: [root],
        } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [
              {
                name: `Root ${suffix}`,
                handle: `root-${suffix}`,
                is_active: true,
              },
            ],
          },
        })

        const {
          result: [child],
        } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [
              {
                name: `Child ${suffix}`,
                handle: `child-${suffix}`,
                parent_category_id: root.id,
                is_active: true,
              },
            ],
          },
        })

        await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [
              {
                name: `Grandchild ${suffix}`,
                handle: `grandchild-${suffix}`,
                parent_category_id: child.id,
                is_active: true,
              },
            ],
          },
        })

        await utils.waitWorkflowExecutions()

        const response = await api.get(
          `/store/product-categories?handle=root-${suffix}&include_descendants_tree=true&fields=*category_children,handle`,
          {
            headers: {
              "x-publishable-api-key": pkToken,
            },
            validateStatus: () => true,
          }
        )

        const payload = response.data

        expect(response.status).toEqual(200)
        expect(payload.product_categories).toHaveLength(1)
        expect(payload.product_categories[0].category_children).toHaveLength(1)
        expect(
          payload.product_categories[0].category_children[0].category_children
        ).toHaveLength(1)
      })
    })

    describe("Store currency config", () => {
      it("returns store default_stock_mode when metadata contains a valid value", async () => {
        const container = getContainer()
        const storeModule = container.resolve(Modules.STORE)
        const [store] = await storeModule.listStores({})
        const suffix = Date.now().toString()

        const {
          result: [salesChannel],
        } = await createSalesChannelsWorkflow(container).run({
          input: {
            salesChannelsData: [{ name: `Config SC ${suffix}` }],
          },
        })

        const {
          result: [publishableApiKeyResult],
        } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: `Config Key ${suffix}`,
                type: "publishable",
                created_by: "integration-test",
              },
            ],
          },
        })

        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: publishableApiKeyResult.id,
            add: [salesChannel.id],
          },
        })

        await updateStoresWorkflow(container).run({
          input: {
            selector: { id: store.id },
            update: {
              metadata: {
                ...(store.metadata ?? {}),
                default_stock_mode: "track_hidden",
              },
            },
          },
        })

        await utils.waitWorkflowExecutions()

        const response = await api.get("/store/store-currency-config", {
          headers: {
            "x-publishable-api-key": publishableApiKeyResult.token,
          },
          validateStatus: () => true,
        })

        expect(response.status).toEqual(200)
        expect(response.data.default_stock_mode).toEqual("track_hidden")
      })

      it("falls back to track_visible when default_stock_mode is invalid", async () => {
        const container = getContainer()
        const storeModule = container.resolve(Modules.STORE)
        const [store] = await storeModule.listStores({})
        const suffix = `${Date.now()}-fallback`

        const {
          result: [salesChannel],
        } = await createSalesChannelsWorkflow(container).run({
          input: {
            salesChannelsData: [{ name: `Config SC ${suffix}` }],
          },
        })

        const {
          result: [publishableApiKeyResult],
        } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: `Config Key ${suffix}`,
                type: "publishable",
                created_by: "integration-test",
              },
            ],
          },
        })

        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: publishableApiKeyResult.id,
            add: [salesChannel.id],
          },
        })

        await updateStoresWorkflow(container).run({
          input: {
            selector: { id: store.id },
            update: {
              metadata: {
                ...(store.metadata ?? {}),
                default_stock_mode: "invalid_mode",
              },
            },
          },
        })

        await utils.waitWorkflowExecutions()

        const response = await api.get("/store/store-currency-config", {
          headers: {
            "x-publishable-api-key": publishableApiKeyResult.token,
          },
          validateStatus: () => true,
        })

        expect(response.status).toEqual(200)
        expect(response.data.default_stock_mode).toEqual("track_visible")
      })
    })

    describe("Phase 8 ACL middleware", () => {
      const createAdminAuthContext = async (input: {
        role?: "super_admin" | "store_owner" | "manager" | "staff"
        storeIds?: string[]
      }) => {
        const container = getContainer()
        const db = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const email = `acl-${suffix}@example.com`
        const password = "Password123!"

        const registerResponse = await api.post(
          "/auth/user/emailpass/register",
          { email, password },
          { validateStatus: () => true }
        )

        expect(registerResponse.status).toBe(200)
        const authIdentityId = registerResponse.data?.token
          ? JSON.parse(
              Buffer.from(registerResponse.data.token.split(".")[1], "base64").toString("utf8")
            ).auth_identity_id
          : null

        expect(authIdentityId).toBeTruthy()

        const userId = makeId("user")
        const metadata = input.role
          ? {
              acl_role: input.role,
              acl_store_ids: input.storeIds ?? [],
            }
          : {}

        await db.raw(
          `insert into "user" (id, email, metadata, created_at, updated_at) values (?, ?, ?::jsonb, now(), now())`,
          [userId, email, toJsonString(metadata)]
        )
        await db.raw(
          `update "auth_identity" set app_metadata = ?::jsonb, updated_at = now() where id = ?`,
          [toJsonString({ user_id: userId }), authIdentityId]
        )

        const loginResponse = await api.post(
          "/auth/user/emailpass",
          { email, password },
          { validateStatus: () => true }
        )

        expect(loginResponse.status).toBe(200)
        expect(typeof loginResponse.data?.token).toBe("string")

        return {
          token: loginResponse.data.token as string,
          userId,
        }
      }

      it("allows users.manage role to access ACL POST checks", async () => {
        const { token } = await createAdminAuthContext({
          role: "super_admin",
        })

        const response = await api.post(
          "/admin/acl/roles",
          {
            permissions: ["users.manage", "analytics.read"],
          },
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
            validateStatus: () => true,
          }
        )

        expect(response.status).toBe(200)
        expect(response.data.role).toBe("super_admin")
        expect(response.data.allowed).toContain("users.manage")
      })

      it("denies ACL POST checks for role missing users.manage", async () => {
        const { token } = await createAdminAuthContext({
          role: "manager",
        })

        const response = await api.post(
          "/admin/acl/roles",
          {
            permissions: ["users.manage"],
          },
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
            validateStatus: () => true,
          }
        )

        expect(response.status).toBe(403)
        expect(response.data.message).toContain("users.manage")
      })

      it("returns current ACL context for authenticated roles without users.manage", async () => {
        const { token, userId } = await createAdminAuthContext({
          role: "manager",
        })

        const response = await api.get("/admin/acl/context", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          validateStatus: () => true,
        })

        expect(response.status).toBe(200)
        expect(response.data.role).toBe("manager")
        expect(response.data.user_id).toBe(userId)
        expect(response.data.allowed_permissions).toEqual(
          expect.arrayContaining(["catalog.manage", "orders.manage", "analytics.read"])
        )
        expect(response.data.allowed_permissions).not.toContain("users.manage")
      })

      it("enforces store scope when store_id is requested", async () => {
        const container = getContainer()
        const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "store",
          fields: ["id"],
        })
        const allowedStoreId = data?.[0]?.id
        expect(allowedStoreId).toBeTruthy()

        const { token } = await createAdminAuthContext({
          role: "store_owner",
          storeIds: [allowedStoreId],
        })

        const deniedResponse = await api.get(
          "/admin/analytics/preset",
          {
            headers: {
              authorization: `Bearer ${token}`,
              "x-store-id": "store_not_assigned",
            },
            validateStatus: () => true,
          }
        )

        expect(deniedResponse.status).toBe(403)
        expect(deniedResponse.data.message).toContain("not assigned to store")

        const allowedResponse = await api.get(
          "/admin/analytics/preset",
          {
            headers: {
              authorization: `Bearer ${token}`,
              "x-store-id": allowedStoreId,
            },
            validateStatus: () => true,
          }
        )

        expect(allowedResponse.status).toBe(200)
      })

      it("guards analytics endpoint by analytics.read permission", async () => {
        const { token: staffToken } = await createAdminAuthContext({
          role: "staff",
        })
        const { token: managerToken } = await createAdminAuthContext({
          role: "manager",
        })

        const denied = await api.get("/admin/analytics/preset", {
          headers: {
            authorization: `Bearer ${staffToken}`,
          },
          validateStatus: () => true,
        })
        expect(denied.status).toBe(403)

        const allowed = await api.get("/admin/analytics/preset", {
          headers: {
            authorization: `Bearer ${managerToken}`,
          },
          validateStatus: () => true,
        })
        expect(allowed.status).toBe(200)
      })

      it("denies store_owner from creating secret admin API keys", async () => {
        const { token } = await createAdminAuthContext({
          role: "store_owner",
        })

        const response = await api.post(
          "/admin/api-keys",
          {
            title: `ACL secret key test ${Date.now()}`,
            type: "secret",
          },
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
            validateStatus: () => true,
          }
        )

        expect(response.status).toBe(403)
        expect(response.data.message).toContain("api_keys.secrets")
      })

      it("never returns secret API keys to store_owner on list", async () => {
        const container = getContainer()
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: `ACL list secret ${suffix}`,
                type: "secret",
                created_by: "integration-test",
              },
            ],
          },
        })

        await utils.waitWorkflowExecutions()

        const { token } = await createAdminAuthContext({
          role: "store_owner",
        })

        const response = await api.get("/admin/api-keys?limit=100", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          validateStatus: () => true,
        })

        expect(response.status).toBe(200)
        const keys = response.data?.api_keys ?? []
        expect(Array.isArray(keys)).toBe(true)
        expect(keys.every((k: { type?: string }) => k.type !== "secret")).toBe(true)
      })

      it("returns secret API keys to super_admin on list when present", async () => {
        const container = getContainer()
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: `ACL list secret admin ${suffix}`,
                type: "secret",
                created_by: "integration-test",
              },
            ],
          },
        })

        await utils.waitWorkflowExecutions()

        const { token } = await createAdminAuthContext({
          role: "super_admin",
        })

        const response = await api.get("/admin/api-keys?limit=200", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          validateStatus: () => true,
        })

        expect(response.status).toBe(200)
        const keys = response.data?.api_keys ?? []
        expect(keys.some((k: { type?: string }) => k.type === "secret")).toBe(true)
      })

      it("allows orders.manage roles to access dashboard overview", async () => {
        const { token } = await createAdminAuthContext({
          role: "staff",
        })

        const response = await api.get("/admin/dashboard/overview", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          validateStatus: () => true,
        })

        expect(response.status).toBe(200)
        expect(response.data.summary).toEqual(
          expect.objectContaining({
            order_count: expect.any(Number),
            revenue_total: expect.any(Number),
          })
        )
        expect(response.data.scope).toEqual(
          expect.objectContaining({
            restricted: true,
            sales_channel_ids: [],
          })
        )
      })

      it("denies dashboard overview when the ACL role is missing", async () => {
        const { token } = await createAdminAuthContext({})

        const response = await api.get("/admin/dashboard/overview", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          validateStatus: () => true,
        })

        expect(response.status).toBe(401)
        expect(response.data.message).toContain("Missing role context")
      })
    })
  },
})