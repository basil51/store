import { Metadata } from "next"
import { HttpTypes } from "@medusajs/types"

import OrderOverview from "@modules/account/components/order-overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import Divider from "@modules/common/components/divider"
import TransferRequestForm from "@modules/account/components/transfer-request-form"
import { getLocale } from "@lib/data/locale-actions"
import { getAccountCopy } from "@modules/account/account-copy"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: getAccountCopy(locale, "metaOrdersTitle"),
    description: getAccountCopy(locale, "metaOrdersDescription"),
  }
}

export default async function Orders() {
  const [customer, locale] = await Promise.all([
    retrieveCustomer().catch(() => null),
    getLocale(),
  ])
  const t = (key: Parameters<typeof getAccountCopy>[1]) => getAccountCopy(locale, key)

  if (!customer) {
    notFound()
  }

  const customerOrders =
    (customer as HttpTypes.StoreCustomer & { orders?: HttpTypes.StoreOrder[] }).orders ?? []

  const listedOrders = await listOrders(100).catch(() => null)

  const orders = [...(listedOrders ?? customerOrders)].sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("ordersTitle")}</h1>
        <p className="text-base-regular">
          {t("ordersDescription")}
        </p>
      </div>
      <div>
        <OrderOverview orders={orders} />
        <Divider className="my-16" />
        <TransferRequestForm />
      </div>
    </div>
  )
}
