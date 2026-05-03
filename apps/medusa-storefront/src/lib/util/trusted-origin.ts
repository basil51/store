import { headers as nextHeaders } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const extractOrigin = (value: string | null) => {
  if (!value) {
    return null
  }

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const extractHeaderValue = (headers: Pick<Headers, "get">, name: string) => {
  const value = headers.get(name)?.split(",")[0]?.trim()
  return value ? value : null
}

export const getTrustedRequestOriginFromHeaders = (
  headers: Pick<Headers, "get">
) => {
  const originHeader = extractOrigin(headers.get("origin"))

  if (originHeader) {
    return originHeader
  }

  return extractOrigin(headers.get("referer"))
}

export const getTrustedRequestOrigin = (
  req: Pick<NextRequest, "headers" | "nextUrl">
) => {
  return getTrustedRequestOriginFromHeaders(req.headers)
}

export const getServerActionRequestOrigin = (
  headers: Pick<Headers, "get">
) => {
  const host =
    extractHeaderValue(headers, "x-forwarded-host") ??
    extractHeaderValue(headers, "host")

  if (!host) {
    return null
  }

  const forwardedProto = extractHeaderValue(headers, "x-forwarded-proto")

  if (forwardedProto) {
    return `${forwardedProto}://${host}`
  }

  const trustedOrigin = getTrustedRequestOriginFromHeaders(headers)

  if (trustedOrigin) {
    const protocol = new URL(trustedOrigin).protocol
    return `${protocol}//${host}`
  }

  return `http://${host}`
}

type TrustedOriginValidationResult =
  | { ok: true }
  | { ok: false; message: string }

export const validateTrustedOriginHeaders = (
  headers: Pick<Headers, "get">,
  requestOrigin: string | null
): TrustedOriginValidationResult => {
  const trustedOrigin = getTrustedRequestOriginFromHeaders(headers)

  if (!trustedOrigin || !requestOrigin) {
    return {
      ok: false,
      message: "Missing trusted origin for state-changing request.",
    }
  }

  if (trustedOrigin !== requestOrigin) {
    return {
      ok: false,
      message: "Cross-origin state-changing request rejected.",
    }
  }

  return { ok: true }
}

export const validateTrustedOrigin = (
  req: Pick<NextRequest, "headers" | "nextUrl">
): { ok: true } | { ok: false; response: NextResponse } => {
  const result = validateTrustedOriginHeaders(req.headers, req.nextUrl.origin)

  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: result.message },
        { status: 403 }
      ),
    }
  }

  return { ok: true }
}

export const ensureTrustedServerActionRequest = async () => {
  const requestHeaders = await nextHeaders()
  const result = validateTrustedOriginHeaders(
    requestHeaders,
    getServerActionRequestOrigin(requestHeaders)
  )

  if (!result.ok) {
    throw new Error(result.message)
  }
}