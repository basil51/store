import { ExecArgs } from "@medusajs/framework/types"

const DEFAULT_BACKEND_URL = "http://localhost:9244"
const DEFAULT_PROVIDER_ID = "pp_stripe_stripe"

export default async function replayStripeWebhookEvent({ args }: ExecArgs) {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs
  const normalizedArgs =
    candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs

  const eventId = normalizedArgs.find((value) => value.startsWith("evt_"))
  const backendUrl =
    normalizedArgs.find(
      (value) => value.startsWith("http://") || value.startsWith("https://")
    ) ??
    process.env.MEDUSA_BACKEND_URL ??
    DEFAULT_BACKEND_URL
  const providerId =
    normalizedArgs.find((value) => value.startsWith("pp_")) ?? DEFAULT_PROVIDER_ID

  if (!eventId) {
    throw new Error(
      "Missing Stripe event id. Pass it after --, for example: medusa exec ./src/scripts/replay-stripe-webhook-event.ts -- evt_123"
    )
  }

  if (!process.env.STRIPE_API_KEY) {
    throw new Error("Missing STRIPE_API_KEY in apps/medusa/.env.")
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET in apps/medusa/.env.")
  }

  const eventResponse = await fetch(`https://api.stripe.com/v1/events/${eventId}`, {
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_API_KEY}`,
    },
  })

  const payload = await eventResponse.text()

  if (!eventResponse.ok) {
    throw new Error(
      `Failed to fetch Stripe event ${eventId}: ${eventResponse.status} ${eventResponse.statusText}${payload ? ` - ${payload}` : ""}`
    )
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = createStripeSignature(
    signedPayload,
    process.env.STRIPE_WEBHOOK_SECRET
  )
  const webhookUrl = `${backendUrl.replace(/\/$/, "")}/hooks/payment/${providerId}`

  const webhookResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  })

  const webhookText = await webhookResponse.text()

  if (!webhookResponse.ok) {
    throw new Error(
      `Webhook delivery failed for ${eventId}: ${webhookResponse.status} ${webhookResponse.statusText}${webhookText ? ` - ${webhookText}` : ""}`
    )
  }

  const event = JSON.parse(payload) as { id?: string; type?: string }

  console.log(`Replayed Stripe event ${event.id ?? eventId}`)
  console.log(`Type: ${event.type ?? "<unknown>"}`)
  console.log(`Webhook endpoint: ${webhookUrl}`)
  console.log(`Response: ${webhookResponse.status} ${webhookResponse.statusText}`)

  if (webhookText) {
    console.log(`Body: ${webhookText}`)
  }
}

function createStripeSignature(payload: string, secret: string) {
  return BunCrypto.createHmac("sha256", secret).update(payload).digest("hex")
}

const BunCrypto = {
  createHmac(algorithm: string, secret: string) {
    return require("node:crypto").createHmac(algorithm, secret)
  },
}