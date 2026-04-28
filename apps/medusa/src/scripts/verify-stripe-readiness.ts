import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"
import path from "path"

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

const STRIPE_PROVIDER_ID = "pp_stripe_stripe"
const storefrontEnvPath = path.resolve(
  process.cwd(),
  "../medusa-storefront/.env.local"
)

const requiredEnvKeys = [
  "STRIPE_API_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_KEY",
] as const

export default async function verifyStripeReadiness({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const storefrontStripeKey =
    process.env.NEXT_PUBLIC_STRIPE_KEY ??
    process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY ??
    readEnvValue(storefrontEnvPath, "NEXT_PUBLIC_STRIPE_KEY") ??
    readEnvValue(storefrontEnvPath, "NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY")

  const missingEnvKeys = requiredEnvKeys.filter((key) => {
    if (key === "NEXT_PUBLIC_STRIPE_KEY") {
      return !storefrontStripeKey
    }

    return !process.env[key]
  })

  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })

  const regions = (data ?? []) as RegionLike[]
  const stripeRegions = regions.filter((region) =>
    (region.payment_providers ?? []).some(
      (provider) => provider.id === STRIPE_PROVIDER_ID
    )
  )

  if (missingEnvKeys.length) {
    throw new Error(
      `Missing Stripe env values: ${missingEnvKeys.join(", ")}.`
    )
  }

  if (!stripeRegions.length) {
    throw new Error(
      "Stripe provider is configured but not attached to any region. Run pnpm --filter medusa stripe:sync-provider."
    )
  }

  const backendUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9244"

  logger.info(`Stripe API key present: ${maskValue(process.env.STRIPE_API_KEY!)}`)
  logger.info(
    `Stripe webhook secret present: ${maskValue(process.env.STRIPE_WEBHOOK_SECRET!)}`
  )
  logger.info(
    `Stripe publishable key present: ${maskValue(
      storefrontStripeKey!
    )}`
  )
  logger.info(`Stripe webhook endpoint: ${backendUrl}/hooks/payment/${STRIPE_PROVIDER_ID}`)

  stripeRegions.forEach((region) => {
    logger.info(`Stripe enabled for region ${region.name ?? region.id} (${region.id}).`)
  })

  logger.info(
    "Stripe readiness passed. Provider exposure and required env configuration are in place."
  )
}

function maskValue(value: string) {
  if (value.length <= 12) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`
  }

  return `${value.slice(0, 7)}...${value.slice(-6)}`
}

function readEnvValue(filePath: string, key: string) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const content = fs.readFileSync(filePath, "utf8")
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`))

  if (!line) {
    return null
  }

  return line.slice(key.length + 1).trim() || null
}