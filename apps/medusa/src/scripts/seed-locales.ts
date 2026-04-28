import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

/**
 * Ensures EN / AR / HE exist for the Translation module (store + admin).
 * Idempotent: skips locales that already exist (by code).
 */
const DEFAULT_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
]

export default async function seedLocales({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const translation = container.resolve(Modules.TRANSLATION)

  const existing = await translation.listLocales()
  const codes = new Set(existing.map((l) => l.code.toLowerCase()))

  for (const loc of DEFAULT_LOCALES) {
    if (codes.has(loc.code.toLowerCase())) {
      logger.info(`Locale ${loc.code} already exists — skipping`)
      continue
    }
    await translation.createLocales(loc)
    logger.info(`Created locale ${loc.code} (${loc.name})`)
    codes.add(loc.code.toLowerCase())
  }

  logger.info('Locale seed finished.')
}
