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
const {
  createApiKeysWorkflow,
  createProductCategoriesWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} = require("@medusajs/medusa/core-flows")

jest.setTimeout(180 * 1000)

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
  },
})