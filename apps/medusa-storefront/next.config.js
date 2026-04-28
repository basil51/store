const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

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
    remotePatterns: [
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
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
