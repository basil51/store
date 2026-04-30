import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import { getLocale } from "@lib/data/locale-actions"
import { getAccountCopy } from "@modules/account/account-copy"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: getAccountCopy(locale, "metaAccountTitle"),
    description: getAccountCopy(locale, "metaAccountDescription"),
  }
}

export default async function OverviewTemplate() {
  const [customer, orders, locale] = await Promise.all([
    retrieveCustomer().catch(() => null),
    listOrders().catch(() => null),
    getLocale(),
  ])

  if (!customer) {
    notFound()
  }

  return <Overview customer={customer} orders={orders || null} locale={locale} />
}
