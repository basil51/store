const checkEnvVariables = require("./check-env-variables")
const { buildImageRemotePatterns } = require("./image-remote-patterns")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME
const IMAGE_REMOTE_PATTERNS = process.env.NEXT_IMAGE_REMOTE_PATTERNS

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    dangerouslyAllowLocalIP: true,
    qualities: [60, 75],
    remotePatterns: buildImageRemotePatterns({
      s3Hostname: S3_HOSTNAME,
      s3Pathname: S3_PATHNAME,
      additionalRemotePatterns: IMAGE_REMOTE_PATTERNS,
    }),
  },
}

module.exports = nextConfig
