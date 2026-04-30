import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { getLocale } from "@lib/data/locale-actions"
import { getAccountCopy } from "@modules/account/account-copy"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: getAccountCopy(locale, "metaAddressesTitle"),
    description: getAccountCopy(locale, "metaAddressesDescription"),
  }
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const [customer, region, locale] = await Promise.all([
    retrieveCustomer(),
    getRegion(countryCode),
    getLocale(),
  ])
  const t = (key: Parameters<typeof getAccountCopy>[1]) => getAccountCopy(locale, key)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("shippingAddressesTitle")}</h1>
        <p className="text-base-regular">
          {t("shippingAddressesDescription")}
        </p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
