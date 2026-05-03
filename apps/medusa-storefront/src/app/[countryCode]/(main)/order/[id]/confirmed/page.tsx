import { getLocale } from "@lib/data/locale-actions"
import { retrieveOrder } from "@lib/data/orders"
import { getAccountCopy } from "@modules/account/account-copy"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()

  return {
    title: getAccountCopy(locale, "metaOrderConfirmedTitle"),
    description: getAccountCopy(locale, "metaOrderConfirmedDescription"),
  }
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  return <OrderCompletedTemplate order={order} />
}
