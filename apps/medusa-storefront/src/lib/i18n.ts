const RTL_LANGUAGE_CODES = new Set(['ar', 'he', 'fa', 'ur'])

/**
 * BCP 47 primary language subtag → document text direction for storefront shell.
 */
export function getTextDirection(locale: string): 'rtl' | 'ltr' {
  const primary = locale.split(/[-_]/)[0]?.toLowerCase() ?? 'en'
  return RTL_LANGUAGE_CODES.has(primary) ? 'rtl' : 'ltr'
}
