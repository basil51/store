import { getLocale } from "@lib/data/locale-actions"
import { getLocalizedPaymentMethodTitle, isManual, isStripeLike, paymentInfoMap } from "@lib/constants"
import { getAccountCopy } from "@modules/account/account-copy"
import Divider from "@modules/common/components/divider"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = async ({ order }: PaymentDetailsProps) => {
  const locale = await getLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1], params?: Record<string, string | number>) =>
    getAccountCopy(locale, key, params)
  const payment = order.payment_collections?.[0].payments?.[0]

  return (
    <div>
      <h3
        className="font-syne text-lg font-black mb-4"
        style={{ color: "var(--text)" }}
      >
        {t("orderConfirmedPaymentTitle")}
      </h3>
      <div>
        {payment && (
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-y-1 min-w-[160px]">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>
                {t("orderConfirmedPaymentMethod")}
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--text)" }}
                data-testid="payment-method"
              >
                {getLocalizedPaymentMethodTitle(payment.provider_id, locale)}
              </p>
            </div>
            <div className="flex flex-col gap-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>
                {t("orderConfirmedPaymentDetails")}
              </p>
              <div className="flex gap-2 items-center">
                <span
                  className="flex items-center justify-center h-7 w-7 rounded-lg"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  {paymentInfoMap[payment.provider_id].icon}
                </span>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-dim)" }}
                  data-testid="payment-amount"
                >
                  {isStripeLike(payment.provider_id) && payment.data?.card_last4
                    ? `**** **** **** ${payment.data.card_last4}`
                    : isManual(payment.provider_id)
                    ? t("orderConfirmedOfflinePaymentDetail")
                    : t("orderConfirmedPaidAt", {
                        amount: convertToLocale({
                          amount: payment.amount,
                          currency_code: order.currency_code,
                        }),
                        date: new Date(payment.created_at ?? "").toLocaleString(
                          locale ?? undefined,
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }
                        ),
                      })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Divider className="mt-6" />
    </div>
  )
}

export default PaymentDetails
