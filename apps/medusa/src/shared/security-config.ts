const DEV_JWT_SECRET_FALLBACK =
  'dev-jwt-secret-change-before-production-8f0d0f8f3baf4b5bb0d33a2862b0a6c1'
const DEV_COOKIE_SECRET_FALLBACK =
  'dev-cookie-secret-change-before-production-5b6b3a00a06145b588e8f8a2f3d1e6c4'

const WEAK_SECRET_VALUES = new Set([
  'supersecret',
  'secret',
  'changeme',
  'change-me',
  'default',
  'password',
])

const MIN_SECRET_LENGTH = 32

type HttpSecurityConfigInput = {
  nodeEnv?: string
  storeCors?: string
  adminCors?: string
  authCors?: string
  jwtSecret?: string
  cookieSecret?: string
}

export type HttpSecurityConfig = {
  storeCors: string
  adminCors: string
  authCors: string
  jwtSecret: string
  cookieSecret: string
}

const readNonEmpty = (value?: string) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const isWeakSecret = (value?: string) => {
  const secret = readNonEmpty(value)

  if (!secret) {
    return true
  }

  return secret.length < MIN_SECRET_LENGTH || WEAK_SECRET_VALUES.has(secret.toLowerCase())
}

const requireEnvValue = (name: string, value?: string) => {
  const normalized = readNonEmpty(value)

  if (!normalized) {
    throw new Error(`${name} must be set in the Medusa environment.`)
  }

  return normalized
}

const resolveSecret = (input: {
  name: 'JWT_SECRET' | 'COOKIE_SECRET'
  value?: string
  nodeEnv?: string
  fallback: string
}) => {
  if (!isWeakSecret(input.value)) {
    return readNonEmpty(input.value) as string
  }

  if (input.nodeEnv === 'production') {
    throw new Error(
      `${input.name} must be set to a strong secret with at least ${MIN_SECRET_LENGTH} characters and must not use predictable defaults.`
    )
  }

  return input.fallback
}

export const resolveHttpSecurityConfig = (
  input: HttpSecurityConfigInput
): HttpSecurityConfig => {
  return {
    storeCors: requireEnvValue('STORE_CORS', input.storeCors),
    adminCors: requireEnvValue('ADMIN_CORS', input.adminCors),
    authCors: requireEnvValue('AUTH_CORS', input.authCors),
    jwtSecret: resolveSecret({
      name: 'JWT_SECRET',
      value: input.jwtSecret,
      nodeEnv: input.nodeEnv,
      fallback: DEV_JWT_SECRET_FALLBACK,
    }),
    cookieSecret: resolveSecret({
      name: 'COOKIE_SECRET',
      value: input.cookieSecret,
      nodeEnv: input.nodeEnv,
      fallback: DEV_COOKIE_SECRET_FALLBACK,
    }),
  }
}