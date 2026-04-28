import { processPaymentWorkflowId } from "@medusajs/core-flows"
import {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import {
  Modules,
  PaymentActions,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"

export default async function paymentWebhookSubscriber({
  event,
  container,
}: SubscriberArgs<{
  provider: string
  payload: {
    data: Record<string, unknown>
    rawData: string | Buffer | { type?: string; data?: number[] }
    headers: Record<string, unknown>
  }
}>) {
  const paymentService = container.resolve(Modules.PAYMENT)
  const rawData = event.data.payload.rawData
  const normalizedRawData =
    typeof rawData === "object" &&
    "type" in rawData &&
    rawData.type === "Buffer"
      ? Buffer.from(rawData.data ?? [])
      : rawData

  if (
    !normalizedRawData ||
    (typeof normalizedRawData !== "string" && !Buffer.isBuffer(normalizedRawData))
  ) {
    return
  }

  const processedEvent = await paymentService.getWebhookActionAndData({
    provider: event.data.provider,
    payload: {
      data: event.data.payload.data,
      rawData: normalizedRawData,
      headers: event.data.payload.headers,
    },
  })

  if (!processedEvent.data) {
    return
  }

  if (
    processedEvent.action === PaymentActions.NOT_SUPPORTED ||
    processedEvent.action === PaymentActions.CANCELED ||
    processedEvent.action === PaymentActions.FAILED ||
    processedEvent.action === PaymentActions.REQUIRES_MORE
  ) {
    return
  }

  const workflowEngine = container.resolve(Modules.WORKFLOW_ENGINE)

  await workflowEngine.run(processPaymentWorkflowId, {
    input: processedEvent,
  })
}

export const config: SubscriberConfig = {
  event: PaymentWebhookEvents.WebhookReceived,
  context: {
    subscriberId: "local-payment-webhook-subscriber",
  },
}