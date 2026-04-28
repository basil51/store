import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type ProductLike = {
  id: string
  title?: string | null
  description?: string | null
}

export default async function upsertProductTranslation({
  container,
  args,
}: ExecArgs) {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs
  const normalizedArgs =
    candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs

  const productHandle = normalizedArgs[0]
  const localeCode = normalizedArgs[1] ?? "ar"
  const customTitle = normalizedArgs[2]
  const customDescription = normalizedArgs[3]

  if (!productHandle) {
    throw new Error(
      "Missing product handle. Usage: medusa exec ./src/scripts/upsert-product-translation.ts <productHandle> [localeCode] [title] [description]"
    )
  }

  const productModule = container.resolve(Modules.PRODUCT)
  const translationModule = container.resolve(Modules.TRANSLATION)

  const products = (await productModule.listProducts({
    handle: productHandle,
  })) as ProductLike[]

  const product = products[0]

  if (!product) {
    throw new Error(`No product found for handle '${productHandle}'.`)
  }

  const existingLocales = await translationModule.listLocales({ code: localeCode })
  if (!existingLocales.length) {
    await translationModule.createLocales({
      code: localeCode,
      name: localeCode,
    })
    console.log(`Created locale '${localeCode}'.`)
  }

  const title =
    customTitle ??
    (localeCode.toLowerCase().startsWith("ar")
      ? `نسخة عربية: ${product.title ?? "منتج"}`
      : `${localeCode.toUpperCase()}: ${product.title ?? "Product"}`)

  const description =
    customDescription ??
    (localeCode.toLowerCase().startsWith("ar")
      ? `وصف عربي: ${product.description ?? ""}`
      : `${localeCode.toUpperCase()} description: ${product.description ?? ""}`)

  const existingTranslations = await translationModule.listTranslations({
    reference: "product",
    reference_id: product.id,
    locale_code: localeCode,
  })

  if (existingTranslations.length) {
    const current = existingTranslations[0]
    const merged = {
      ...(current.translations ?? {}),
      title,
      description,
    }

    await translationModule.updateTranslations({
      id: current.id,
      translations: merged,
    })

    console.log(
      `Updated translation for product '${productHandle}' (${product.id}) in locale '${localeCode}'.`
    )
  } else {
    await translationModule.createTranslations({
      reference: "product",
      reference_id: product.id,
      locale_code: localeCode,
      translations: {
        title,
        description,
      },
    })

    console.log(
      `Created translation for product '${productHandle}' (${product.id}) in locale '${localeCode}'.`
    )
  }

  console.log(`title=${JSON.stringify(title)}`)
  console.log(`description=${JSON.stringify(description)}`)
}