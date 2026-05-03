import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { resolveHttpSecurityConfig } from './src/shared/security-config'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const httpSecurityConfig = resolveHttpSecurityConfig({
  nodeEnv: process.env.NODE_ENV,
  storeCors: process.env.STORE_CORS,
  adminCors: process.env.ADMIN_CORS,
  authCors: process.env.AUTH_CORS,
  jwtSecret: process.env.JWT_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
})

const s3Configured =
  !!process.env.S3_BUCKET &&
  !!process.env.S3_ENDPOINT &&
  !!process.env.S3_ACCESS_KEY_ID &&
  !!process.env.S3_SECRET_ACCESS_KEY &&
  !!process.env.S3_FILE_URL

const s3FileModule = s3Configured
  ? {
      resolve: '@medusajs/medusa/file' as const,
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/file-s3' as const,
            id: 's3',
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION ?? 'us-east-1',
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          },
        ],
      },
    }
  : null

const stripeConfigured =
  !!process.env.STRIPE_API_KEY && !!process.env.STRIPE_WEBHOOK_SECRET

const paypalConfigured =
  !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET

const paymentProviders = [
  ...(stripeConfigured
    ? [
        {
          resolve: '@medusajs/medusa/payment-stripe' as const,
          id: 'stripe',
          options: {
            apiKey: process.env.STRIPE_API_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            capture: process.env.STRIPE_CAPTURE === 'true',
            automaticPaymentMethods:
              process.env.STRIPE_AUTOMATIC_PAYMENT_METHODS !== 'false',
          },
        },
      ]
    : []),
  ...(paypalConfigured
    ? [
        {
          resolve: './src/modules/paypal' as const,
          id: 'paypal',
          options: {
            client_id: process.env.PAYPAL_CLIENT_ID,
            client_secret: process.env.PAYPAL_CLIENT_SECRET,
            environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
            autoCapture: process.env.PAYPAL_AUTO_CAPTURE === 'true',
            webhook_id: process.env.PAYPAL_WEBHOOK_ID,
          },
        },
      ]
    : []),
]

const paymentModule = paymentProviders.length
  ? {
      resolve: '@medusajs/medusa/payment' as const,
      options: {
        providers: paymentProviders,
      },
    }
  : null

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: httpSecurityConfig.storeCors,
      adminCors: httpSecurityConfig.adminCors,
      authCors: httpSecurityConfig.authCors,
      jwtSecret: httpSecurityConfig.jwtSecret,
      cookieSecret: httpSecurityConfig.cookieSecret,
    },
  },
  modules: [
    { resolve: '@medusajs/medusa/translation' },
    ...(s3FileModule ? [s3FileModule] : []),
    ...(paymentModule ? [paymentModule] : []),
  ],
  featureFlags: {
    translation: true,
  },
})
