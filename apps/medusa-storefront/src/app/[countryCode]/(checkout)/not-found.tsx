import InteractiveLink from "@modules/common/components/interactive-link"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import { Metadata } from "next"

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
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>
        {getUiCopy(locale, "pageNotFoundTitle")}
      </h1>
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        {getUiCopy(locale, "pageNotFoundDescription")}
      </p>
      <InteractiveLink href="/">{getUiCopy(locale, "pageNotFoundCta")}</InteractiveLink>
    </div>
  )
}
