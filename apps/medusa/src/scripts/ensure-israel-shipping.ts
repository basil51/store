import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, any>> }>
}

export default async function ensureIsraelShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
    filters: {
      name: ["Israel Standard Shipping", "Israel Express Shipping"],
    },
  })

  if ((existingOptions ?? []).length >= 2) {
    logger.info("Israel shipping options already exist. Nothing to do.")
    return
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries.iso_2"],
  })

  const region = (regions ?? []).find((entry) =>
    (entry.countries ?? []).some((country: { iso_2?: string }) => country.iso_2 === "il")
  )

  if (!region?.id) {
    throw new Error("Could not find a region that contains country code 'il'.")
  }

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  const shippingProfile = shippingProfiles[0]

  if (!shippingProfile?.id) {
    throw new Error("Could not find a default shipping profile.")
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "default_location_id"],
  })

  const defaultLocationId = stores?.[0]?.default_location_id

  if (!defaultLocationId) {
    throw new Error("Could not determine the store default stock location.")
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Israel delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Israel",
        geo_zones: [
          {
            country_code: "il",
            type: "country",
          },
        ],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: defaultLocationId,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  })

  const optionInputs = [
    {
      name: "Israel Standard Shipping",
      price_type: "flat" as const,
      provider_id: "manual_manual",
      service_zone_id: fulfillmentSet.service_zones[0].id,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Standard",
        description: "Ship in 2-3 days.",
        code: "standard_il",
      },
      prices: [
        {
          region_id: region.id,
          amount: 10,
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          value: "true",
          operator: "eq" as const,
        },
        {
          attribute: "is_return",
          value: "false",
          operator: "eq" as const,
        },
      ],
    },
    {
      name: "Israel Express Shipping",
      price_type: "flat" as const,
      provider_id: "manual_manual",
      service_zone_id: fulfillmentSet.service_zones[0].id,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Express",
        description: "Ship in 24 hours.",
        code: "express_il",
      },
      prices: [
        {
          region_id: region.id,
          amount: 20,
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          value: "true",
          operator: "eq" as const,
        },
        {
          attribute: "is_return",
          value: "false",
          operator: "eq" as const,
        },
      ],
    },
  ]

  await createShippingOptionsWorkflow(container).run({
    input: optionInputs,
  })

  logger.info(
    `Created Israel shipping options for region ${region.name ?? region.id} (${region.id}).`
  )
}