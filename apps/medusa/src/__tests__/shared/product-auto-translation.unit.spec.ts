import {
  buildFallbackProductTranslation,
  detectProductSourceLocale,
  getMissingProductTranslationLocales,
  isAutoProductTranslationEnabled,
  mergeProductTranslationFields,
  resolveAvailableLocaleCode,
  resolveAutoTranslationConfig,
} from "../../shared/product-auto-translation"

describe("product auto translation helpers", () => {
  it("detects Arabic and Hebrew source content from the entered product text", () => {
    expect(
      detectProductSourceLocale({
        product: { id: "prod_1", title: "ايفون 14 برو" },
        availableLocales: ["en", "ar", "he"],
      })
    ).toBe("ar")

    expect(
      detectProductSourceLocale({
        product: { id: "prod_2", title: "אייפון 14 פרו" },
        availableLocales: ["en", "ar", "he"],
      })
    ).toBe("he")
  })

  it("uses the configured fallback locale for Latin product content", () => {
    expect(
      detectProductSourceLocale({
        product: { id: "prod_3", title: "iPhone 14 Pro Max" },
        availableLocales: ["en-US", "ar", "he"],
        fallbackLocale: "en",
      })
    ).toBe("en-US")
  })

  it("maps configured locale families to the existing translation-module locale code", () => {
    expect(
      resolveAvailableLocaleCode({
        requestedLocale: "en",
        availableLocales: ["en-US", "ar", "he"],
      })
    ).toBe("en-US")
  })

  it("only targets locales that do not already have content", () => {
    expect(
      getMissingProductTranslationLocales({
        sourceLocale: "en",
        targetLocales: ["en", "ar", "he"],
        existingTranslations: [
          {
            id: "tr_1",
            locale_code: "ar",
            translations: { title: "ايفون 14 برو" },
          },
        ],
      })
    ).toEqual(["he"])
  })

  it("preserves existing translated fields when filling a partial translation", () => {
    expect(
      mergeProductTranslationFields({
        existing: {
          id: "tr_2",
          locale_code: "ar",
          translations: { title: "ايفون 14 برو", subtitle: "", description: "" },
        },
        generated: {
          title: "عنوان آلي",
          subtitle: "عنوان فرعي آلي",
          description: "وصف آلي",
        },
      })
    ).toEqual({
      title: "ايفون 14 برو",
      subtitle: "عنوان فرعي آلي",
      description: "وصف آلي",
    })
  })

  it("uses fallback copy when AI config is not present", () => {
    const config = resolveAutoTranslationConfig(["en", "ar", "he"])

    expect(isAutoProductTranslationEnabled()).toBe(true)
    expect(config.ai.apiKey).toBeNull()
    expect(buildFallbackProductTranslation({
      id: "prod_4",
      title: "Gaming Laptop",
      subtitle: "RTX Edition",
      description: "Fast laptop",
    })).toEqual({
      title: "Gaming Laptop",
      subtitle: "RTX Edition",
      description: "Fast laptop",
    })
  })
})