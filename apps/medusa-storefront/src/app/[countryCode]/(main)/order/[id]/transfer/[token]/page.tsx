import { getLocale } from "@lib/data/locale-actions"
import { getAccountCopy } from "@modules/account/account-copy"
import { Heading, Text } from "@medusajs/ui"
import TransferActions from "@modules/order/components/transfer-actions"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params
  const locale = await getLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1], params?: Record<string, string | number>) =>
    getAccountCopy(locale, key, params)

  return (
    <div className="flex flex-col gap-y-4 items-start w-2/5 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-zinc-900">
          {t("orderTransferRequestTitle", { id })}
        </Heading>
        <Text className="text-zinc-600">
          {t("orderTransferRequestDescription", { id })}
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <Text className="text-zinc-600">
          {t("orderTransferRequestAcceptConsequences")}
        </Text>
        <Text className="text-zinc-600">
          {t("orderTransferRequestNoAction")}
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <TransferActions id={id} token={token} />
      </div>
    </div>
  )
}
