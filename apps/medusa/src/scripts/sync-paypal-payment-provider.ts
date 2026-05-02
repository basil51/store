import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

type RegionLike = {
  id: string
  name?: string | null
  payment_providers?: Array<{ id?: string | null }>
}

const PAYPAL_PROVIDER_ID = "pp_paypal_paypal"

export default async function syncPayPalPaymentProvider({
  container,
}: ExecArgs) {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error(
      "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET first."
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike

  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })

  const regions = (data ?? []) as RegionLike[]

  if (!regions.length) {
    logger.info("No regions found. Nothing to update.")
    return
  }

  for (const region of regions) {
    const providerIds = Array.from(
      new Set(
        (region.payment_providers ?? [])
          .map((provider) => provider.id)
          .filter((providerId): providerId is string => Boolean(providerId))
          .concat(PAYPAL_PROVIDER_ID)
      )
    )

    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: {
          payment_providers: providerIds,
        },
      },
    })

    logger.info(
      `PayPal provider enabled for region ${region.name ?? region.id} (${region.id}).`
    )
  }
}