const DEFAULT_REMOTE_PATTERNS = [
  {
    protocol: "http",
    hostname: "localhost",
    port: "9100",
    pathname: "/medusa/**",
  },
  {
    // MinIO running locally (Docker host)
    protocol: "http",
    hostname: "127.0.0.1",
    port: "9100",
    pathname: "/medusa/**",
  },
  {
    protocol: "https",
    hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
  },
  {
    protocol: "https",
    hostname: "medusa-server-testing.s3.amazonaws.com",
  },
  {
    protocol: "https",
    hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
  },
]

const normalizePathname = (pathname) => {
  if (!pathname || pathname === "/") {
    return "/**"
  }

  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`

  if (normalized.includes("*")) {
    return normalized
  }

  return `${normalized.replace(/\/$/, "")}/**`
}

const parseRemotePatternUrl = (rawPattern) => {
  const pattern = rawPattern.trim()

  if (!pattern) {
    return null
  }

  let url

  try {
    url = new URL(pattern)
  } catch {
    throw new Error(
      `Invalid NEXT_IMAGE_REMOTE_PATTERNS entry "${pattern}". Use absolute URLs like "https://cdn.example.com/medusa/**".`
    )
  }

  const protocol = url.protocol.replace(":", "")

  if (protocol !== "http" && protocol !== "https") {
    throw new Error(
      `Invalid image remote pattern protocol "${protocol}" in "${pattern}". Use http or https.`
    )
  }

  return {
    protocol,
    hostname: url.hostname,
    ...(url.port ? { port: url.port } : {}),
    pathname: normalizePathname(url.pathname),
  }
}

const parseRemotePatternList = (value) => {
  if (!value) {
    return []
  }

  return value
    .split(",")
    .map(parseRemotePatternUrl)
    .filter(Boolean)
}

const getMedusaCloudRemotePatterns = (hostname, pathname) => {
  if (!hostname || !pathname) {
    return []
  }

  return [
    {
      protocol: "https",
      hostname,
      pathname: normalizePathname(pathname),
    },
  ]
}

const buildImageRemotePatterns = ({
  s3Hostname,
  s3Pathname,
  additionalRemotePatterns,
} = {}) => [
  ...DEFAULT_REMOTE_PATTERNS,
  ...getMedusaCloudRemotePatterns(s3Hostname, s3Pathname),
  ...parseRemotePatternList(additionalRemotePatterns),
]

module.exports = {
  buildImageRemotePatterns,
  parseRemotePatternList,
}
