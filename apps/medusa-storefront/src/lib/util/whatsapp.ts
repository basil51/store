import { normalizeUiLocale, type UiLocale } from "@lib/ui-copy"

type WhatsAppTemplateValue = string | number | null | undefined

type WhatsAppTemplateInput = {
  template: string
  replacements: Record<string, WhatsAppTemplateValue>
}

export type LocalizedWhatsAppTemplates = Record<UiLocale, string>

export const DEFAULT_WHATSAPP_TEMPLATES: LocalizedWhatsAppTemplates = {
  en: "Hello! I'd like to order:\n{{items}}\nTotal: {{total}}\n{{customer_note}}",
  ar: "مرحباً! أود طلب:\n{{items}}\nالإجمالي: {{total}}\n{{customer_note}}",
  he: "שלום! אני רוצה להזמין:\n{{items}}\nסה״כ: {{total}}\n{{customer_note}}",
}

const cleanWhatsAppTemplate = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function normalizeWhatsAppTemplates(
  value: unknown,
  legacyTemplate?: unknown
): LocalizedWhatsAppTemplates {
  const templates =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<UiLocale, unknown>>)
      : {}

  const englishTemplate =
    cleanWhatsAppTemplate(templates.en) ??
    cleanWhatsAppTemplate(legacyTemplate) ??
    DEFAULT_WHATSAPP_TEMPLATES.en

  return {
    en: englishTemplate,
    ar: cleanWhatsAppTemplate(templates.ar) ?? DEFAULT_WHATSAPP_TEMPLATES.ar,
    he: cleanWhatsAppTemplate(templates.he) ?? DEFAULT_WHATSAPP_TEMPLATES.he,
  }
}

export function getWhatsAppTemplateForLocale({
  templates,
  locale,
  fallbackTemplate,
}: {
  templates?: unknown
  locale: string | null | undefined
  fallbackTemplate?: unknown
}) {
  const normalizedTemplates = normalizeWhatsAppTemplates(
    templates,
    fallbackTemplate
  )

  return normalizedTemplates[normalizeUiLocale(locale)] ?? normalizedTemplates.en
}

export function normalizeWhatsAppNumber(input: string) {
  return input.replace(/[^\d]/g, "")
}

export function applyWhatsAppTemplate({
  template,
  replacements,
}: WhatsAppTemplateInput) {
  return template
    .replace(/\r\n/g, "\n")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (!Object.prototype.hasOwnProperty.call(replacements, key)) {
        return match
      }

      const value = replacements[key]

      return value === null || value === undefined ? "" : String(value)
    })
    .trim()
}

export function buildWhatsAppCustomerNote({
  note,
  label,
}: {
  note: string | null | undefined
  label: string
}) {
  const trimmedNote = typeof note === "string" ? note.trim() : ""

  if (!trimmedNote) {
    return ""
  }

  return `${label}: ${trimmedNote}`
}

export function buildWhatsAppLink(number: string, message: string) {
  const normalized = normalizeWhatsAppNumber(number)
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
