import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import { getLocale } from "@lib/data/locale-actions"
import { listLocales } from "@lib/data/locales"
import LanguageQaSwitch from "@modules/layout/components/language-qa-switch"
import MedusaCTA from "@modules/layout/components/medusa-cta"

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [locales, currentLocale] = await Promise.all([listLocales(), getLocale()])

  return (
    <div className="w-full bg-white relative small:min-h-screen">
      <div className="h-16 bg-white border-b ">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base ">
              Back to shopping cart
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
              Back
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base uppercase"
            data-testid="store-link"
          >
            Medusa Store
          </LocalizedClientLink>
          <div className="flex-1 basis-0 flex justify-end">
            <LanguageQaSwitch
              locales={locales}
              currentLocale={currentLocale}
              compact
            />
          </div>
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">{children}</div>
      <div className="py-4 w-full flex items-center justify-center">
        <MedusaCTA />
      </div>
    </div>
  )
}
