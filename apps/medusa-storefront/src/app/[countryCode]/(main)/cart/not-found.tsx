import { Metadata } from "next"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"

import InteractiveLink from "@modules/common/components/interactive-link"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()

  return {
    title: "404",
    description: getUiCopy(locale, "metaGenericErrorDescription"),
  }
}

export default async function NotFound() {
  const locale = await getLocale()

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">{getUiCopy(locale, "pageNotFoundTitle")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {getUiCopy(locale, "cartNotFoundDescription")}
      </p>
      <InteractiveLink href="/">{getUiCopy(locale, "pageNotFoundCta")}</InteractiveLink>
    </div>
  )
}
