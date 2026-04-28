import { getLocale } from "@lib/data/locale-actions"

const DEFAULT_STORE_LOCALE = "en"

export async function getLocaleHeader() {
  const locale = (await getLocale()) ?? DEFAULT_STORE_LOCALE
  return {
    "x-medusa-locale": locale,
  } as const
}
