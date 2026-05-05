import { retrieveCart } from "@lib/data/cart"
import { getStorefrontSettings } from "@lib/data/currency"
import { retrieveCustomer } from "@lib/data/customer"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()

  return {
    title: getUiCopy(locale, "cartTitle"),
    description: getUiCopy(locale, "metaCartDescription"),
  }
}

export default async function Cart() {
  const storeSettings = await getStorefrontSettings()
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  return <CartTemplate cart={cart} customer={customer} storeSettings={storeSettings} />
}
