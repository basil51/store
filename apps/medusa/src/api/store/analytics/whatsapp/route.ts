import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensureWhatsAppAnalyticsTable,
  insertWhatsAppAnalyticsEvent,
  normalizeWhatsAppAnalyticsEvent,
} from "../../../../shared/whatsapp-analytics"

const readHeader = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

const readIpAddress = (req: MedusaRequest) => {
  const forwarded = readHeader(req.headers?.["x-forwarded-for"])?.split(",")[0]

  if (forwarded) {
    return forwarded.trim()
  }

  return readHeader(req.ip)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = normalizeWhatsAppAnalyticsEvent(req.body)

  if ("error" in parsed) {
    return res.status(400).json({ message: parsed.error })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
    error?: (message: string, meta?: unknown) => void
  }
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  try {
    await ensureWhatsAppAnalyticsTable(db)
    await insertWhatsAppAnalyticsEvent(db, parsed.value, {
      requestHost: readHeader(req.headers?.host),
      requestPath: readHeader(req.path),
      userAgent: readHeader(req.headers?.["user-agent"]),
      ipAddress: readIpAddress(req),
    })

    return res.status(202).json({ accepted: true })
  } catch (error) {
    logger.error?.("Failed to store WhatsApp analytics event", {
      message: error instanceof Error ? error.message : String(error),
      event: parsed.value.eventName,
    })

    return res.status(500).json({ message: "Failed to store analytics event." })
  }
}