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

type PaymentSession = {
  provider_id?: string | null
  status?: string | null
  data?: {
    order_id?: string | null
    approval_url?: string | null
    intent?: string | null
    status?: string | null
  } | null
}

const DEFAULT_API_BASE = "http://127.0.0.1:9244"
const PAYPAL_PROVIDER_ID = "pp_paypal_paypal"
const storefrontEnvPath = path.resolve(
  process.cwd(),
  "../medusa-storefront/.env.local"
)

export default async function verifyPayPalPaymentSession({ args }: ExecArgs) {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs
  const normalizedArgs = candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs
  const apiBaseArg = normalizedArgs.find(
    (value) => value.startsWith("http://") || value.startsWith("https://")
  )
  const publishableKeyArg = normalizedArgs.find((value) => value.startsWith("pk_"))

  const apiBase = apiBaseArg ?? process.env.MEDUSA_BACKEND_URL ?? DEFAULT_API_BASE
  const publishableApiKey =
    publishableKeyArg ??
    process.env.STORE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
    readEnvValue(storefrontEnvPath, "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")

  if (!publishableApiKey) {
    throw new Error(
      "Missing publishable API key. Pass it as an argument, set STORE_PUBLISHABLE_KEY, or set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in the storefront env."
    )
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
  productsUrl.searchParams.set("fields", "id,title,*variants.calculated_price")

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

  await fetchJson(`${apiBase}/store/carts/${cartId}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      variant_id: selection.variant.id,
      quantity: 1,
    }),
  })

  await fetchJson(`${apiBase}/store/carts/${cartId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "paypal-checkout-test@example.com",
      shipping_address: buildAddress(),
      billing_address: buildAddress(),
    }),
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
      payment_sessions?: PaymentSession[]
    }
  }>(`${apiBase}/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ provider_id: PAYPAL_PROVIDER_ID }),
  })

  const paypalSession = paymentSessions.payment_collection?.payment_sessions?.find(
    (session) => session.provider_id === PAYPAL_PROVIDER_ID
  )
  const orderId = paypalSession?.data?.order_id
  const approvalUrl = paypalSession?.data?.approval_url

  if (!paypalSession) {
    throw new Error(
      `PayPal payment session was not returned for cart ${cartId}.`
    )
  }

  if (!orderId) {
    throw new Error(
      `PayPal session for cart ${cartId} did not expose an order_id.`
    )
  }

  if (!approvalUrl) {
    throw new Error(
      `PayPal session for cart ${cartId} did not expose an approval_url.`
    )
  }

  console.log(`Verified PayPal payment-session creation against ${apiBase}`)
  console.log(`Region: ${region.name ?? region.id} (${region.id})`)
  console.log(
    `Product: ${selection.product.title ?? selection.product.id} -> variant ${selection.variant.id}`
  )
  console.log(`Shipping option: ${shippingOption.name ?? shippingOption.id}`)
  console.log(`Cart: ${cartId}`)
  console.log(`Payment collection: ${paymentCollectionId}`)
  console.log(`PayPal order id: ${orderId}`)
  console.log(`PayPal intent: ${paypalSession.data?.intent ?? "n/a"}`)
  console.log(`PayPal session status: ${paypalSession.status ?? "n/a"}`)
  console.log(`Approval URL: ${approvalUrl}`)
  console.log(
    "Next: open the approval URL in a browser, approve the sandbox payment, return to the storefront, and confirm order completion plus webhook behavior if PAYPAL_WEBHOOK_ID is configured."
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
    first_name: "PayPal",
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