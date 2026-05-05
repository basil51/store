import {
  canUseDefaultPublishableKeyFallback,
  resolveTenantPublishableKey,
  TENANT_COOKIE_NAME,
  TENANT_PUBLISHABLE_KEY_COOKIE_NAME,
} from "@lib/util/tenant"
import { validateTrustedOrigin } from "@lib/util/trusted-origin"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const resolveBackendUrl = () =>
  process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "") ?? "http://localhost:9000"

export async function POST(req: NextRequest) {
  const trustedOriginResult = validateTrustedOrigin(req)

  if (!trustedOriginResult.ok) {
    return trustedOriginResult.response
  }

  const backendUrl = resolveBackendUrl()
  const cookieStore = await cookies()
  const tenantSlug = cookieStore.get(TENANT_COOKIE_NAME)?.value ?? null
  const tenantPublishableKey =
    cookieStore.get(TENANT_PUBLISHABLE_KEY_COOKIE_NAME)?.value ?? null
  const publishableKey = resolveTenantPublishableKey({
    tenantSlug,
    tenantPublishableKey,
    defaultPublishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  })

  if (!publishableKey) {
    return NextResponse.json(
      {
        message: !canUseDefaultPublishableKeyFallback(tenantSlug)
          ? `Tenant '${tenantSlug}' is missing a publishable API key for analytics sink.`
          : "Missing publishable API key for analytics sink.",
      },
      { status: 500 }
    )
  }

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { message: "Analytics payload must be valid JSON." },
      { status: 400 }
    )
  }

  const forwardedFor = req.headers.get("x-forwarded-for")
  const userAgent = req.headers.get("user-agent")

  try {
    const response = await fetch(`${backendUrl}/store/analytics/recommendation`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": publishableKey,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        ...(userAgent ? { "user-agent": userAgent } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const responseBody = await response
      .json()
      .catch(() => ({ accepted: response.ok }))

    return NextResponse.json(responseBody, { status: response.status })
  } catch {
    return NextResponse.json(
      { message: "Unable to reach analytics sink backend." },
      { status: 502 }
    )
  }
}