import { ExecArgs } from "@medusajs/framework/types"
import fs from "fs"
import path from "path"

type Region = {
  id: string
  name?: string | null
  countries?: Array<{ iso_2?: string | null }>
}

type ProductVariant = {
  id: string
  calculated_price?: {
    calculated_amount?: number | null
    currency_code?: string | null
  } | null
}

type Product = {
  id: string
  title?: string | null
  variants?: ProductVariant[]
}

const DEFAULT_API_BASE = "http://127.0.0.1:9244"
const STRIPE_PROVIDER_ID = "pp_stripe_stripe"
const DEFAULT_RETURN_URL = "http://localhost:8000/il/checkout?step=review"
const storefrontEnvPath = path.resolve(
  process.cwd(),
  "../medusa-storefront/.env.local"
)

export default async function verifyStripeOrderCompletion({ args }: ExecArgs) {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs
  const normalizedArgs =
    candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs
  const apiBaseArg = normalizedArgs.find((value) => value.startsWith("http://") || value.startsWith("https://"))
  const publishableKeyArg = normalizedArgs.find((value) => value.startsWith("pk_"))
  const returnUrlArg = normalizedArgs.find(
    (value) =>
      (value.startsWith("http://") || value.startsWith("https://")) &&
      value !== apiBaseArg
  )

  const apiBase = apiBaseArg ?? process.env.MEDUSA_BACKEND_URL ?? DEFAULT_API_BASE
  const publishableApiKey =
    publishableKeyArg ??
    process.env.STORE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
    readEnvValue(storefrontEnvPath, "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")
  const returnUrl = returnUrlArg ?? process.env.STRIPE_TEST_RETURN_URL ?? DEFAULT_RETURN_URL
  const stripeApiKey = process.env.STRIPE_API_KEY

  if (!publishableApiKey) {
    throw new Error(
      "Missing publishable API key. Pass arg #2, set STORE_PUBLISHABLE_KEY, or set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in the storefront env."
    )
  }

  if (!stripeApiKey) {
    throw new Error("Missing STRIPE_API_KEY in apps/medusa/.env.")
  }

  await assertBackendUp(apiBase)

  const headers = {
    "content-type": "application/json",
    "x-publishable-api-key": publishableApiKey,
  }

  const regionsResponse = await fetchJson<{ regions?: Region[] }>(
    `${apiBase}/store/regions`,
    { headers }
  )
  const region = pickRegion(regionsResponse.regions ?? [])

  if (!region) {
    throw new Error("Could not find a storefront region to test checkout against.")
  }

  const productsUrl = new URL(`${apiBase}/store/products`)
  productsUrl.searchParams.set("limit", "20")
  productsUrl.searchParams.set("region_id", region.id)
  productsUrl.searchParams.set(
    "fields",
    "id,title,*variants.calculated_price"
  )

  const productsResponse = await fetchJson<{ products?: Product[] }>(
    productsUrl.toString(),
    { headers }
  )
  const selection = pickPurchasableVariant(productsResponse.products ?? [])

  if (!selection) {
    throw new Error(
      `Could not find a purchasable product variant for region ${region.name ?? region.id}.`
    )
  }

  const cartCreate = await fetchJson<{ cart?: { id?: string | null } }>(
    `${apiBase}/store/carts`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ region_id: region.id }),
    }
  )

  const cartId = cartCreate.cart?.id

  if (!cartId) {
    throw new Error("Store API did not return a cart id.")
  }

  await fetchJson(
    `${apiBase}/store/carts/${cartId}/line-items`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        variant_id: selection.variant.id,
        quantity: 1,
      }),
    }
  )

  const addressPayload = {
    email: "stripe-checkout-test@example.com",
    shipping_address: buildAddress(),
    billing_address: buildAddress(),
  }

  await fetchJson(`${apiBase}/store/carts/${cartId}`, {
    method: "POST",
    headers,
    body: JSON.stringify(addressPayload),
  })

  const shippingOptions = await fetchJson<{
    shipping_options?: Array<{ id?: string | null; name?: string | null }>
  }>(`${apiBase}/store/shipping-options?cart_id=${cartId}`, { headers })
  const shippingOption = (shippingOptions.shipping_options ?? [])[0]

  if (!shippingOption?.id) {
    throw new Error(`No shipping options were returned for cart ${cartId}.`)
  }

  await fetchJson(`${apiBase}/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: shippingOption.id }),
  })

  const paymentCollection = await fetchJson<{
    payment_collection?: { id?: string | null }
  }>(`${apiBase}/store/payment-collections`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: cartId }),
  })
  const paymentCollectionId = paymentCollection.payment_collection?.id

  if (!paymentCollectionId) {
    throw new Error(`Store API did not return a payment collection for cart ${cartId}.`)
  }

  const paymentSessions = await fetchJson<{
    payment_collection?: {
      payment_sessions?: Array<{
        provider_id?: string | null
        data?: { id?: string | null; client_secret?: string | null } | null
      }>
    }
  }>(`${apiBase}/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ provider_id: STRIPE_PROVIDER_ID }),
  })

  const stripeSession = paymentSessions.payment_collection?.payment_sessions?.find(
    (session) => session.provider_id === STRIPE_PROVIDER_ID
  )
  const paymentIntentId = stripeSession?.data?.id

  if (!paymentIntentId) {
    throw new Error(
      `Stripe payment session for cart ${cartId} did not expose a payment intent id.`
    )
  }

  const confirmBody = new URLSearchParams()
  confirmBody.set("payment_method", "pm_card_visa")
  confirmBody.set("return_url", returnUrl)

  const paymentIntent = await fetchStripeJson<{
    id?: string
    status?: string
    amount_capturable?: number
    last_payment_error?: { message?: string | null } | null
  }>(
    `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`,
    stripeApiKey,
    confirmBody
  )

  if (
    paymentIntent.status !== "requires_capture" &&
    paymentIntent.status !== "succeeded"
  ) {
    throw new Error(
      `Stripe payment intent ${paymentIntent.id ?? paymentIntentId} did not authorize. Status: ${paymentIntent.status ?? "<missing>"}${paymentIntent.last_payment_error?.message ? ` (${paymentIntent.last_payment_error.message})` : ""}`
    )
  }

  const completion = await fetchJson<{
    type?: string
    order?: {
      id?: string | null
      status?: string | null
      payment_status?: string | null
      display_id?: number | null
    }
    error?: string | null
    message?: string | null
  }>(`${apiBase}/store/carts/${cartId}/complete`, {
    method: "POST",
    headers,
  })

  if (completion.type !== "order" || !completion.order?.id) {
    throw new Error(
      `Cart completion did not return an order. Response type: ${completion.type ?? "<missing>"}. ${completion.message ?? completion.error ?? ""}`.trim()
    )
  }

  console.log(`Verified Stripe checkout against ${apiBase}`)
  console.log(`Region: ${region.name ?? region.id} (${region.id})`)
  console.log(
    `Product: ${selection.product.title ?? selection.product.id} -> variant ${selection.variant.id}`
  )
  console.log(`Shipping option: ${shippingOption.name ?? shippingOption.id}`)
  console.log(
    `Payment intent: ${paymentIntent.id ?? paymentIntentId} (${paymentIntent.status})`
  )
  console.log(
    `Order created: ${completion.order.id} (display_id=${completion.order.display_id ?? "n/a"}, status=${completion.order.status ?? "n/a"}, payment_status=${completion.order.payment_status ?? "n/a"})`
  )
}

function pickRegion(regions: Region[]) {
  return (
    regions.find((region) =>
      (region.countries ?? []).some((country) => country.iso_2 === "il")
    ) ?? regions[0]
  )
}

function pickPurchasableVariant(products: Product[]) {
  for (const product of products) {
    const variant = (product.variants ?? []).find(
      (entry) => (entry.calculated_price?.calculated_amount ?? 0) > 0
    )

    if (variant) {
      return { product, variant }
    }
  }

  return null
}

function buildAddress() {
  return {
    first_name: "Stripe",
    last_name: "Tester",
    address_1: "1 Herzl St",
    city: "Tel Aviv",
    country_code: "il",
    postal_code: "6100001",
    phone: "+972501234567",
  }
}

async function assertBackendUp(apiBase: string) {
  const response = await fetch(`${apiBase}/health`)

  if (!response.ok) {
    throw new Error(
      `Medusa backend is not reachable at ${apiBase}: ${response.status} ${response.statusText}`
    )
  }
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const text = await response.text()
  const body = text ? tryParseJson(text) : null

  if (!response.ok) {
    throw new Error(
      `Request failed: ${init?.method ?? "GET"} ${url} -> ${response.status} ${response.statusText}${body ? ` - ${JSON.stringify(body)}` : text ? ` - ${text}` : ""}`
    )
  }

  return (body ?? {}) as T
}

async function fetchStripeJson<T>(
  url: string,
  stripeApiKey: string,
  body: URLSearchParams
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${stripeApiKey}:`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  })

  const text = await response.text()
  const parsed = text ? tryParseJson(text) : null

  if (!response.ok) {
    throw new Error(
      `Stripe request failed: ${response.status} ${response.statusText}${parsed ? ` - ${JSON.stringify(parsed)}` : text ? ` - ${text}` : ""}`
    )
  }

  return (parsed ?? {}) as T
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
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