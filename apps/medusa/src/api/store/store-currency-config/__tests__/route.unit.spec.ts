import { Modules } from "@medusajs/framework/utils"

import { GET } from "../route"

const createRes = () => {
  const res: any = {
    json: jest.fn(() => res),
  }

  return res
}

const createReq = (metadata?: Record<string, unknown>) => {
  const storeModule = {
    listStores: jest.fn().mockResolvedValue([
      {
        name: "SparkCo",
        metadata,
      },
    ]),
  }

  const req: any = {
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.STORE) {
          return storeModule
        }

        throw new Error(`Unexpected key: ${key}`)
      }),
    },
  }

  return { req, storeModule }
}

describe("GET /store/store-currency-config", () => {
  it("returns the configured contact email when store metadata provides one", async () => {
    const { req } = createReq({
      contact_email: " support@sparkco.vip ",
    })
    const res = createRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        store_name: "SparkCo",
        contact_email: "support@sparkco.vip",
      })
    )
  })

  it("falls back to the default contact email when metadata is missing", async () => {
    const { req } = createReq()
    const res = createRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_email: "info@sparkco.vip",
      })
    )
  })
})