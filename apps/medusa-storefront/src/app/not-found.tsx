import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import { Metadata } from "next"
import Link from "next/link"

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
      <h1 className="text-2xl-semi text-ui-fg-base">{getUiCopy(locale, "pageNotFoundTitle")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {getUiCopy(locale, "pageNotFoundDescription")}
      </p>
      <Link
        className="flex gap-x-1 items-center group"
        href="/"
      >
        <Text className="text-ui-fg-interactive">{getUiCopy(locale, "pageNotFoundCta")}</Text>
        <ArrowUpRightMini
          className="group-hover:rotate-45 ease-in-out duration-150"
          color="var(--fg-interactive)"
        />
      </Link>
    </div>
  )
}
