import { describe, expect, it } from "vitest"

import {
  DEFAULT_WHATSAPP_TEMPLATES,
  applyWhatsAppTemplate,
  buildWhatsAppCustomerNote,
  getWhatsAppTemplateForLocale,
  normalizeWhatsAppTemplates,
} from "./whatsapp"

describe("whatsapp", () => {
  it("keeps unknown placeholders unchanged", () => {
    expect(
      applyWhatsAppTemplate({
        template: "Hello {{customer_name}}",
        replacements: {},
      })
    ).toBe("Hello {{customer_name}}")
  })

  it("trims trailing whitespace after optional replacements", () => {
    expect(
      applyWhatsAppTemplate({
        template: "Hello!\n{{items}}\n{{customer_note}}\n",
        replacements: {
          items: "1x Test product",
          customer_note: "",
        },
      })
    ).toBe("Hello!\n1x Test product")
  })

  it("formats a customer note with a localized label", () => {
    expect(
      buildWhatsAppCustomerNote({
        note: "Please ring the bell",
        label: "Note",
      })
    ).toBe("Note: Please ring the bell")
  })

  it("returns an empty string when the customer note is blank", () => {
    expect(
      buildWhatsAppCustomerNote({
        note: "   ",
        label: "Note",
      })
    ).toBe("")
  })

  it("keeps localized defaults when only a legacy english template exists", () => {
    expect(normalizeWhatsAppTemplates(undefined, "Legacy order template")).toEqual({
      en: "Legacy order template",
      ar: DEFAULT_WHATSAPP_TEMPLATES.ar,
      he: DEFAULT_WHATSAPP_TEMPLATES.he,
    })
  })

  it("selects the locale-specific template using normalized locale codes", () => {
    expect(
      getWhatsAppTemplateForLocale({
        templates: {
          en: "Hello",
          ar: "مرحبا",
          he: "שלום",
        },
        locale: "he-IL",
        fallbackTemplate: "Fallback",
      })
    ).toBe("שלום")
  })
})