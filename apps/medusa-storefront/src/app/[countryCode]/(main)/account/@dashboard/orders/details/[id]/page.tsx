import { listOrders, retrieveOrder } from "@lib/data/orders"
import { getLocale } from "@lib/data/locale-actions"
import { getAccountCopy } from "@modules/account/account-copy"
import OrderDetailsTemplate from "@modules/order/templates/order-details-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

async function findAccountOrder(id: string) {
  const orders = await listOrders(100).catch(() => null)
  const matchingOrder = orders?.find((order) => order.id === id)

  if (matchingOrder) {
    return matchingOrder
  }

  return retrieveOrder(id).catch(() => null)
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const [order, locale] = await Promise.all([
    findAccountOrder(params.id),
    getLocale(),
  ])

  if (!order) {
    notFound()
  }

  return {
    title: getAccountCopy(locale, "metaOrderTitle", { id: order.display_id }),
    description: getAccountCopy(locale, "metaOrderDescription"),
  }
}

export default async function OrderDetailPage(props: Props) {
  const params = await props.params
  const order = await findAccountOrder(params.id)

  if (!order) {
    notFound()
  }

  return <OrderDetailsTemplate order={order} />
}
